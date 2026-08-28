import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { apiClient, ApiError } from "../lib/apiClient";
import { useDeadlines } from "../hooks/useDeadlines";
import { useDeleteSubmission } from "../hooks/useDeleteSubmission";
import { TrackSubmissionForm } from "../components/TrackSubmissionForm";
import type { Submission, Track } from "../lib/types";

const TRACK_META: Record<Track, { idLabel: string; fileAccept: string; title: string; description: string }> = {
  miner: {
    idLabel: "Miner ID",
    fileAccept: ".yaml,.yml",
    title: "Track 1 — Miner Submission",
    description: "Submit one or more miner IDs, each with its YAML config file.",
  },
  wasm: {
    idLabel: "WASM registration ID",
    fileAccept: ".wasm",
    title: "Track 2 — WASM Submission",
    description: "Submit one or more WASM registration IDs, each with its .wasm file.",
  },
};

export function MySubmissionsPage() {
  const { address, isConnected } = useAccount();
  const deadlines = useDeadlines();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { deleteSubmission, deleting, error: deleteError } = useDeleteSubmission();

  function reload() {
    if (!address) return;
    setLoading(true);
    setError(null);
    apiClient
      .getMySubmissions(address)
      .then(setSubmissions)
      .catch((err) => {
        setError(err instanceof ApiError ? err.message : "Failed to load your submissions.");
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  if (!isConnected || !address) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-[var(--muted-foreground)]">Connect your wallet to view your submissions.</p>
      </div>
    );
  }

  const editingSubmission = submissions.find((s) => s._id === editingId) ?? null;
  const visibleSubmissions = submissions.filter((s) => s.status !== "rejected");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-lg font-semibold">My Submissions</h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          Submissions made with the currently connected wallet ({address}).
        </p>
      </div>

      {loading && <p className="text-sm text-[var(--muted-foreground)]">Loading…</p>}
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {!loading && !error && visibleSubmissions.length === 0 && (
        <div className="tg-corner-tl tg-corner-tr relative flex flex-col items-center gap-1 border border-dashed border-[var(--border)] p-12 text-center">
          <p className="text-sm font-medium">No submissions yet</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            Go to the Submit page to enter Track 1 or Track 2.
          </p>
        </div>
      )}

      {editingSubmission ? (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setEditingId(null)}
            className="self-start text-xs uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            ← Back to my submissions
          </button>
          <TrackSubmissionForm
            track={editingSubmission.track}
            {...TRACK_META[editingSubmission.track]}
            deadlineIso={deadlines?.[editingSubmission.track] ?? null}
            editingSubmissionId={editingSubmission._id}
            initialItemIds={editingSubmission.items.map((i) => i.id)}
            initialTwitterUsername={editingSubmission.twitterUsername}
            onDone={() => {
              setEditingId(null);
              reload();
            }}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {visibleSubmissions.map((submission) => {
            const deadlineIso = deadlines?.[submission.track];
            const isPast = deadlineIso ? Date.now() > new Date(deadlineIso).getTime() : false;
            return (
              <div key={submission._id} className="border border-[var(--border)] bg-[var(--card)] p-4">
                <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
                  <span className="flex items-center gap-2">
                    <span className="border border-[var(--border)] px-1.5 py-0.5">{submission.track}</span>
                    <span
                      className={
                        submission.status === "verified"
                          ? "text-[var(--success)]"
                          : submission.status === "partial"
                            ? "text-[var(--warning)]"
                            : "text-[var(--danger)]"
                      }
                    >
                      {submission.status}
                    </span>
                  </span>
                  <span>Updated {new Date(submission.updatedAt).toLocaleString()}</span>
                </div>
                <ul className="mb-3 flex flex-col gap-2">
                  {submission.items.map((item) => (
                    <li key={item.id} className="flex flex-col gap-1 border border-[var(--border)] px-3 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>{item.id}</span>
                        <span className={item.verified ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                          {item.verified ? "✓ verified" : "✗ not verified"}
                        </span>
                      </div>
                      {!item.verified && item.reason && (
                        <p className="text-xs text-[var(--muted-foreground)]">{item.reason}</p>
                      )}
                    </li>
                  ))}
                </ul>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isPast}
                    onClick={() => setEditingId(submission._id)}
                    className="border border-[#4da6ff] bg-[#4da6ff]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#4da6ff] transition-colors hover:bg-[#4da6ff] hover:text-black disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:bg-transparent disabled:text-[var(--muted-foreground)]"
                  >
                    {isPast ? "Editing closed" : "Edit"}
                  </button>

                  {confirmDeleteId === submission._id ? (
                    <>
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={async () => {
                          if (!address) return;
                          const ok = await deleteSubmission(address, submission.track, submission._id);
                          if (ok) {
                            setConfirmDeleteId(null);
                            reload();
                          }
                        }}
                        className="border border-[#ff4d4d] bg-[#ff4d4d] px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-black transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deleting ? "Deleting…" : "Confirm delete"}
                      </button>
                      <button
                        type="button"
                        disabled={deleting}
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      disabled={isPast}
                      onClick={() => setConfirmDeleteId(submission._id)}
                      className="border border-[#ff4d4d] px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#ff4d4d] transition-colors hover:bg-[#ff4d4d] hover:text-black disabled:cursor-not-allowed disabled:border-[var(--border)] disabled:text-[var(--muted-foreground)]"
                    >
                      {isPast ? "Deletion closed" : "Delete"}
                    </button>
                  )}
                </div>
                {confirmDeleteId === submission._id && deleteError && (
                  <p className="mt-2 text-xs text-[var(--danger)]">{deleteError}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
