import { useState, type FormEvent, type ReactNode } from "react";

const STORAGE_KEY = "telegraph-admin-password";

export function AdminLoginGate({ children }: { children: (password: string) => ReactNode }) {
  const [password, setPassword] = useState<string | null>(() => sessionStorage.getItem(STORAGE_KEY));
  const [input, setInput] = useState("");

  if (password) {
    return <>{children(password)}</>;
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    sessionStorage.setItem(STORAGE_KEY, input);
    setPassword(input);
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto mt-16 flex max-w-xs flex-col gap-3">
      <p className="text-sm uppercase tracking-widest text-[var(--muted-foreground)]">Admin access</p>
      <input
        type="password"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Admin password"
        className="border border-[var(--input)] bg-transparent px-3 py-2 text-sm outline-none focus:border-[var(--ring)]"
      />
      <button
        type="submit"
        className="border border-[var(--foreground)] px-4 py-2 text-xs font-medium uppercase tracking-widest hover:bg-[var(--foreground)] hover:text-[var(--background)]"
      >
        Enter
      </button>
    </form>
  );
}
