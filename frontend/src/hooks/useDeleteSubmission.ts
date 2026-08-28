import { useState } from "react";
import { useSignMessage } from "wagmi";
import { apiClient, ApiError } from "../lib/apiClient";
import type { Track } from "../lib/types";

export function useDeleteSubmission() {
  const { signMessageAsync } = useSignMessage();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteSubmission(address: string, track: Track, submissionId: string): Promise<boolean> {
    setError(null);
    setDeleting(true);
    try {
      const challenge = await apiClient.requestChallenge({
        address,
        track,
        action: "delete",
        submissionId,
      });
      const signature = await signMessageAsync({ message: challenge.message });

      await apiClient.deleteSubmission(track, submissionId, {
        address,
        signature,
        nonce: challenge.nonce,
        issuedAt: challenge.issuedAt,
      });
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete submission.");
      return false;
    } finally {
      setDeleting(false);
    }
  }

  return { deleteSubmission, deleting, error };
}
