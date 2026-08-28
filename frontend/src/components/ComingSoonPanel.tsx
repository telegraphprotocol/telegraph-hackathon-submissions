import { CountdownTimer } from "./CountdownTimer";

export function ComingSoonPanel({ deadlineIso }: { deadlineIso: string | null }) {
  return (
    <div className="tg-corner-tl tg-corner-tr relative flex flex-col items-center justify-center gap-3 border border-[var(--border)] bg-[var(--card)] p-8 text-center sm:p-16">
      <p className="text-sm uppercase tracking-widest text-[var(--muted-foreground)]">Track 3</p>
      <p className="cursor-blink text-lg font-semibold">Coming soon</p>
      {deadlineIso && <CountdownTimer deadlineIso={deadlineIso} />}
    </div>
  );
}
