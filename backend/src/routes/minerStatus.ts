import { Router } from "express";
import { getMinerStatus } from "../lib/validatorClient.js";

export const minerStatusRouter = Router();

minerStatusRouter.get("/miners/:id", async (req, res, next) => {
  try {
    const status = await getMinerStatus(req.params.id);
    if (status === null) {
      res.status(404).json({ error: "Not found" });
      return;
    }
    res.json(status);
  } catch (err) {
    next(err);
  }
});
