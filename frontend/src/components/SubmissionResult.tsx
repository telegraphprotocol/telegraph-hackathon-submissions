import type { SubmissionResponse, SubmissionStatus } from "../lib/types";

const STATUS_META: Record<SubmissionStatus, { label: string; color: string; accent: string }> = {
  verified: { label: "All items verified", color: "text-[var(--success)]", accent: "border-l-[var(--success)]" },
  partial: { label: "Some items need attention", color: "text-[var(--warning)]", accent: "border-l-[var(--warning)]" },
  rejected: { label: "No items could be verified", color: "text-[var(--danger)]", accent: "border-l-[var(--danger)]" },
};

export function SubmissionResult({ submission }: { submission: SubmissionResponse }) {
  const meta = STATUS_META[submission.status];

  return (
    <div
      className={`terminal-log-entry flex flex-col gap-3 border border-[var(--border)] border-l-4 bg-[var(--popover)] p-4 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.5)] ${meta.accent}`}
    >
      <p className={`text-sm font-semibold uppercase tracking-widest ${meta.color}`}>{meta.label}</p>
      {!submission.saved && (
        <p className="text-xs text-[var(--muted-foreground)]">
          Nothing was saved — fix the item(s) below and submit again.
        </p>
      )}
      <ul className="flex flex-col gap-2">
        {submission.items.map((item) => (
          <li key={item.id} className="flex flex-col gap-1 border border-[var(--border)] bg-[var(--card)] px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-sm">
              <span className="font-mono break-all">{item.id}</span>
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
    </div>
  );
}
