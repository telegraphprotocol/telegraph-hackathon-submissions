import { useEffect, useRef, useState } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useDisconnect } from "wagmi";

export function WalletConnectButton() {
  const { disconnect } = useDisconnect();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <ConnectButton.Custom>
      {({ account, chain, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            className="wallet-bar"
            {...(!ready && {
              "aria-hidden": true,
              style: { opacity: 0, pointerEvents: "none", userSelect: "none" },
            })}
          >
            {!connected ? (
              <button type="button" className="wallet-pill wallet-pill-primary" onClick={openConnectModal}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 3H8a2 2 0 0 0-2 2v2h12V5a2 2 0 0 0-2-2z" />
                  <circle cx="17" cy="14" r="1.5" fill="currentColor" />
                </svg>
                Connect
              </button>
            ) : chain.unsupported ? (
              <button type="button" className="wallet-pill wallet-pill-danger" onClick={openChainModal}>
                Wrong Chain
              </button>
            ) : (
              <div className="wallet-account-wrap" ref={wrapRef}>
                <button type="button" className="wallet-pill wallet-pill-primary" onClick={() => setOpen((v) => !v)}>
                  <span className="wallet-pill-dot" />
                  <span className="wallet-pill-label">{account.displayName}</span>
                </button>

                {open && (
                  <div className="wallet-dropdown">
                    <div className="wallet-dropdown-row">
                      <span className="wallet-dropdown-label">ADDRESS</span>
                      <span className="wallet-dropdown-value">{account.displayName}</span>
                    </div>
                    <button
                      type="button"
                      className="wallet-dropdown-disconnect"
                      onClick={() => {
                        disconnect();
                        setOpen(false);
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <polyline points="16 17 21 12 16 7" />
                        <line x1="21" y1="12" x2="9" y2="12" />
                      </svg>
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
