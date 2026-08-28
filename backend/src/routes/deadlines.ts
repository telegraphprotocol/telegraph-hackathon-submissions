import { Router } from "express";
import { DEADLINES } from "../lib/deadlines.js";

export const deadlinesRouter = Router();

deadlinesRouter.get("/deadlines", (_req, res) => {
  res.json(DEADLINES);
});
