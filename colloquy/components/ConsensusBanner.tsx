"use client";

import type { ModeratorRuling } from "../schemas/moderator";
import type { AgentMeta } from "../schemas/run";

export interface ConsensusBannerProps {
  ruling: ModeratorRuling;
  qualifies: boolean;
  agents: AgentMeta[];
  moderatorLive: string | null;
}

export function ConsensusBanner({
  ruling,
  qualifies,
  agents,
  moderatorLive,
}: ConsensusBannerProps) {
  const name = (id: string) => agents.find((a) => a.id === id)?.name ?? id;

  return (
    <section
      aria-live="polite"
      aria-label="Moderator ruling"
      className={`rounded-lg border p-4 ${
        qualifies
          ? "border-chamber-gold/60 bg-chamber-gold/10"
          : "border-chamber-line bg-chamber-surface"
      }`}
    >
      <p className="font-mono text-xs uppercase tracking-widest text-chamber-muted">
        Moderator · after round {ruling.round}
      </p>
      <p className="mt-1 text-sm font-semibold">
        {qualifies ? (
          <span className="text-chamber-gold">
            Qualifying majority: {ruling.majorityAgentIds.map(name).join(", ")}{" "}
            ({ruling.majorityAgentIds.length} of {ruling.agentCount})
          </span>
        ) : (
          <span>
            No qualifying majority yet — largest compatible cluster{" "}
            {ruling.majorityAgentIds.length} of {ruling.agentCount} (needs{" "}
            {ruling.majorityThreshold})
          </span>
        )}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-chamber-muted">
        {ruling.compatibilityRationale}
      </p>
      {!ruling.scriptureGrounded && (
        <p className="mt-1 text-xs text-chamber-muted">
          The moderator judged the cluster&rsquo;s shared conclusion not yet
          scripture-grounded.
        </p>
      )}
      {moderatorLive !== null && (
        <p className="caret mt-2 text-xs text-chamber-faint">{moderatorLive}</p>
      )}
    </section>
  );
}

export function ModeratorDeliberating({ liveText }: { liveText: string }) {
  return (
    <section
      aria-live="polite"
      className="rounded-lg border border-dashed border-chamber-line bg-chamber-surface p-4"
    >
      <p className="font-mono text-xs uppercase tracking-widest text-chamber-muted">
        Moderator deliberating…
      </p>
      <p className="caret mt-2 whitespace-pre-wrap break-words text-xs text-chamber-faint">
        {liveText || "Weighing the round"}
      </p>
    </section>
  );
}
