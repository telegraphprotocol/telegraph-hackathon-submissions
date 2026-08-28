export type TrackTab = "miner" | "wasm" | "coming-soon";

const TABS: { id: TrackTab; label: string; disabled?: boolean }[] = [
  { id: "miner", label: "Track 1 — Miner" },
  { id: "wasm", label: "Track 2 — WASM" },
  { id: "coming-soon", label: "Track 3 — Coming Soon", disabled: true },
];

export function TrackTabs({ active, onChange }: { active: TrackTab; onChange: (tab: TrackTab) => void }) {
  return (
    <div className="flex gap-2 border-b border-[var(--border)]">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          disabled={tab.disabled}
          onClick={() => onChange(tab.id)}
          className={`px-4 py-2 text-xs font-medium uppercase tracking-widest transition-colors ${
            active === tab.id
              ? "border-b-2 border-[var(--foreground)] text-[var(--foreground)]"
              : tab.disabled
                ? "cursor-not-allowed text-[var(--muted-foreground)] opacity-40"
                : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
