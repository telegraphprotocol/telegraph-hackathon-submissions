import { useEffect, useState } from "react";
import { apiClient, ApiError } from "../lib/apiClient";
import { Dropdown } from "./Dropdown";
import type { IntentScore, Submission, Track, WasmScore } from "../lib/types";

const STORAGE_KEY = "telegraph-admin-password";

const FILTERS: { id: Track | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "miner", label: "Track 1 — Miner" },
  { id: "wasm", label: "Track 2 — WASM" },
];

interface Row {
  submissionId: string;
  track: Track;
  walletAddress: string;
  status: Submission["status"];
  createdAt: string;
  itemId: string;
  itemIndex: number;
  verified: boolean;
  originalFileName: string;
  twitterUsername: string;
  tweetMentionCount: number | null;
  disqualified: boolean;
  disqualifiedReason: string | null;
}

type SortDir = "asc" | "desc" | null;

export function AdminSubmissionsTable({ password }: { password: string }) {
  const [track, setTrack] = useState<Track | "all">("all");
  const [walletFilter, setWalletFilter] = useState<string>("all");
  const [intentFilter, setIntentFilter] = useState<string>("all");
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [search, setSearch] = useState("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [minerScores, setMinerScores] = useState<Record<string, IntentScore[]>>({});
  const [wasmScores, setWasmScores] = useState<Record<string, WasmScore | null>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .adminListSubmissions({ track: track === "all" ? undefined : track, password })
      .then((data) => {
        if (!cancelled) setSubmissions(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          sessionStorage.removeItem(STORAGE_KEY);
          window.location.reload();
          return;
        }
        setError(err instanceof ApiError ? err.message : "Failed to load submissions.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [track, password]);

  useEffect(() => {
    const items = submissions
      .filter((s) => s.track === "miner")
      .flatMap((s) =>
        s.items.filter((item) => item.verified).map((item) => ({ address: s.walletAddress, id: item.id }))
      );
    if (items.length === 0) {
      setMinerScores({});
      return;
    }
    let cancelled = false;
    apiClient
      .adminGetMinerScores({ items, password })
      .then((data) => {
        if (!cancelled) setMinerScores(data);
      })
      .catch(() => {
        // Non-critical — leave scores empty if this fails.
      });
    return () => {
      cancelled = true;
    };
  }, [submissions, password]);

  useEffect(() => {
    const ids = submissions
      .filter((s) => s.track === "wasm")
      .flatMap((s) => s.items.filter((item) => item.verified).map((item) => item.id));
    if (ids.length === 0) {
      setWasmScores({});
      return;
    }
    let cancelled = false;
    apiClient
      .adminGetWasmScores({ ids, password })
      .then((data) => {
        if (!cancelled) setWasmScores(data);
      })
      .catch(() => {
        // Non-critical — leave scores empty if this fails.
      });
    return () => {
      cancelled = true;
    };
  }, [submissions, password]);

  const allRows: Row[] = submissions.flatMap((s) =>
    s.items.map((item, index) => ({
      submissionId: s._id,
      track: s.track,
      walletAddress: s.walletAddress,
      status: s.status,
      createdAt: s.createdAt,
      itemId: item.id,
      itemIndex: index,
      verified: item.verified,
      originalFileName: item.originalFileName,
      twitterUsername: s.twitterUsername,
      tweetMentionCount: s.tweetMentionCount,
      disqualified: s.disqualified,
      disqualifiedReason: s.disqualifiedReason,
    }))
  );

  function scoresFor(row: Row): IntentScore[] | undefined {
    if (row.track !== "miner" || !row.verified) return undefined;
    return minerScores[`${row.walletAddress.toLowerCase()}:${row.itemId}`];
  }

  function wasmScoreFor(row: Row): WasmScore | null | undefined {
    if (row.track !== "wasm" || !row.verified) return undefined;
    return wasmScores[row.itemId];
  }

  function bestScoreValue(row: Row): number | null {
    const scores = scoresFor(row);
    if (!scores || scores.length === 0) return null;
    if (intentFilter !== "all") {
      return scores.find((s) => s.intent === intentFilter)?.normalizedScore ?? null;
    }
    return Math.max(...scores.map((s) => s.normalizedScore));
  }

  const intentOptions = [
    ...new Set(Object.values(minerScores).flatMap((scores) => scores.map((s) => s.intent))),
  ].sort();

  const walletOptions = [...new Set(allRows.map((r) => r.walletAddress))].sort();

  const searchLower = search.trim().toLowerCase();
  let rows = allRows.filter((r) => {
    if (walletFilter !== "all" && r.walletAddress !== walletFilter) return false;
    if (
      searchLower &&
      !r.walletAddress.toLowerCase().includes(searchLower) &&
      !r.itemId.toLowerCase().includes(searchLower)
    ) {
      return false;
    }
    if (intentFilter !== "all") {
      const scores = scoresFor(r);
      if (!scores || !scores.some((s) => s.intent === intentFilter)) return false;
    }
    return true;
  });

  if (sortDir) {
    rows = [...rows].sort((a, b) => {
      const av = bestScoreValue(a);
      const bv = bestScoreValue(b);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }

  const activeRows = rows.filter((r) => !r.disqualified);
  const disqualifiedRows = rows.filter((r) => r.disqualified);

  async function disqualify(submissionId: string) {
    const reason = window.prompt("Reason for disqualifying this entry (optional):") ?? undefined;
    await apiClient.adminDisqualifySubmission({ submissionId, password, reason });
    setSubmissions((prev) =>
      prev.map((s) => (s._id === submissionId ? { ...s, disqualified: true, disqualifiedReason: reason ?? null } : s))
    );
  }

  async function requalify(submissionId: string) {
    await apiClient.adminRequalifySubmission({ submissionId, password });
    setSubmissions((prev) =>
      prev.map((s) => (s._id === submissionId ? { ...s, disqualified: false, disqualifiedReason: null } : s))
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Submissions</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Review and download hackathon submissions by track.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem(STORAGE_KEY);
            window.location.reload();
          }}
          className="shrink-0 border border-[#ff4d4d] px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#ff4d4d] transition-colors hover:bg-[#ff4d4d] hover:text-black"
        >
          Log out
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-[var(--border)] pb-3">
        {FILTERS.map((filter) => (
          <button
            key={filter.id}
            onClick={() => setTrack(filter.id)}
            className={`whitespace-nowrap border px-3 py-1.5 text-xs font-medium uppercase tracking-widest transition-colors ${
              track === filter.id
                ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-[var(--muted-foreground)]">Loading submissions…</p>}
      {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

      {!loading && !error && allRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          {walletOptions.length > 0 && (
            <Dropdown
              value={walletFilter}
              onChange={setWalletFilter}
              placeholder="All wallets"
              options={[
                { value: "all", label: "All wallets" },
                ...walletOptions.map((wallet) => ({
                  value: wallet,
                  label: `${wallet.slice(0, 6)}…${wallet.slice(-4)}`,
                })),
              ]}
            />
          )}
          {intentOptions.length > 0 && (
            <Dropdown
              value={intentFilter}
              onChange={setIntentFilter}
              placeholder="All intents"
              options={[
                { value: "all", label: "All intents" },
                ...intentOptions.map((intent) => ({ value: intent, label: intent })),
              ]}
            />
          )}
          <button
            type="button"
            onClick={() => setSortDir((prev) => (prev === "desc" ? "asc" : prev === "asc" ? null : "desc"))}
            className="flex items-center gap-2 border border-[var(--border)] bg-transparent px-3 py-1.5 text-xs font-medium uppercase tracking-widest text-[var(--muted-foreground)] transition-colors hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
          >
            Sort by score {sortDir === "desc" ? "↓" : sortDir === "asc" ? "↑" : ""}
          </button>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search wallet or item ID…"
            className="min-w-[220px] flex-1 border border-[var(--input)] bg-transparent px-3 py-1.5 text-sm outline-none focus:border-[var(--ring)]"
          />
        </div>
      )}

      {!loading && !error && rows.length === 0 && (
        <div className="tg-corner-tl tg-corner-tr relative flex flex-col items-center gap-1 border border-dashed border-[var(--border)] p-12 text-center">
          <p className="text-sm font-medium">No submissions match</p>
          <p className="text-xs text-[var(--muted-foreground)]">
            {allRows.length === 0
              ? track === "all"
                ? "Submissions will appear here once someone submits to any track."
                : `No submissions for ${FILTERS.find((f) => f.id === track)?.label} yet.`
              : "Try adjusting the filters or search above."}
          </p>
        </div>
      )}

      {!loading && !error && activeRows.length > 0 && (
        <SubmissionsTable
          rows={activeRows}
          password={password}
          intentFilter={intentFilter}
          sortDir={sortDir}
          setSortDir={setSortDir}
          scoresFor={scoresFor}
          wasmScoreFor={wasmScoreFor}
          actionLabel="Disqualify"
          onAction={disqualify}
        />
      )}

      {!loading && !error && disqualifiedRows.length > 0 && (
        <div className="flex flex-col gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[var(--danger)]">Disqualified</h2>
            <p className="text-xs text-[var(--muted-foreground)]">
              These entries are excluded from judging. Requalify to move them back above.
            </p>
          </div>
          <SubmissionsTable
            rows={disqualifiedRows}
            password={password}
            intentFilter={intentFilter}
            sortDir={sortDir}
            setSortDir={setSortDir}
            scoresFor={scoresFor}
            wasmScoreFor={wasmScoreFor}
            actionLabel="Requalify"
            onAction={requalify}
          />
        </div>
      )}
    </div>
  );
}

function SubmissionsTable({
  rows,
  password,
  intentFilter,
  sortDir,
  setSortDir,
  scoresFor,
  wasmScoreFor,
  actionLabel,
  onAction,
}: {
  rows: Row[];
  password: string;
  intentFilter: string;
  sortDir: SortDir;
  setSortDir: (fn: (prev: SortDir) => SortDir) => void;
  scoresFor: (row: Row) => IntentScore[] | undefined;
  wasmScoreFor: (row: Row) => WasmScore | null | undefined;
  actionLabel: "Disqualify" | "Requalify";
  onAction: (submissionId: string) => void;
}) {
  return (
    <div className="overflow-x-auto border border-[var(--border)]">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] bg-[var(--popover)] text-left text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
            <th className="px-3 py-2 font-medium">Track</th>
            <th className="px-3 py-2 font-medium">Wallet</th>
            <th className="px-3 py-2 font-medium">Item ID</th>
            <th className="px-3 py-2 font-medium">Status</th>
            <th className="px-3 py-2 font-medium">X Account</th>
            <th className="px-3 py-2 font-medium">X Mentions</th>
            <th className="px-3 py-2 font-medium">Intent</th>
            <th className="px-3 py-2 font-medium">
              <button
                type="button"
                onClick={() => setSortDir((prev) => (prev === "desc" ? "asc" : prev === "asc" ? null : "desc"))}
                className="flex items-center gap-1 uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Score {sortDir === "desc" ? "↓" : sortDir === "asc" ? "↑" : ""}
              </button>
            </th>
            <th className="px-3 py-2 font-medium">Submitted</th>
            <th className="px-3 py-2 font-medium">File</th>
            <th className="px-3 py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={`${row.submissionId}-${row.itemId}`}
              className="border-b border-[var(--border)] align-top last:border-b-0 hover:bg-[var(--card)]"
            >
              <td className="whitespace-nowrap px-3 py-2 text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
                {row.track}
              </td>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">
                {row.walletAddress.slice(0, 6)}…{row.walletAddress.slice(-4)}
              </td>
              <td className="whitespace-nowrap px-3 py-2 font-mono">{row.itemId}</td>
              <td className="whitespace-nowrap px-3 py-2">
                <span className={row.verified ? "text-[var(--success)]" : "text-[var(--danger)]"}>
                  {row.verified ? "✓ verified" : "✗ not verified"}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">@{row.twitterUsername}</td>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs">{row.tweetMentionCount ?? "—"}</td>
              {row.track === "miner" && row.verified ? (
                <IntentScoreCells scores={scoresFor(row)} onlyIntent={intentFilter === "all" ? undefined : intentFilter} />
              ) : row.track === "wasm" && row.verified ? (
                <WasmScoreCells wasmScore={wasmScoreFor(row)} />
              ) : (
                <>
                  <td className="px-3 py-2 text-xs text-[var(--muted-foreground)]">—</td>
                  <td className="px-3 py-2 text-xs text-[var(--muted-foreground)]">—</td>
                </>
              )}
              <td className="whitespace-nowrap px-3 py-2 text-xs text-[var(--muted-foreground)]">
                {new Date(row.createdAt).toLocaleString()}
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                <button
                  className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  onClick={() =>
                    apiClient.adminDownloadFile({
                      submissionId: row.submissionId,
                      itemIndex: row.itemIndex,
                      password,
                      fileName: row.originalFileName,
                    })
                  }
                >
                  Download
                </button>
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                <button
                  type="button"
                  title={row.disqualifiedReason ?? undefined}
                  onClick={() => onAction(row.submissionId)}
                  className={`text-xs uppercase tracking-widest ${
                    actionLabel === "Disqualify"
                      ? "text-[var(--danger)] hover:opacity-80"
                      : "text-[var(--success)] hover:opacity-80"
                  }`}
                >
                  {actionLabel}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WasmScoreCells({ wasmScore }: { wasmScore: WasmScore | null | undefined }) {
  if (wasmScore === undefined) {
    return (
      <>
        <td className="px-3 py-2 text-xs text-[var(--muted-foreground)]">Loading…</td>
        <td className="px-3 py-2 text-xs text-[var(--muted-foreground)]">—</td>
      </>
    );
  }
  if (!wasmScore) {
    return (
      <>
        <td className="px-3 py-2 text-xs text-[var(--muted-foreground)]">—</td>
        <td className="px-3 py-2 text-xs text-[var(--muted-foreground)]">Not found</td>
      </>
    );
  }
  const isRejected = wasmScore.activationStatus === "rejected";
  return (
    <>
      <td className="whitespace-nowrap px-3 py-2 text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
        {wasmScore.intent ?? "—"}
      </td>
      <td className="px-3 py-2 font-mono text-xs text-[var(--foreground)]">
        {isRejected ? (
          <span className="text-[var(--danger)]" title={wasmScore.rejectionReason ?? undefined}>
            Rejected
          </span>
        ) : (
          (wasmScore.score?.toFixed(4) ?? "No score yet")
        )}
      </td>
    </>
  );
}

function IntentScoreCells({
  scores,
  onlyIntent,
}: {
  scores: IntentScore[] | undefined;
  onlyIntent?: string;
}) {
  const filtered = onlyIntent ? scores?.filter((s) => s.intent === onlyIntent) : scores;
  scores = filtered;
  if (!scores) {
    return (
      <>
        <td className="px-3 py-2 text-xs text-[var(--muted-foreground)]">Loading…</td>
        <td className="px-3 py-2 text-xs text-[var(--muted-foreground)]">—</td>
      </>
    );
  }
  if (scores.length === 0) {
    return (
      <>
        <td className="px-3 py-2 text-xs text-[var(--muted-foreground)]">—</td>
        <td className="px-3 py-2 text-xs text-[var(--muted-foreground)]">No score yet</td>
      </>
    );
  }
  return (
    <>
      <td className="px-3 py-2">
        <ul className="flex flex-col gap-0.5">
          {scores.map((s) => (
            <li key={s.intent} className="whitespace-nowrap text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
              {s.intent}
            </li>
          ))}
        </ul>
      </td>
      <td className="px-3 py-2">
        <ul className="flex flex-col gap-0.5">
          {scores.map((s) => (
            <li key={s.intent} className="whitespace-nowrap font-mono text-xs text-[var(--foreground)]">
              {s.normalizedScore.toFixed(2)} (#{s.rank})
            </li>
          ))}
        </ul>
      </td>
    </>
  );
}
