"use client";

import type { Verdict } from "../schemas/verdict";
import type { AgentMeta } from "../schemas/run";

const OUTCOME_LABELS: Record<Verdict["outcome"], string> = {
  consensus: "Consensus",
  qualified_majority: "Qualified majority",
  dissensus: "Dissensus — honestly recorded",
};

export function VerdictPanel({
  verdict,
  agents,
}: {
  verdict: Verdict;
  agents: AgentMeta[];
}) {
  const names = (ids: string[]) =>
    ids.map((id) => agents.find((a) => a.id === id)?.name ?? id).join(", ");

  return (
    <section
      aria-label="Sealed verdict"
      className="rounded-lg border-2 border-chamber-gold/70 bg-chamber-raised p-5"
    >
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-chamber-gold">
        Sealed verdict · {OUTCOME_LABELS[verdict.outcome]}
      </p>
      <h2 className="mt-2 text-xl font-semibold leading-snug">
        {verdict.headline}
      </h2>

      <dl className="mt-4 space-y-4 text-sm leading-relaxed">
        {verdict.consensus && (
          <div>
            <dt className="font-mono text-xs uppercase tracking-widest text-chamber-muted">
              Common ground
            </dt>
            <dd className="mt-1">{verdict.consensus}</dd>
          </div>
        )}
        {verdict.majority && (
          <div>
            <dt className="font-mono text-xs uppercase tracking-widest text-chamber-muted">
              Majority — {names(verdict.majority.agentIds)}
            </dt>
            <dd className="mt-1">{verdict.majority.statement}</dd>
          </div>
        )}
        {verdict.dissent && (
          <div>
            <dt className="font-mono text-xs uppercase tracking-widest text-chamber-muted">
              Dissent — {names(verdict.dissent.agentIds)}
            </dt>
            <dd className="mt-1">{verdict.dissent.statement}</dd>
          </div>
        )}
        {verdict.deadlockBreaker && (
          <div>
            <dt className="font-mono text-xs uppercase tracking-widest text-chamber-muted">
              What would break the deadlock
            </dt>
            <dd className="mt-1">{verdict.deadlockBreaker}</dd>
          </div>
        )}
        <div>
          <dt className="font-mono text-xs uppercase tracking-widest text-chamber-muted">
            Scripture foundation
          </dt>
          <dd className="mt-1">
            <ul className="space-y-1">
              {verdict.scriptureFoundation.map((s, i) => (
                <li key={i}>
                  <span className="font-mono text-chamber-gold">{s.citation}</span>
                  <span className="text-chamber-muted"> — {s.role}</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
      <p className="mt-4 text-xs text-chamber-faint">
        Recorded after {verdict.roundsUsed} debate round
        {verdict.roundsUsed === 1 ? "" : "s"}.
      </p>
    </section>
  );
}
