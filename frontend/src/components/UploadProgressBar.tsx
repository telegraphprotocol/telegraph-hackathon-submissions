export function UploadProgressBar({ percent }: { percent: number }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
        <span>Uploading…</span>
        <span>{percent}%</span>
      </div>
      <div className="h-1.5 w-full border border-[var(--border)]">
        <div
          className="h-full bg-[var(--foreground)] transition-[width] duration-150 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
