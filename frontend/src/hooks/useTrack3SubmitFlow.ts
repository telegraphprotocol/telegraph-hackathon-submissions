import { useState } from "react";
import { useSignMessage } from "wagmi";
import { apiClient, ApiError } from "../lib/apiClient";
import type { SubmissionResponse } from "../lib/types";

export interface Track3Entry {
  title: string;
  description: string;
  githubUrl: string;
  liveAppUrl: string;
}

export function useTrack3SubmitFlow(editingSubmissionId?: string) {
  const { signMessageAsync } = useSignMessage();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResponse | null>(null);

  async function submit(
    address: string,
    entry: Track3Entry,
    twitterUsername: string
  ): Promise<SubmissionResponse | null> {
    setError(null);
    setResult(null);

    if (!entry.title.trim() || !entry.description.trim() || !entry.githubUrl.trim() || !entry.liveAppUrl.trim()) {
      setError("Title, description, GitHub URL, and live app URL are all required.");
      return null;
    }
    if (!twitterUsername.trim()) {
      setError("X (Twitter) username is required.");
      return null;
    }

    setSubmitting(true);
    try {
      const action = editingSubmissionId ? "edit" : "submit";
      const challenge = await apiClient.requestChallenge({
        address,
        track: "track3",
        items: [entry.githubUrl.trim()],
        action,
        submissionId: editingSubmissionId,
      });
      const signature = await signMessageAsync({ message: challenge.message });

      const formData = new FormData();
      formData.append("address", address);
      formData.append("signature", signature);
      formData.append("nonce", challenge.nonce);
      formData.append("issuedAt", challenge.issuedAt);
      formData.append("twitterUsername", twitterUsername.trim());
      formData.append("title", entry.title.trim());
      formData.append("description", entry.description.trim());
      formData.append("githubUrl", entry.githubUrl.trim());
      formData.append("liveAppUrl", entry.liveAppUrl.trim());

      const submission = editingSubmissionId
        ? await apiClient.editSubmission("track3", editingSubmissionId, formData)
        : await apiClient.submit("track3", formData);

      setResult(submission);
      return submission;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Submission failed. Please try again.");
      return null;
    } finally {
      setSubmitting(false);
    }
  }

  return { submit, submitting, error, result };
}
