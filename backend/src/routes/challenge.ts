import { Router } from "express";
import { ObjectId } from "mongodb";
import { issueNonce } from "../lib/nonceStore.js";
import { buildSubmissionMessage, type ChallengeAction } from "../lib/signature.js";
import { isPastDeadline } from "../lib/deadlines.js";
import { submissionsCollection, type Track } from "../models/submission.js";

export const challengeRouter = Router();

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

challengeRouter.post("/challenge", async (req, res, next) => {
  try {
    const { address, track, items, action, submissionId } = req.body as {
      address?: string;
      track?: Track;
      items?: string[];
      action?: ChallengeAction;
      submissionId?: string;
    };

    if (!address || !ADDRESS_RE.test(address)) {
      res.status(400).json({ error: "Invalid or missing address" });
      return;
    }
    if (track !== "miner" && track !== "wasm" && track !== "track3") {
      res.status(400).json({ error: "Invalid or missing track" });
      return;
    }
    const resolvedAction: ChallengeAction =
      action === "edit" ? "edit" : action === "delete" ? "delete" : "submit";

    if ((resolvedAction === "edit" || resolvedAction === "delete") && !submissionId) {
      res.status(400).json({ error: `submissionId is required for ${resolvedAction} challenges` });
      return;
    }
    if (isPastDeadline(track)) {
      res.status(403).json({ error: "The submission deadline for this track has passed" });
      return;
    }

    let resolvedItems: string[];
    if (resolvedAction === "delete") {
      if (!ObjectId.isValid(submissionId as string)) {
        res.status(400).json({ error: "Invalid submission id" });
        return;
      }
      const existing = await submissionsCollection().findOne({ _id: new ObjectId(submissionId) });
      if (!existing || existing.track !== track) {
        res.status(404).json({ error: "Submission not found" });
        return;
      }
      resolvedItems = existing.items.map((i) => i.id);
    } else {
      if (!Array.isArray(items) || items.length === 0 || items.some((i) => typeof i !== "string" || !i.trim())) {
        res.status(400).json({ error: "items must be a non-empty array of strings" });
        return;
      }
      resolvedItems = items;
    }

    const { nonce, issuedAt } = issueNonce(address);
    const message = buildSubmissionMessage({
      action: resolvedAction,
      track,
      address,
      items: resolvedItems,
      nonce,
      issuedAt,
      submissionId,
    });

    res.json({ message, nonce, issuedAt });
  } catch (err) {
    next(err);
  }
});
