import type { Request, Response } from "express";
import { Router } from "express";
import multer from "multer";
import { ObjectId } from "mongodb";
import { consumeNonce, peekNonce } from "../lib/nonceStore.js";
import { buildSubmissionMessage, verifySignature, type ChallengeAction } from "../lib/signature.js";
import { isPastDeadline } from "../lib/deadlines.js";
import { submissionsCollection, type SubmissionItem } from "../models/submission.js";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const GITHUB_URL_RE = /^https?:\/\/(www\.)?github\.com\//i;
const URL_RE = /^https?:\/\//i;

interface ParsedBody {
  address: string;
  signature: string;
  nonce: string;
  issuedAt: string;
  twitterUsername: string;
  title: string;
  description: string;
  githubUrl: string;
  liveAppUrl: string;
}

function parseAndValidateBody(req: Request, res: Response): ParsedBody | null {
  const { address, signature, nonce, issuedAt, twitterUsername, title, description, githubUrl, liveAppUrl } =
    req.body as {
      address?: string;
      signature?: string;
      nonce?: string;
      issuedAt?: string;
      twitterUsername?: string;
      title?: string;
      description?: string;
      githubUrl?: string;
      liveAppUrl?: string;
    };

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
  const cleanedTitle = (title ?? "").trim();
  if (!cleanedTitle) {
    res.status(400).json({ error: "Missing title" });
    return null;
  }
  const cleanedDescription = (description ?? "").trim();
  if (!cleanedDescription) {
    res.status(400).json({ error: "Missing description" });
    return null;
  }
  const cleanedGithubUrl = (githubUrl ?? "").trim();
  if (!cleanedGithubUrl || !GITHUB_URL_RE.test(cleanedGithubUrl)) {
    res.status(400).json({ error: "githubUrl must be a github.com URL" });
    return null;
  }
  const cleanedLiveAppUrl = (liveAppUrl ?? "").trim();
  if (!cleanedLiveAppUrl || !URL_RE.test(cleanedLiveAppUrl)) {
    res.status(400).json({ error: "liveAppUrl must be a valid URL" });
    return null;
  }

  return {
    address,
    signature,
    nonce,
    issuedAt,
    twitterUsername: cleanedUsername,
    title: cleanedTitle,
    description: cleanedDescription,
    githubUrl: cleanedGithubUrl,
    liveAppUrl: cleanedLiveAppUrl,
  };
}

async function verifyChallenge(params: {
  action: ChallengeAction;
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
    track: "track3",
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

export const submitTrack3Router = Router();

const parseFormFields = multer().none();

submitTrack3Router.post("/submissions/track3", parseFormFields, async (req: Request, res: Response) => {
  try {
    if (isPastDeadline("track3")) {
      res.status(403).json({ error: "The submission deadline for this track has passed" });
      return;
    }

    const parsed = parseAndValidateBody(req, res);
    if (!parsed) return;
    const { address, signature, nonce, issuedAt, twitterUsername, title, description, githubUrl, liveAppUrl } =
      parsed;

    const challengeError = await verifyChallenge({
      action: "submit",
      address,
      ids: [githubUrl],
      nonce,
      issuedAt,
      signature,
    });
    if (challengeError) {
      res.status(challengeError.startsWith("Signature") ? 401 : 400).json({ error: challengeError });
      return;
    }

    const message = buildSubmissionMessage({
      action: "submit",
      track: "track3",
      address,
      items: [githubUrl],
      nonce,
      issuedAt,
    });

    const items: SubmissionItem[] = [
      {
        id: githubUrl,
        verified: true,
        reason: null,
        slug: null,
        filePath: "",
        originalFileName: "",
        fileSizeBytes: 0,
        githubUrl,
      },
    ];

    const now = new Date();
    const submission = {
      track: "track3" as const,
      walletAddress: address.toLowerCase(),
      items,
      message,
      signature,
      status: "verified" as const,
      twitterUsername,
      tweetMentionCount: null,
      disqualified: false,
      disqualifiedReason: null,
      createdAt: now,
      updatedAt: now,
      title,
      description,
      liveAppUrl,
    };

    const result = await submissionsCollection().insertOne(submission);

    res.status(201).json({ ...submission, _id: result.insertedId, saved: true });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Submission failed" });
  }
});

submitTrack3Router.put("/submissions/track3/:id", parseFormFields, async (req: Request, res: Response) => {
  try {
    if (isPastDeadline("track3")) {
      res.status(403).json({ error: "The submission deadline for this track has passed" });
      return;
    }

    if (!ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: "Invalid submission id" });
      return;
    }

    const existing = await submissionsCollection().findOne({ _id: new ObjectId(req.params.id) });
    if (!existing || existing.track !== "track3") {
      res.status(404).json({ error: "Submission not found" });
      return;
    }

    const parsed = parseAndValidateBody(req, res);
    if (!parsed) return;
    const { address, signature, nonce, issuedAt, twitterUsername, title, description, githubUrl, liveAppUrl } =
      parsed;

    if (address.toLowerCase() !== existing.walletAddress) {
      res.status(403).json({ error: "Address does not own this submission" });
      return;
    }

    const challengeError = await verifyChallenge({
      action: "edit",
      address,
      ids: [githubUrl],
      nonce,
      issuedAt,
      signature,
      submissionId: req.params.id,
    });
    if (challengeError) {
      res.status(challengeError.startsWith("Signature") ? 401 : 400).json({ error: challengeError });
      return;
    }

    const message = buildSubmissionMessage({
      action: "edit",
      track: "track3",
      address,
      items: [githubUrl],
      nonce,
      issuedAt,
      submissionId: req.params.id,
    });

    const items: SubmissionItem[] = [
      {
        id: githubUrl,
        verified: true,
        reason: null,
        slug: null,
        filePath: "",
        originalFileName: "",
        fileSizeBytes: 0,
        githubUrl,
      },
    ];

    const tweetMentionCount = existing.tweetMentionCount;

    await submissionsCollection().updateOne(
      { _id: existing._id },
      {
        $set: {
          items,
          message,
          signature,
          status: "verified",
          twitterUsername,
          tweetMentionCount,
          title,
          description,
          liveAppUrl,
          updatedAt: new Date(),
        },
      }
    );

    res.json({
      ...existing,
      items,
      message,
      signature,
      status: "verified",
      twitterUsername,
      tweetMentionCount,
      title,
      description,
      liveAppUrl,
      updatedAt: new Date(),
      saved: true,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Edit failed" });
  }
});

submitTrack3Router.delete("/submissions/track3/:id", async (req: Request, res: Response) => {
  try {
    if (isPastDeadline("track3")) {
      res.status(403).json({ error: "The submission deadline for this track has passed" });
      return;
    }

    if (!ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: "Invalid submission id" });
      return;
    }

    const existing = await submissionsCollection().findOne({ _id: new ObjectId(req.params.id) });
    if (!existing || existing.track !== "track3") {
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

    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Delete failed" });
  }
});
