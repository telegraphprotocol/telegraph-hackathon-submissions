import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import multer from "multer";
import { env } from "../env.js";
import type { Track } from "../models/submission.js";

const ALLOWED_EXTENSIONS: Record<Track, string[]> = {
  miner: [".yaml", ".yml"],
  wasm: [".wasm"],
};

const SUBDIR: Record<Track, string> = {
  miner: "miner-yaml",
  wasm: "wasm",
};

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function uploadFor(track: Track) {
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(env.uploadDir, SUBDIR[track]);
      mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (_req, file, cb) => {
      cb(null, `${randomUUID()}-${sanitizeFileName(file.originalname)}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: env.maxUploadMb * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXTENSIONS[track].includes(ext)) {
        cb(new Error(`Invalid file type for track "${track}": ${ext || "unknown"}`));
        return;
      }
      cb(null, true);
    },
  });
}
