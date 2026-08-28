import { unlink } from "node:fs/promises";
import type { Request, Response } from "express";
import { Router } from "express";
import { ObjectId } from "mongodb";
import { consumeNonce, peekNonce } from "../lib/nonceStore.js";
import { buildSubmissionMessage, verifySignature, type ChallengeAction } from "../lib/signature.js";
import { verifyOwnership } from "../lib/validatorClient.js";
import { fetchTweetMentionCount } from "../lib/mentionChecker.js";
import { isPastDeadline } from "../lib/deadlines.js";
import {
  deriveStatus,
  submissionsCollection,
  type SubmissionItem,
  type Track,
} from "../models/submission.js";
import { uploadFor } from "../middleware/upload.js";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

interface ParsedBody {
  address: string;
  signature: string;
  nonce: string;
  issuedAt: string;
  ids: string[];
  twitterUsername: string;
}

function parseAndValidateBody(req: Request, res: Response): ParsedBody | null {
  const { address, signature, nonce, issuedAt, itemIds, twitterUsername } = req.body as {
    address?: string;
    signature?: string;
    nonce?: string;
    issuedAt?: string;
    itemIds?: string;
    twitterUsername?: string;
  };
  const files = (req.files as Express.Multer.File[]) ?? [];

  if (!address || !ADDRESS_RE.test(address)) {
    res.status(400).json({ error: "Invalid or missing address" });
    return null;
  }
  if (!signature || !nonce || !issuedAt) {
    res.status(400).json({ error: "Missing signature, nonce, or issuedAt" });
    return null;
  }
  const cleanedUsername = (twitterUsername ?? "").trim().replace(/^@/, "");
  if (!cleanedUsername) {
    res.status(400).json({ error: "Missing X (Twitter) username" });
    return null;
  }

  let ids: string[];
  try {
    ids = JSON.parse(itemIds ?? "[]");
  } catch {
    res.status(400).json({ error: "itemIds must be a JSON array" });
    return null;
  }
  if (!Array.isArray(ids) || ids.length === 0 || ids.some((i) => typeof i !== "string")) {
    res.status(400).json({ error: "itemIds must be a non-empty array of strings" });
    return null;
  }
  if (files.length !== ids.length) {
    res.status(400).json({ error: "Number of files must match number of itemIds" });
    return null;
  }

  return { address, signature, nonce, issuedAt, ids, twitterUsername: cleanedUsername };
}

async function verifyChallenge(params: {
  action: ChallengeAction;
  track: Track;
  address: string;
  ids: string[];
  nonce: string;
  issuedAt: string;
  signature: string;
  submissionId?: string;
}): Promise<string | null> {
  const pending = peekNonce(params.address);
  if (!pending || pending.nonce !== params.nonce) {
    return "Nonce missing or expired — request a new challenge";
  }
  const message = buildSubmissionMessage({
    action: params.action,
    track: params.track,
    address: params.address,
    items: params.ids,
    nonce: params.nonce,
    issuedAt: params.issuedAt,
    submissionId: params.submissionId,
  });
  const isValidSignature = await verifySignature(message, params.signature, params.address);
  if (!isValidSignature) {
    return "Signature verification failed";
  }
  consumeNonce(params.address);
  return null;
}

async function deleteFiles(paths: string[]): Promise<void> {
  await Promise.all(paths.map((p) => unlink(p).catch(() => undefined)));
}

async function findAlreadyClaimedIds(
  track: Track,
  ids: string[],
  excludeSubmissionId?: ObjectId
): Promise<string[]> {
  const filter: Record<string, unknown> = {
    track,
    items: { $elemMatch: { id: { $in: ids }, verified: true } },
  };
  if (excludeSubmissionId) {
    filter._id = { $ne: excludeSubmissionId };
  }
  const docs = await submissionsCollection().find(filter).toArray();
  const claimed = new Set<string>();
  for (const doc of docs) {
    for (const item of doc.items) {
      if (item.verified && ids.includes(item.id)) claimed.add(item.id);
    }
  }
  return [...claimed];
}

