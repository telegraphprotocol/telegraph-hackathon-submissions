import { Link, useLocation } from "react-router-dom";
import { WalletConnectButton } from "./WalletConnectButton";

const NAV = [
  { to: "/", label: "Submit" },
  { to: "/mine", label: "My Submissions" },
  { to: "/admin", label: "Admin" },
];

export function Header() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-[var(--border)] bg-black/70 px-6 py-4 backdrop-blur-xl">
      <Link to="/" className="flex items-center gap-2">
        <span className="text-lg font-bold tracking-widest">TELEGRAPH</span>
        <span className="text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
          Hackathon Submissions
        </span>
      </Link>

      <nav className="flex items-center gap-4">
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
        <WalletConnectButton />
      </nav>
    </header>
  );
}
