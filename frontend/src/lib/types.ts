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
}

export interface IntentScore {
  intent: string;
  score: number;
  topScore: number;
  rank: number;
  normalizedScore: number;
}

export interface WasmScore {
  intent: string | null;
  activationStatus: string | null;
  score: number | null;
  rejectionReason: string | null;
}

export interface Submission {
  _id: string;
  track: Track;
  walletAddress: string;
  items: SubmissionItem[];
  message: string;
  signature: string;
  status: SubmissionStatus;
  twitterUsername: string;
  tweetMentionCount: number | null;
  createdAt: string;
  updatedAt: string;
}

/** Response from a submit/edit call. `saved` is false when every item failed
 * ownership verification — such submissions are not persisted, so `_id` is absent. */
export type SubmissionResponse =
  | (Submission & { saved: true })
  | {
      saved: false;
      track: Track;
      walletAddress: string;
      items: SubmissionItem[];
      status: SubmissionStatus;
    };

export interface ChallengeResponse {
  message: string;
  nonce: string;
  issuedAt: string;
}

export type Deadlines = Record<"miner" | "wasm" | "track3", string>;
