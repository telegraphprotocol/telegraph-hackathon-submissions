import { Router } from "express";
import { ObjectId } from "mongodb";
import { adminAuth } from "../middleware/adminAuth.js";
import { submissionsCollection, type Track } from "../models/submission.js";
import { computeIntentScores, getAddressBundle, getLeaderboard } from "../lib/validatorClient.js";
import { recordMatchesId } from "../types/validator.js";

export const adminRouter = Router();

adminRouter.use(adminAuth);

adminRouter.post("/miner-scores", async (req, res, next) => {
  try {
    const { items } = req.body as { items?: { address: string; id: string }[] };
    if (!Array.isArray(items) || items.length === 0) {
      res.json({ scores: {} });
      return;
    }

    const leaderboard = await getLeaderboard();
    const bundleCache = new Map<string, Awaited<ReturnType<typeof getAddressBundle>> | null>();
    const scores: Record<string, ReturnType<typeof computeIntentScores>> = {};

    for (const { address, id } of items) {
      const addressKey = address.toLowerCase();
      if (!bundleCache.has(addressKey)) {
        bundleCache.set(
          addressKey,
          await getAddressBundle(address).catch(() => null)
        );
      }
      const bundle = bundleCache.get(addressKey);
      const matched = bundle?.miners.find((record) => recordMatchesId(record, id));
      const slug = matched ? String((matched as { Slug?: string }).Slug ?? "") || null : null;
      scores[`${addressKey}:${id}`] = slug ? computeIntentScores(leaderboard, slug) : [];
    }

    res.json({ scores });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/submissions", async (req, res, next) => {
  try {
    const track = req.query.track as Track | undefined;
    const filter: Record<string, unknown> = { status: { $ne: "rejected" } };
    if (track) filter.track = track;
    const submissions = await submissionsCollection()
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ submissions });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/submissions/:id/files/:itemIndex", async (req, res, next) => {
  try {
    const { id, itemIndex } = req.params;
    if (!ObjectId.isValid(id)) {
      res.status(400).json({ error: "Invalid submission id" });
      return;
    }
    const submission = await submissionsCollection().findOne({ _id: new ObjectId(id) });
    if (!submission) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }
    const item = submission.items[Number(itemIndex)];
    if (!item) {
      res.status(404).json({ error: "Item not found" });
      return;
    }
    res.download(item.filePath, item.originalFileName);
  } catch (err) {
    next(err);
  }
});
