import type { Track } from "../models/submission.js";

export const DEADLINES: Record<Track | "track3", string> = {
  miner: "2026-08-31T23:59:59Z",
  wasm: "2026-08-31T23:59:59Z",
  track3: "2026-09-07T23:59:59Z",
};

export function isPastDeadline(track: Track): boolean {
  return Date.now() > new Date(DEADLINES[track]).getTime();
}
