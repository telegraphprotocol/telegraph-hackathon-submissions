import { Tooltip } from "./Tooltip";

interface Props {
  idLabel: string;
  idValue: string;
  onIdChange: (value: string) => void;
  mode: "file" | "url";
  fileAccept?: string;
  file?: File | null;
  onFileChange?: (file: File | null) => void;
  urlValue?: string;
  onUrlChange?: (value: string) => void;
  onRemove: () => void;
  canRemove: boolean;
  idError?: boolean;
  valueError?: boolean;
}

export function SubmissionItemRow({
  idLabel,
  idValue,
  onIdChange,
  mode,
  fileAccept,
  file,
  onFileChange,
  urlValue,
  onUrlChange,
  onRemove,
  canRemove,
  idError,
  valueError,
}: Props) {
  return (
    <div className="flex flex-col gap-3 border border-[var(--border)] bg-[var(--card)] p-3 sm:flex-row sm:items-center">
      <input
        type="text"
        value={idValue}
        onChange={(e) => onIdChange(e.target.value)}
        placeholder={idLabel}
        className={`min-w-0 border bg-transparent px-3 py-2 text-sm outline-none transition-colors sm:flex-1 ${
          idError
            ? "border-[var(--danger)] shadow-[0_0_0_1px_var(--danger)]"
            : "border-[var(--input)] focus:border-[var(--ring)]"
        }`}
      />
      {mode === "url" ? (
        <div className="relative min-w-0 sm:flex-1">
          <input
            type="url"
            value={urlValue}
            onChange={(e) => onUrlChange?.(e.target.value)}
            placeholder="https://github.com/..."
            className={`w-full border bg-transparent py-2 pl-3 pr-8 text-sm outline-none transition-colors ${
              valueError
                ? "border-[var(--danger)] shadow-[0_0_0_1px_var(--danger)]"
                : "border-[var(--input)] focus:border-[var(--ring)]"
            }`}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2">
            <Tooltip text="Paste the GitHub URL where your compiled WASM module is hosted — e.g. a GitHub Releases asset link, or a raw file link from your repo." />
          </span>
        </div>
      ) : (
        <label
          className={`min-w-0 cursor-pointer border border-dashed px-3 py-2 text-sm text-[var(--muted-foreground)] transition-colors sm:flex-1 ${
            valueError ? "border-[var(--danger)] shadow-[0_0_0_1px_var(--danger)]" : "border-[var(--input)]"
          }`}
        >
          <span className="block overflow-hidden text-ellipsis whitespace-nowrap" title={file?.name}>
            {file ? file.name : `Choose ${fileAccept} file`}
          </span>
          <input
            type="file"
            accept={fileAccept}
            className="hidden"
            onChange={(e) => onFileChange?.(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        className={
          canRemove
            ? "flex shrink-0 cursor-pointer items-center justify-center border border-[#ff4d4d] bg-transparent px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[#ff4d4d] transition-colors hover:bg-[#ff4d4d] hover:text-black"
            : "flex shrink-0 cursor-not-allowed items-center justify-center border border-[var(--border)] bg-transparent px-3 py-2 text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]"
        }
      >
        Remove
      </button>
    </div>
  );
}
