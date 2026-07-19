"use client";

import type { AgentMeta } from "../schemas/run";
import type { StanceTag, Confidence } from "../schemas/analysis";

export type SpeakerStatus = "waiting" | "speaking" | "spoken";

export interface AgentCardState {
  status: SpeakerStatus;
  /** Best-effort text extracted from the JSON stream while the agent speaks. */
  liveText: string;
  position: string | null;
  moved: boolean;
  movedReason: string | null;
  stanceTag: StanceTag | null;
  confidence: Confidence | null;
  inMajority: boolean | null;
}

const STANCE_LABELS: Record<StanceTag, string> = {
  lie_always_sin: "Every lie is sin",
  lie_pardoned_fault: "A pardoned fault",
  lie_justified: "The right act",
  no_conflict: "No real conflict",
  other: "Other",
};

export function AgentCard({
  meta,
  state,
}: {
  meta: AgentMeta;
  state: AgentCardState;
}) {
  const accentStyle = { "--accent": meta.accentColor } as React.CSSProperties;

  return (
    <article
      aria-label={`${meta.name} — ${statusLabel(state.status)}`}
      style={accentStyle}
      className={`flex flex-col rounded-lg border border-chamber-line bg-chamber-surface p-4 ${
        state.status === "speaking" ? "speaking-ring" : ""
      }`}
    >
      <header className="flex items-start justify-between gap-2">
        <div>
          <h3
            className="text-base font-semibold leading-tight"
            style={{ color: meta.accentColor }}
          >
            {meta.name}
            {meta.isLiving && (
              <span
                className="ml-2 align-middle rounded border border-chamber-line px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide text-chamber-muted"
                title="Living person — simulated views are inferred and may misrepresent him"
              >
                living · inferred
              </span>
            )}
          </h3>
          <p className="mt-0.5 text-xs text-chamber-muted">
            {meta.era} · {meta.school}
          </p>
        </div>
        <StatusPip status={state.status} inMajority={state.inMajority} />
      </header>

      <div className="mt-3 flex-1 text-sm leading-relaxed">
        {state.position ? (
          <>
            <p className="text-chamber-ink">{state.position}</p>
            {state.moved && (
              <p className="mt-2 rounded border-l-2 pl-2 text-xs text-chamber-muted" style={{ borderColor: meta.accentColor }}>
                <span
                  className="font-mono uppercase tracking-wide"
                  style={{ color: meta.accentColor }}
                >
                  moved
                </span>
                {state.movedReason ? ` — ${state.movedReason}` : null}
              </p>
            )}
          </>
        ) : state.status === "speaking" ? (
          <p className="caret whitespace-pre-wrap break-words text-chamber-muted">
            {state.liveText || "Composing…"}
          </p>
        ) : (
          <p className="text-chamber-faint">Awaiting the question.</p>
        )}
      </div>

      {(state.stanceTag || state.confidence) && (
        <footer className="mt-3 flex flex-wrap gap-2 border-t border-chamber-line pt-2 font-mono text-[11px] text-chamber-muted">
          {state.stanceTag && <span>{STANCE_LABELS[state.stanceTag]}</span>}
          {state.confidence && (
            <span className="ml-auto">confidence: {state.confidence}</span>
          )}
        </footer>
      )}
    </article>
  );
}

function statusLabel(status: SpeakerStatus): string {
  switch (status) {
    case "speaking":
      return "speaking";
    case "spoken":
      return "has spoken";
    default:
      return "waiting";
  }
}

function StatusPip({
  status,
  inMajority,
}: {
  status: SpeakerStatus;
  inMajority: boolean | null;
}) {
  if (inMajority !== null) {
    return (
      <span
        className={`rounded px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wide ${
          inMajority
            ? "bg-chamber-gold/15 text-chamber-gold"
            : "border border-chamber-line text-chamber-muted"
        }`}
      >
        {inMajority ? "majority" : "dissent"}
      </span>
    );
  }
  return (
    <span className="font-mono text-[10px] uppercase tracking-wide text-chamber-faint">
      {statusLabel(status)}
    </span>
  );
}
