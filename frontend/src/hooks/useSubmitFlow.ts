import { useState } from "react";
import { useSignMessage } from "wagmi";
import { apiClient, ApiError } from "../lib/apiClient";
import type { SubmissionResponse, Track } from "../lib/types";

export interface SubmissionEntry {
  id: string;
  file: File | null;
  url: string;
}

export function useSubmitFlow(track: Track, editingSubmissionId?: string) {
  const { signMessageAsync } = useSignMessage();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmissionResponse | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  async function submit(
    address: string,
    entries: SubmissionEntry[],
    twitterUsername: string
  ): Promise<SubmissionResponse | null> {
    setError(null);
    setResult(null);

    const ids = entries.map((e) => e.id.trim());
    if (ids.some((id) => !id)) {
      setError("Every row needs an ID.");
      return null;
    }
    if (track === "wasm") {
      if (entries.some((e) => !e.url.trim())) {
        setError("Every row needs a GitHub URL.");
        return null;
      }
    } else if (entries.some((e) => !e.file)) {
      setError("Every row needs a file.");
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
        track,
        items: ids,
        action,
        submissionId: editingSubmissionId,
      });
      const signature = await signMessageAsync({ message: challenge.message });

      const formData = new FormData();
      formData.append("address", address);
      formData.append("signature", signature);
      formData.append("nonce", challenge.nonce);
      formData.append("issuedAt", challenge.issuedAt);
      formData.append("itemIds", JSON.stringify(ids));
      formData.append("twitterUsername", twitterUsername.trim());
      if (track === "wasm") {
        formData.append("githubUrls", JSON.stringify(entries.map((e) => e.url.trim())));
      } else {
        for (const entry of entries) {
          formData.append("files", entry.file as File);
        }
      }

      setUploadProgress(0);
      // Give the browser a frame to paint 0% before the (possibly near-instant) upload starts.
      await new Promise((resolve) => requestAnimationFrame(resolve));

      const submission = editingSubmissionId
        ? await apiClient.editSubmission(track, editingSubmissionId, formData, setUploadProgress)
        : await apiClient.submit(track, formData, setUploadProgress);

      setUploadProgress(100);
      setResult(submission);
      // Hold the completed bar visible briefly so fast (KB-sized) uploads are still noticeable.
      await new Promise((resolve) => setTimeout(resolve, 500));
      return submission;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Submission failed. Please try again.");
      return null;
    } finally {
      setSubmitting(false);
      setUploadProgress(null);
    }
  }

  return { submit, submitting, error, result, uploadProgress };
}
