interface Props {
  idLabel: string;
  idValue: string;
  onIdChange: (value: string) => void;
  fileAccept: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
  onRemove: () => void;
  canRemove: boolean;
  idError?: boolean;
  fileError?: boolean;
}

export function SubmissionItemRow({
  idLabel,
  idValue,
  onIdChange,
  fileAccept,
  file,
  onFileChange,
  onRemove,
  canRemove,
  idError,
  fileError,
}: Props) {
  return (
    <div className="flex items-center gap-3 border border-[var(--border)] bg-[var(--card)] p-3">
      <input
        type="text"
        value={idValue}
        onChange={(e) => onIdChange(e.target.value)}
        placeholder={idLabel}
        className={`flex-1 min-w-0 border bg-transparent px-3 py-2 text-sm outline-none transition-colors ${
          idError
            ? "border-[var(--danger)] shadow-[0_0_0_1px_var(--danger)]"
            : "border-[var(--input)] focus:border-[var(--ring)]"
        }`}
      />
      <label
        className={`flex-1 min-w-0 cursor-pointer border border-dashed px-3 py-2 text-sm text-[var(--muted-foreground)] transition-colors ${
          fileError ? "border-[var(--danger)] shadow-[0_0_0_1px_var(--danger)]" : "border-[var(--input)]"
        }`}
      >
        <span className="block overflow-hidden text-ellipsis whitespace-nowrap" title={file?.name}>
          {file ? file.name : `Choose ${fileAccept} file`}
        </span>
        <input
          type="file"
          accept={fileAccept}
          className="hidden"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />
      </label>
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
