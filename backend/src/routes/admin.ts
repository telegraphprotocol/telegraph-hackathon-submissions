import { Router } from "express";
import { ObjectId } from "mongodb";
import { adminAuth } from "../middleware/adminAuth.js";
import { submissionsCollection, type Track } from "../models/submission.js";
import { computeIntentScores, getAddressBundle, getLeaderboard, getWasmScore } from "../lib/validatorClient.js";
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

adminRouter.post("/wasm-scores", async (req, res, next) => {
  try {
    const { ids } = req.body as { ids?: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
      res.json({ scores: {} });
      return;
    }

    const uniqueIds = [...new Set(ids)];
    const entries = await Promise.all(
      uniqueIds.map(async (id) => [id, await getWasmScore(id).catch(() => null)] as const)
    );

    res.json({ scores: Object.fromEntries(entries) });
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/submissions/:id/disqualify", async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: "Invalid submission id" });
      return;
    }
    const { reason } = req.body as { reason?: string };
    const result = await submissionsCollection().updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { disqualified: true, disqualifiedReason: reason?.trim() || null, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

adminRouter.post("/submissions/:id/requalify", async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: "Invalid submission id" });
      return;
    }
    const result = await submissionsCollection().updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { disqualified: false, disqualifiedReason: null, updatedAt: new Date() } }
    );
    if (result.matchedCount === 0) {
      res.status(404).json({ error: "Submission not found" });
      return;
    }
    res.status(204).end();
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
