import { env } from "../env.js";
import { recordMatchesId, type AddressBundleResponse } from "../types/validator.js";

export class ValidatorApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ValidatorApiError";
  }
}

export interface OwnershipResult {
  verified: boolean;
  reason: string | null;
  slug: string | null;
}

export async function getAddressBundle(address: string): Promise<AddressBundleResponse> {
  const url = `${env.validatorBaseUrl}/engine/validator/v1/addresses/${address}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new ValidatorApiError(`Validator address lookup failed (${res.status})`, res.status);
  }
  const data = (await res.json()) as Partial<AddressBundleResponse>;
  return { miners: data.miners ?? [], wasm: data.wasm ?? [] };
}

export async function getMinerStatus(id: string): Promise<unknown> {
  const url = `${env.validatorBaseUrl}/api/miners/${encodeURIComponent(id)}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new ValidatorApiError(`Validator miner status lookup failed (${res.status})`, res.status);
  }
  return res.json();
}

export interface WasmScore {
  intent: string | null;
  activationStatus: string | null;
  score: number | null;
  rejectionReason: string | null;
}

export async function getWasmScore(registrationId: string): Promise<WasmScore | null> {
  const url = `${env.validatorBaseUrl}/api/wasm/${encodeURIComponent(registrationId)}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new ValidatorApiError(`Validator WASM lookup failed (${res.status})`, res.status);
  }
  const data = (await res.json()) as {
    intent_id?: string;
    activation_status?: string;
    eval_score?: number | null;
    rejection_reason?: string | null;
  };
  const activationStatus = data.activation_status ?? null;
  return {
    intent: data.intent_id ?? null,
    activationStatus,
    score: activationStatus === "rejected" ? null : (data.eval_score ?? null),
    rejectionReason: data.rejection_reason ?? null,
  };
}

interface LeaderboardEntry {
  miner_slug: string;
  score: number;
  rank: number;
  activation_status: string;
}

export interface LeaderboardResponse {
  epoch: number;
  intents: Record<string, LeaderboardEntry[]>;
}

export async function getLeaderboard(): Promise<LeaderboardResponse> {
  const url = `${env.validatorBaseUrl}/leaderboard/miners?limit=1000`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new ValidatorApiError(`Validator leaderboard lookup failed (${res.status})`, res.status);
  }
  return res.json();
}

export interface IntentScore {
  intent: string;
  score: number;
  topScore: number;
  rank: number;
  normalizedScore: number;
}

export function computeIntentScores(leaderboard: LeaderboardResponse, slug: string): IntentScore[] {
  const results: IntentScore[] = [];
  for (const [intent, entries] of Object.entries(leaderboard.intents)) {
    const mine = entries.find((e) => e.miner_slug === slug);
    if (!mine) continue;
    const top = entries.reduce((best, e) => (e.score > best.score ? e : best), entries[0]);
    const normalizedScore = top.score > 0 ? mine.score / top.score : mine.score > 0 ? 1 : 0;
    results.push({ intent, score: mine.score, topScore: top.score, rank: mine.rank, normalizedScore });
  }
  return results;
}

export async function resolveMinerSlug(address: string, id: string): Promise<string | null> {
  try {
    const bundle = await getAddressBundle(address);
    const matched = bundle.miners.find((record) => recordMatchesId(record, id));
    return matched ? String((matched as { Slug?: string }).Slug ?? "") || null : null;
  } catch {
    return null;
  }
}

export async function verifyOwnership(
  address: string,
  track: "miner" | "wasm",
  ids: string[]
): Promise<Map<string, OwnershipResult>> {
  const result = new Map<string, OwnershipResult>();

  let bundle: AddressBundleResponse;
  try {
    bundle = await getAddressBundle(address);
  } catch (err) {
    const message =
      err instanceof ValidatorApiError
        ? `Could not verify ownership — validator lookup failed (${err.message})`
        : "Could not verify ownership — validator service unreachable";
    for (const id of ids) {
      result.set(id, { verified: false, reason: message, slug: null });
    }
    return result;
  }

  const records = track === "miner" ? bundle.miners : bundle.wasm;
  const noun = track === "miner" ? "miner" : "WASM registration";

  for (const id of ids) {
    const matchedRecord = records.find((record) => recordMatchesId(record, id));
    const slug = matchedRecord ? String((matchedRecord as { Slug?: string }).Slug ?? "") || null : null;

    if (!matchedRecord) {
      result.set(id, {
        verified: false,
        reason:
          records.length === 0
            ? `This wallet has no registered ${noun}s`
            : `No ${noun} with id "${id}" is registered to this wallet`,
        slug: null,
      });
      continue;
    }

    if (track === "wasm") {
      const activationStatus = (matchedRecord as { ActivationStatus?: string }).ActivationStatus;
      if (activationStatus === "rejected") {
        const rejectionReason = (matchedRecord as { RejectionReason?: string | null }).RejectionReason;
        result.set(id, {
          verified: false,
          reason: rejectionReason ? `WASM registration was rejected: ${rejectionReason}` : "WASM registration was rejected",
          slug,
        });
        continue;
      }
    }

    result.set(id, { verified: true, reason: null, slug });
  }
  return result;
}
