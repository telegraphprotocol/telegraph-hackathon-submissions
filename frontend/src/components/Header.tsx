import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { WalletConnectButton } from "./WalletConnectButton";

const NAV = [
  { to: "/", label: "Submit" },
  { to: "/mine", label: "My Submissions" },
  { to: "/admin", label: "Admin" },
];

export function Header() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-black/70 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6 sm:py-4">
        <Link to="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
          <span className="text-base font-bold tracking-widest sm:text-lg">TELEGRAPH</span>
          <span className="hidden text-xs uppercase tracking-widest text-[var(--muted-foreground)] sm:inline">
            Hackathon Submissions
          </span>
        </Link>

        <nav className="hidden items-center gap-4 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`text-xs font-medium uppercase tracking-widest transition-colors ${
                location.pathname === item.to
                  ? "text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <WalletConnectButton />

          <button
            type="button"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            className="flex h-8 w-8 flex-col items-center justify-center gap-1.5 border border-[var(--border)] md:hidden"
          >
            <span
              className={`h-px w-4 bg-[var(--foreground)] transition-transform ${menuOpen ? "translate-y-[3px] rotate-45" : ""}`}
            />
            <span
              className={`h-px w-4 bg-[var(--foreground)] transition-transform ${menuOpen ? "-translate-y-[3px] -rotate-45" : ""}`}
            />
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="flex flex-col gap-1 border-t border-[var(--border)] px-4 py-3 md:hidden">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMenuOpen(false)}
              className={`px-2 py-2 text-xs font-medium uppercase tracking-widest transition-colors ${
                location.pathname === item.to
                  ? "text-[var(--foreground)]"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
