export function Tooltip({ text }: { text: string }) {
  return (
    <span
      tabIndex={0}
      className="group relative inline-flex h-4 w-4 shrink-0 cursor-help items-center justify-center rounded-full border border-[var(--border)] text-[10px] leading-none text-[var(--muted-foreground)] outline-none"
    >
      ?
      <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-56 -translate-x-1/2 border border-[var(--border)] bg-[var(--popover)] p-2 text-xs font-normal normal-case leading-snug tracking-normal text-[var(--foreground)] opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus:opacity-100">
        {text}
      </span>
    </span>
  );
}
