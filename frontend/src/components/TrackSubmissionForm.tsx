import { useState } from "react";
import { useAccount } from "wagmi";
import { SubmissionItemRow } from "./SubmissionItemRow";
import { SubmissionResult } from "./SubmissionResult";
import { CountdownTimer } from "./CountdownTimer";
import { UploadProgressBar } from "./UploadProgressBar";
import { useSubmitFlow, type SubmissionEntry } from "../hooks/useSubmitFlow";
import type { Track } from "../lib/types";

interface Props {
  track: Track;
  idLabel: string;
  fileAccept: string;
  title: string;
  description: string;
  deadlineIso: string | null;
  editingSubmissionId?: string;
  initialItemIds?: string[];
  initialTwitterUsername?: string;
  onDone?: () => void;
}

export function TrackSubmissionForm({
  track,
  idLabel,
  fileAccept,
  title,
  description,
  deadlineIso,
  editingSubmissionId,
  initialItemIds,
  initialTwitterUsername,
  onDone,
}: Props) {
  const { address, isConnected } = useAccount();
  const [entries, setEntries] = useState<SubmissionEntry[]>(
    initialItemIds && initialItemIds.length > 0
      ? initialItemIds.map((id) => ({ id, file: null }))
      : [{ id: "", file: null }]
  );
  const { submit, submitting, error, result, uploadProgress } = useSubmitFlow(track, editingSubmissionId);
  const [rowErrors, setRowErrors] = useState<Record<number, { id?: boolean; file?: boolean }>>({});
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [twitterUsername, setTwitterUsername] = useState(initialTwitterUsername ?? "");
  const [twitterError, setTwitterError] = useState(false);

  const isPast = deadlineIso ? Date.now() > new Date(deadlineIso).getTime() : false;
  const isEditing = Boolean(editingSubmissionId);

  function updateEntry(index: number, patch: Partial<SubmissionEntry>) {
    setEntries((prev) => prev.map((e, i) => (i === index ? { ...e, ...patch } : e)));
    setRowErrors((prev) => {
      if (!prev[index]) return prev;
      const next = { ...prev };
      if (patch.id !== undefined) next[index] = { ...next[index], id: false };
      if (patch.file !== undefined) next[index] = { ...next[index], file: false };
      return next;
    });
  }

  function addEntry() {
    setEntries((prev) => [...prev, { id: "", file: null }]);
  }

  function removeEntry(index: number) {
    setEntries((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [{ id: "", file: null }];
    });
    setRowErrors({});
  }

  function clearEntry(index: number) {
    updateEntry(index, { id: "", file: null });
  }

  function validate(): boolean {
    const nextErrors: Record<number, { id?: boolean; file?: boolean }> = {};
    const missing: string[] = [];

    entries.forEach((entry, index) => {
      const missingId = !entry.id.trim();
      const missingFile = !entry.file;
      if (missingId || missingFile) {
        nextErrors[index] = { id: missingId, file: missingFile };
        const parts: string[] = [];
        if (missingId) parts.push(idLabel);
        if (missingFile) parts.push("file");
        missing.push(`Row ${index + 1}: missing ${parts.join(" and ")}`);
      }
    });

    const missingTwitter = !twitterUsername.trim();
    setTwitterError(missingTwitter);
    if (missingTwitter) missing.push("X (Twitter) username is required");

    setRowErrors(nextErrors);
    setValidationMessage(missing.length > 0 ? missing.join(" · ") : null);
    return missing.length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    if (!validate()) return;
    const submitted = await submit(address, entries, twitterUsername);
    if (!submitted || !submitted.saved) return;
    if (isEditing) {
      onDone?.();
    } else {
      setEntries([{ id: "", file: null }]);
      setRowErrors({});
      setValidationMessage(null);
      setTwitterUsername("");
    }
  }

  return (
    <div className="tg-corner-tl tg-corner-tr relative flex flex-col gap-4 border border-[var(--border)] bg-[var(--card)] p-6">
      <div className="flex flex-col gap-2">
        <div>
          <h2 className="text-lg font-semibold">{isEditing ? `Edit — ${title}` : title}</h2>
          <p className="text-sm text-[var(--muted-foreground)]">{description}</p>
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
          {isEditing && (
            <p className="text-xs text-[var(--muted-foreground)]">
              Editing re-uploads files for every item — please re-attach files even for entries you don't want to
              change.
            </p>
          )}
          <label className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
              X (Twitter) username
            </span>
            <input
              type="text"
              value={twitterUsername}
              onChange={(e) => {
                setTwitterUsername(e.target.value);
                setTwitterError(false);
              }}
              placeholder="@yourhandle"
              className={`border bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--ring)] ${
                twitterError ? "border-[var(--danger)]" : "border-[var(--input)]"
              }`}
            />
          </label>

          {entries.map((entry, index) => {
            const isOnlyRow = entries.length === 1;
            const isEmpty = !entry.id.trim() && !entry.file;
            return (
              <SubmissionItemRow
                key={index}
                idLabel={idLabel}
                idValue={entry.id}
                onIdChange={(value) => updateEntry(index, { id: value })}
                fileAccept={fileAccept}
                file={entry.file}
                onFileChange={(file) => updateEntry(index, { file })}
                onRemove={() => (isOnlyRow ? clearEntry(index) : removeEntry(index))}
                canRemove={isOnlyRow ? !isEmpty : true}
                idError={rowErrors[index]?.id}
                fileError={rowErrors[index]?.file}
              />
            );
          })}

          <button
            type="button"
            onClick={addEntry}
            className="self-start text-xs uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            + Add another
          </button>

          {validationMessage && <p className="text-sm text-[var(--danger)]">{validationMessage}</p>}
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

          {uploadProgress !== null && <UploadProgressBar percent={uploadProgress} />}

          <button
            type="submit"
            disabled={submitting}
            className="self-start border border-[var(--foreground)] px-4 py-2 text-xs font-medium uppercase tracking-widest transition-colors hover:bg-[var(--foreground)] hover:text-[var(--background)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? uploadProgress !== null && uploadProgress < 100
                ? "Uploading…"
                : "Submitting…"
              : isEditing
                ? "Sign & Save Changes"
                : "Sign & Submit"}
          </button>
        </form>
      )}

      {result && <SubmissionResult submission={result} />}
    </div>
  );
}
