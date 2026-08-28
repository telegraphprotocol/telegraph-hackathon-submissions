import { timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { env } from "../env.js";

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const provided = req.header("x-admin-password") ?? "";
  const expected = env.adminPassword;

  const providedBuf = Buffer.from(provided);
  const expectedBuf = Buffer.from(expected);

  const match =
    providedBuf.length === expectedBuf.length && timingSafeEqual(providedBuf, expectedBuf);

  if (!match) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}
