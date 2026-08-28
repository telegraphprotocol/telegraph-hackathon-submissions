import { useEffect, useState } from "react";

function formatRemaining(ms: number): string {
  if (ms <= 0) return "00:00:00:00";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(days)}:${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

function urgencyColor(remaining: number): string {
  if (remaining <= 0) return "text-[var(--danger)]";
  if (remaining < 60 * 60 * 1000) return "text-[var(--danger)]";
  if (remaining < 24 * 60 * 60 * 1000) return "text-[var(--warning)]";
  return "text-[var(--foreground)]";
}

export function CountdownTimer({ deadlineIso, compact }: { deadlineIso: string; compact?: boolean }) {
  const deadline = new Date(deadlineIso).getTime();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const remaining = deadline - now;
  const isPast = remaining <= 0;
  const deadlineLabel = new Date(deadlineIso).toUTCString().replace("GMT", "UTC");

  if (compact) {
    return (
      <div className="flex flex-col gap-1">
        <span
          className={`font-mono text-2xl font-bold tabular-nums tracking-tight sm:text-3xl ${urgencyColor(remaining)}`}
        >
          {isPast ? "CLOSED" : formatRemaining(remaining)}
        </span>
        {!isPast && (
          <span className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
            days : hours : min : sec
          </span>
        )}
        <span className="text-xs text-[var(--muted-foreground)]">{deadlineLabel}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
      <span className="uppercase tracking-widest text-[var(--muted-foreground)]">
        {isPast ? "Submissions closed" : "Closes in"}
      </span>
      {!isPast && (
        <span className={`font-mono text-sm font-semibold tabular-nums ${urgencyColor(remaining)}`}>
          {formatRemaining(remaining)}
        </span>
      )}
      <span className="text-[var(--muted-foreground)]">(deadline: {deadlineLabel})</span>
    </div>
  );
}
