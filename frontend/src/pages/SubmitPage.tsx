import { useState } from "react";
import { TrackTabs, type TrackTab } from "../components/TrackTabs";
import { TrackSubmissionForm } from "../components/TrackSubmissionForm";
import { ComingSoonPanel } from "../components/ComingSoonPanel";
import { useDeadlines } from "../hooks/useDeadlines";

export function SubmitPage() {
  const [tab, setTab] = useState<TrackTab>("miner");
  const deadlines = useDeadlines();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8 sm:px-6 sm:py-10">
      <TrackTabs active={tab} onChange={setTab} />

      {tab === "miner" && (
        <TrackSubmissionForm
          track="miner"
          idLabel="Miner ID"
          fileAccept=".yaml,.yml"
          title="Track 1 — Miner Submission"
          description="Submit one or more miner IDs, each with its YAML config file."
          deadlineIso={deadlines?.miner ?? null}
        />
      )}
      {tab === "wasm" && (
        <TrackSubmissionForm
          track="wasm"
          idLabel="WASM registration ID"
          fileAccept=".wasm"
          title="Track 2 — WASM Submission"
          description="Submit one or more WASM registration IDs, each with its .wasm file."
          deadlineIso={deadlines?.wasm ?? null}
        />
      )}
      {tab === "coming-soon" && <ComingSoonPanel deadlineIso={deadlines?.track3 ?? null} />}
    </div>
  );
}
