"use client";

import type { Analysis, ScriptureRef } from "../schemas/analysis";
import type { DebateTurn } from "../schemas/debate";
import type { ModeratorRuling } from "../schemas/moderator";
import type { AgentMeta } from "../schemas/run";

export type TranscriptEntry =
  | { kind: "analysis"; analysis: Analysis }
  | { kind: "turn"; turn: DebateTurn }
  | { kind: "ruling"; ruling: ModeratorRuling; qualifies: boolean };

export function Transcript({
  entries,
  agents,
}: {
  entries: TranscriptEntry[];
  agents: AgentMeta[];
}) {
  if (entries.length === 0) return null;
  const meta = (id: string) => agents.find((a) => a.id === id);

  return (
    <section aria-label="Full transcript" className="mt-2">
      <h2 className="font-mono text-xs uppercase tracking-widest text-chamber-muted">
        Full transcript
      </h2>
      <ol className="mt-3 space-y-4 border-l border-chamber-line pl-4">
        {entries.map((entry, i) => (
          <li key={i}>
            {entry.kind === "analysis" && (
              <Statement
                meta={meta(entry.analysis.agentId)}
                label="Independent analysis"
                position={entry.analysis.position}
                reasoning={entry.analysis.reasoning}
                refs={entry.analysis.scriptureRefs}
              />
            )}
            {entry.kind === "turn" && (
              <Statement
                meta={meta(entry.turn.agentId)}
                label={`Round ${entry.turn.round}${entry.turn.moved ? " · moved" : ""}`}
                position={entry.turn.position}
                reasoning={entry.turn.reasoning}
                refs={entry.turn.scriptureRefs}
                movedReason={entry.turn.moved ? entry.turn.movedReason : null}
              />
            )}
            {entry.kind === "ruling" && (
              <div className="rounded border border-chamber-line bg-chamber-surface p-3 text-sm">
                <p className="font-mono text-xs uppercase tracking-widest text-chamber-muted">
                  Moderator · round {entry.ruling.round} ·{" "}
                  {entry.qualifies ? "majority reached" : "debate continues"}
                </p>
                <p className="mt-1 text-chamber-muted">
                  {entry.ruling.compatibilityRationale}
                </p>
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Statement({
  meta,
  label,
  position,
  reasoning,
  refs,
  movedReason,
}: {
  meta: AgentMeta | undefined;
  label: string;
  position: string;
  reasoning: string;
  refs: ScriptureRef[];
  movedReason?: string | null;
}) {
  const accent = meta?.accentColor ?? "#93A1B0";
  return (
    <div className="text-sm leading-relaxed">
      <p>
        <span className="font-semibold" style={{ color: accent }}>
          {meta?.name ?? "Unknown"}
        </span>{" "}
        <span className="font-mono text-xs text-chamber-faint">· {label}</span>
      </p>
      <p className="mt-1 font-medium">{position}</p>
      {movedReason && (
        <p className="mt-1 text-xs text-chamber-muted">
          Changed position: {movedReason}
        </p>
      )}
      <p className="mt-1 whitespace-pre-wrap text-chamber-muted">{reasoning}</p>
      <p className="mt-1 font-mono text-xs text-chamber-faint">
        {refs.map((r) => `${r.citation} (${r.narratorStance})`).join(" · ")}
      </p>
    </div>
  );
}
