import { useState } from "react";
import { useAccount } from "wagmi";
import { SubmissionResult } from "./SubmissionResult";
import { CountdownTimer } from "./CountdownTimer";
import { useTrack3SubmitFlow } from "../hooks/useTrack3SubmitFlow";

interface Props {
  deadlineIso: string | null;
  editingSubmissionId?: string;
  initialTitle?: string;
  initialDescription?: string;
  initialGithubUrl?: string;
  initialLiveAppUrl?: string;
  initialTwitterUsername?: string;
  onDone?: () => void;
}

export function Track3SubmissionForm({
  deadlineIso,
  editingSubmissionId,
  initialTitle,
  initialDescription,
  initialGithubUrl,
  initialLiveAppUrl,
  initialTwitterUsername,
  onDone,
}: Props) {
  const { address, isConnected } = useAccount();
  const { submit, submitting, error, result } = useTrack3SubmitFlow(editingSubmissionId);

  const [title, setTitle] = useState(initialTitle ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [githubUrl, setGithubUrl] = useState(initialGithubUrl ?? "");
  const [liveAppUrl, setLiveAppUrl] = useState(initialLiveAppUrl ?? "");
  const [twitterUsername, setTwitterUsername] = useState(initialTwitterUsername ?? "");
  const [validationMessage, setValidationMessage] = useState<string | null>(null);

  const isPast = deadlineIso ? Date.now() > new Date(deadlineIso).getTime() : false;
  const isEditing = Boolean(editingSubmissionId);

  function validate(): boolean {
    const missing: string[] = [];
    if (!title.trim()) missing.push("Title is required");
    if (!description.trim()) missing.push("Description is required");
    if (!githubUrl.trim()) missing.push("GitHub repo URL is required");
    if (!liveAppUrl.trim()) missing.push("Live app URL is required");
    if (!twitterUsername.trim()) missing.push("X (Twitter) username is required");
    setValidationMessage(missing.length > 0 ? missing.join(" · ") : null);
    return missing.length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    if (!validate()) return;
    const submitted = await submit(address, { title, description, githubUrl, liveAppUrl }, twitterUsername);
    if (!submitted || !submitted.saved) return;
    if (isEditing) {
      onDone?.();
    } else {
      setTitle("");
      setDescription("");
      setGithubUrl("");
      setLiveAppUrl("");
      setTwitterUsername("");
      setValidationMessage(null);
    }
  }

  return (
    <div className="tg-corner-tl tg-corner-tr relative flex flex-col gap-4 border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="flex flex-col gap-2">
        <div>
          <h2 className="text-lg font-semibold">
            {isEditing ? "Edit — Track 3 — GitHub App Submission" : "Track 3 — GitHub App Submission"}
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Submit your project's GitHub repository, along with a title, description, and live app URL.
          </p>
        </div>
        {deadlineIso && <CountdownTimer deadlineIso={deadlineIso} />}
      </div>

      {isPast ? (
        <p className="text-sm text-[var(--danger)]">
          The submission deadline for this track has passed. No new submissions or edits are accepted.
        </p>
      ) : !isConnected ? (
        <p className="text-sm text-[var(--muted-foreground)]">
          Connect your wallet above to {isEditing ? "edit your submission" : "submit"}.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
              X (Twitter) username
            </span>
            <input
              type="text"
              value={twitterUsername}
              onChange={(e) => setTwitterUsername(e.target.value)}
              placeholder="@yourhandle"
              className="border border-[var(--input)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--ring)]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-widest text-[var(--muted-foreground)]">Title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Project title"
              className="border border-[var(--input)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--ring)]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-widest text-[var(--muted-foreground)]">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does your app do?"
              rows={4}
              className="border border-[var(--input)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--ring)]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
              GitHub repo URL
            </span>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/org/repo"
              className="border border-[var(--input)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--ring)]"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-widest text-[var(--muted-foreground)]">Live app URL</span>
            <input
              type="url"
              value={liveAppUrl}
              onChange={(e) => setLiveAppUrl(e.target.value)}
              placeholder="https://your-app.example.com"
              className="border border-[var(--input)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--ring)]"
            />
          </label>

          {validationMessage && <p className="text-sm text-[var(--danger)]">{validationMessage}</p>}
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="self-start border border-[var(--foreground)] px-4 py-2 text-xs font-medium uppercase tracking-widest transition-colors hover:bg-[var(--foreground)] hover:text-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting…" : isEditing ? "Sign & Save Changes" : "Sign & Submit"}
          </button>
        </form>
      )}

      {result && <SubmissionResult submission={result} />}
    </div>
  );
}
