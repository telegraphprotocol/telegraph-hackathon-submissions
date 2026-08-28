import { useState } from "react";

interface Props {
  title: string;
  description?: string;
  placeholder?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptModal({ title, description, placeholder, confirmLabel = "Confirm", onConfirm, onCancel }: Props) {
  const [value, setValue] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="tg-corner-tl tg-corner-tr relative flex w-full max-w-md flex-col gap-4 border border-[var(--border)] bg-[var(--card)] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="mt-1 text-xs text-[var(--muted-foreground)]">{description}</p>}
        </div>
        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full resize-none border border-[var(--input)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--ring)]"
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="border border-[var(--border)] px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-[var(--muted-foreground)] transition-colors hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirm(value)}
            className="border border-[var(--foreground)] px-3 py-1.5 text-xs font-medium uppercase tracking-widest transition-colors hover:bg-[var(--foreground)] hover:text-[var(--background)]"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
