import type { Track } from "../models/submission.js";

export const DEADLINES: Partial<Record<Track, string>> = {
  track3: "2026-09-07T23:59:59Z",
};

export function isPastDeadline(track: Track): boolean {
  const deadline = DEADLINES[track];
  if (!deadline) return false;
  return Date.now() > new Date(deadline).getTime();
}

export const REGISTRATION_CUTOFF = "2026-08-31T23:59:59Z";

export function isRegisteredBeforeCutoff(registeredAt: string): boolean {
  return new Date(registeredAt).getTime() < new Date(REGISTRATION_CUTOFF).getTime();
}
