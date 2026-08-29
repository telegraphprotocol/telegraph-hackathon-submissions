import type { ObjectId } from "mongodb";
import { getDb } from "../db/mongo.js";

export type Track = "miner" | "wasm";
export type SubmissionStatus = "verified" | "partial" | "rejected";

export interface SubmissionItem {
  id: string;
  verified: boolean;
  reason: string | null;
  slug: string | null;
  filePath: string;
  originalFileName: string;
  fileSizeBytes: number;
  githubUrl: string | null;
}

export interface Submission {
  _id?: ObjectId;
  track: Track;
  walletAddress: string;
  items: SubmissionItem[];
  message: string;
  signature: string;
  status: SubmissionStatus;
  twitterUsername: string;
  tweetMentionCount: number | null;
  disqualified: boolean;
  disqualifiedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export function submissionsCollection() {
  return getDb().collection<Submission>("submissions");
}

export async function ensureSubmissionIndexes(): Promise<void> {
  const collection = submissionsCollection();
  await collection.createIndex({ track: 1, createdAt: -1 });
  await collection.createIndex({ walletAddress: 1 });
}

export function deriveStatus(items: SubmissionItem[]): SubmissionStatus {
  const verifiedCount = items.filter((item) => item.verified).length;
  if (verifiedCount === items.length) return "verified";
  if (verifiedCount === 0) return "rejected";
  return "partial";
}