export function createSubmitRouter(track: Track): Router {
  const router = Router();
  const upload = uploadFor(track);

  router.post("/submissions/" + track, upload.array("files"), async (req: Request, res: Response) => {
    const files = (req.files as Express.Multer.File[]) ?? [];
    try {
      if (isPastDeadline(track)) {
        await deleteFiles(files.map((f) => f.path));
        res.status(403).json({ error: "The submission deadline for this track has passed" });
        return;
      }

      const parsed = parseAndValidateBody(req, res);
      if (!parsed) {
        await deleteFiles(files.map((f) => f.path));
        return;
      }
      const { address, signature, nonce, issuedAt, ids, twitterUsername } = parsed;

      const challengeError = await verifyChallenge({
        action: "submit",
        track,
        address,
        ids,
        nonce,
        issuedAt,
        signature,
      });
      if (challengeError) {
        await deleteFiles(files.map((f) => f.path));
        res.status(challengeError.startsWith("Signature") ? 401 : 400).json({ error: challengeError });
        return;
      }

      const claimedIds = await findAlreadyClaimedIds(track, ids);
      if (claimedIds.length > 0) {
        await deleteFiles(files.map((f) => f.path));
        res.status(409).json({
          error: `Already submitted and verified: ${claimedIds.join(", ")}. Edit the existing submission instead of submitting again.`,
        });
        return;
      }

      const verifiedMap = await verifyOwnership(address, track, ids);

      const message = buildSubmissionMessage({ action: "submit", track, address, items: ids, nonce, issuedAt });
      const items: SubmissionItem[] = ids.map((id, index) => {
        const file = files[index];
        const ownership = verifiedMap.get(id);
        return {
          id,
          verified: ownership?.verified ?? false,
          reason: ownership?.reason ?? "Ownership could not be determined",
          slug: ownership?.slug ?? null,
          filePath: file.path,
          originalFileName: file.originalname,
          fileSizeBytes: file.size,
        };
      });

      const status = deriveStatus(items);
      if (status === "rejected") {
        await deleteFiles(files.map((f) => f.path));
        res.status(200).json({
          saved: false,
          track,
          walletAddress: address.toLowerCase(),
          items: items.map((item) => ({ ...item, filePath: "", fileSizeBytes: 0 })),
          status,
        });
        return;
      }

      const tweetMentionCount = await fetchTweetMentionCount(twitterUsername);

      const now = new Date();
      const submission = {
        track,
        walletAddress: address.toLowerCase(),
        items,
        message,
        signature,
        status,
        twitterUsername,
        tweetMentionCount,
        disqualified: false,
        disqualifiedReason: null,
        createdAt: now,
        updatedAt: now,
      };

      const result = await submissionsCollection().insertOne(submission);

      res.status(201).json({ ...submission, _id: result.insertedId, saved: true });
    } catch (err) {
      await deleteFiles(files.map((f) => f.path));
      res.status(500).json({ error: err instanceof Error ? err.message : "Submission failed" });
    }
  });

  router.put(
    "/submissions/" + track + "/:id",
    upload.array("files"),
    async (req: Request, res: Response) => {
      const files = (req.files as Express.Multer.File[]) ?? [];
      try {
        if (isPastDeadline(track)) {
          await deleteFiles(files.map((f) => f.path));
          res.status(403).json({ error: "The submission deadline for this track has passed" });
          return;
        }

        if (!ObjectId.isValid(req.params.id)) {
          await deleteFiles(files.map((f) => f.path));
          res.status(400).json({ error: "Invalid submission id" });
          return;
        }

        const existing = await submissionsCollection().findOne({ _id: new ObjectId(req.params.id) });
        if (!existing || existing.track !== track) {
          await deleteFiles(files.map((f) => f.path));
          res.status(404).json({ error: "Submission not found" });
          return;
        }

        const parsed = parseAndValidateBody(req, res);
        if (!parsed) {
          await deleteFiles(files.map((f) => f.path));
          return;
        }
        const { address, signature, nonce, issuedAt, ids, twitterUsername } = parsed;

        if (address.toLowerCase() !== existing.walletAddress) {
          await deleteFiles(files.map((f) => f.path));
          res.status(403).json({ error: "Address does not own this submission" });
          return;
        }

        const challengeError = await verifyChallenge({
          action: "edit",
          track,
          address,
          ids,
          nonce,
          issuedAt,
          signature,
          submissionId: req.params.id,
        });
        if (challengeError) {
          await deleteFiles(files.map((f) => f.path));
          res.status(challengeError.startsWith("Signature") ? 401 : 400).json({ error: challengeError });
          return;
        }

        const claimedIds = await findAlreadyClaimedIds(track, ids, existing._id);
        if (claimedIds.length > 0) {
          await deleteFiles(files.map((f) => f.path));
          res.status(409).json({
            error: `Already submitted and verified elsewhere: ${claimedIds.join(", ")}.`,
          });
          return;
        }

        const verifiedMap = await verifyOwnership(address, track, ids);

        const message = buildSubmissionMessage({
          action: "edit",
          track,
          address,
          items: ids,
          nonce,
          issuedAt,
          submissionId: req.params.id,
        });
        const items: SubmissionItem[] = ids.map((id, index) => {
          const file = files[index];
          const ownership = verifiedMap.get(id);
          return {
            id,
            verified: ownership?.verified ?? false,
            reason: ownership?.reason ?? "Ownership could not be determined",
            slug: ownership?.slug ?? null,
            filePath: file.path,
            originalFileName: file.originalname,
            fileSizeBytes: file.size,
          };
        });

        const oldFilePaths = existing.items.map((item) => item.filePath);
        const status = deriveStatus(items);

        if (status === "rejected") {
          await submissionsCollection().deleteOne({ _id: existing._id });
          await deleteFiles(oldFilePaths);
          await deleteFiles(files.map((f) => f.path));
          res.json({
            saved: false,
            track,
            walletAddress: existing.walletAddress,
            items: items.map((item) => ({ ...item, filePath: "", fileSizeBytes: 0 })),
            status,
          });
          return;
        }

        const tweetMentionCount = await fetchTweetMentionCount(twitterUsername);

        await submissionsCollection().updateOne(
          { _id: existing._id },
          {
            $set: {
              items,
              message,
              signature,
              status,
              twitterUsername,
              tweetMentionCount,
              updatedAt: new Date(),
            },
          }
        );

        await deleteFiles(oldFilePaths);

        res.json({
          ...existing,
          items,
          message,
          signature,
          status,
          twitterUsername,
          tweetMentionCount,
          updatedAt: new Date(),
          saved: true,
        });
      } catch (err) {
        await deleteFiles(files.map((f) => f.path));
        res.status(500).json({ error: err instanceof Error ? err.message : "Edit failed" });
      }
    }
  );

  router.delete("/submissions/" + track + "/:id", async (req: Request, res: Response) => {
    try {
      if (isPastDeadline(track)) {
        res.status(403).json({ error: "The submission deadline for this track has passed" });
        return;
      }

      if (!ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: "Invalid submission id" });
        return;
      }

      const existing = await submissionsCollection().findOne({ _id: new ObjectId(req.params.id) });
      if (!existing || existing.track !== track) {
        res.status(404).json({ error: "Submission not found" });
        return;
      }

      const { address, signature, nonce, issuedAt } = req.body as {
        address?: string;
        signature?: string;
        nonce?: string;
        issuedAt?: string;
      };

      if (!address || !ADDRESS_RE.test(address)) {
        res.status(400).json({ error: "Invalid or missing address" });
        return;
      }
      if (!signature || !nonce || !issuedAt) {
        res.status(400).json({ error: "Missing signature, nonce, or issuedAt" });
        return;
      }
      if (address.toLowerCase() !== existing.walletAddress) {
        res.status(403).json({ error: "Address does not own this submission" });
        return;
      }

      const ids = existing.items.map((item) => item.id);
      const challengeError = await verifyChallenge({
        action: "delete",
        track,
        address,
        ids,
        nonce,
        issuedAt,
        signature,
        submissionId: req.params.id,
      });
      if (challengeError) {
        res.status(challengeError.startsWith("Signature") ? 401 : 400).json({ error: challengeError });
        return;
      }

      await submissionsCollection().deleteOne({ _id: existing._id });
      await deleteFiles(existing.items.map((item) => item.filePath));

      res.status(204).end();
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : "Delete failed" });
    }
  });

  return router;
}
