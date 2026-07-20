"use client";

import type { RunSummary } from "../schemas/run";

const OUTCOME_SHORT: Record<NonNullable<RunSummary["outcome"]>, string> = {
  consensus: "consensus",
  qualified_majority: "majority",
  dissensus: "dissensus",
};

export function Archive({
  runs,
  disabled,
  activeRunId,
  onOpen,
}: {
  runs: RunSummary[];
  disabled: boolean;
  activeRunId: string | null;
  onOpen: (id: string) => void;
}) {
  if (runs.length === 0) return null;

  return (
    <section aria-label="Past sessions" className="rounded-lg border border-chamber-line bg-chamber-surface p-4">
      <h2 className="font-mono text-xs uppercase tracking-widest text-chamber-muted">
        Past sessions
      </h2>
      <ul className="mt-2 divide-y divide-chamber-line">
        {runs.map((run) => (
          <li key={run.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onOpen(run.id)}
              aria-current={run.id === activeRunId ? "true" : undefined}
              className={`flex w-full items-baseline gap-3 py-2 text-left text-sm hover:bg-chamber-raised disabled:cursor-not-allowed disabled:opacity-50 ${
                run.id === activeRunId ? "text-chamber-gold" : "text-chamber-ink"
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{run.topic}</span>
              <span className="shrink-0 font-mono text-[11px] text-chamber-muted">
                {run.outcome
                  ? OUTCOME_SHORT[run.outcome]
                  : run.status === "adjourned"
                    ? "adjourned"
                    : run.status}
                {" · "}
                {run.roundsUsed} rd{run.roundsUsed === 1 ? "" : "s"}
                {" · "}
                {new Date(run.createdAt).toLocaleDateString()}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
