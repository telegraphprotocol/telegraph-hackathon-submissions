import { recoverMessageAddress } from "viem";
import type { Track } from "../models/submission.js";

export type ChallengeAction = "submit" | "edit" | "delete";

export function buildSubmissionMessage(params: {
  action: ChallengeAction;
  track: Track;
  address: string;
  items: string[];
  nonce: string;
  issuedAt: string;
  submissionId?: string;
}): string {
  const { action, track, address, items, nonce, issuedAt, submissionId } = params;
  const actionLabel =
    action === "edit"
      ? "Edit a Telegraph Hackathon submission."
      : action === "delete"
        ? "Delete a Telegraph Hackathon submission."
        : "Submit to Telegraph Hackathon.";
  const lines = [actionLabel, "", `Track: ${track}`, `Address: ${address}`];
  if (submissionId) lines.push(`Submission Id: ${submissionId}`);
  lines.push(`Items: ${items.join(",")}`, `Nonce: ${nonce}`, `Issued At: ${issuedAt}`);
  return lines.join("\n");
}

export async function verifySignature(
  message: string,
  signature: string,
  claimedAddress: string
): Promise<boolean> {
  const recovered = await recoverMessageAddress({
    message,
    signature: signature as `0x${string}`,
  });
  return recovered.toLowerCase() === claimedAddress.toLowerCase();
}
