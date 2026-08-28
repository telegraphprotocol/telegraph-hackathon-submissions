import { Router } from "express";
import { submissionsCollection, type Track } from "../models/submission.js";

export const mySubmissionsRouter = Router();

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

mySubmissionsRouter.get("/submissions/mine/:address", async (req, res, next) => {
  try {
    const { address } = req.params;
    if (!ADDRESS_RE.test(address)) {
      res.status(400).json({ error: "Invalid address" });
      return;
    }
    const track = req.query.track as Track | undefined;
    const filter: Record<string, unknown> = { walletAddress: address.toLowerCase() };
    if (track === "miner" || track === "wasm") filter.track = track;

    const submissions = await submissionsCollection()
      .find(filter)
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ submissions });
  } catch (err) {
    next(err);
  }
});
