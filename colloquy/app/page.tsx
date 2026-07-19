"use client";

import { useCallback, useRef, useState } from "react";
import type { ColloquyEvent } from "../schemas/events";
import { MODERATOR_ID } from "../schemas/events";
import type { AgentMeta, RunStatus } from "../schemas/run";
import type { ModeratorRuling } from "../schemas/moderator";
import type { Verdict } from "../schemas/verdict";
import { extractPartialStringField } from "../lib/partial-json";
import { TopicEditor } from "../components/TopicEditor";
import { AgentCard, type AgentCardState } from "../components/AgentCard";
import {
  ConsensusBanner,
  ModeratorDeliberating,
} from "../components/ConsensusBanner";
import { VerdictPanel } from "../components/VerdictPanel";
import { Transcript, type TranscriptEntry } from "../components/Transcript";

const DEFAULT_TOPIC =
  "Is it ever righteous to lie? Weigh Rahab (Joshua 2) and the Hebrew midwives (Exodus 1:15-21).";

type UiStatus = "idle" | "running" | RunStatus;

const emptyCard = (): AgentCardState => ({
  status: "waiting",
  liveText: "",
  position: null,
  moved: false,
  movedReason: null,
  stanceTag: null,
  confidence: null,
  inMajority: null,
});

export default function Page() {
  const [topic, setTopic] = useState(DEFAULT_TOPIC);
  const [maxRounds, setMaxRounds] = useState(4);
  const [status, setStatus] = useState<UiStatus>("idle");
  const [phaseLabel, setPhaseLabel] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentMeta[]>([]);
  const [cards, setCards] = useState<Record<string, AgentCardState>>({});
  const [ruling, setRuling] = useState<{
    ruling: ModeratorRuling;
    qualifies: boolean;
  } | null>(null);
  const [moderatorLive, setModeratorLive] = useState<string | null>(null);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const rawBuffers = useRef<Record<string, string>>({});

  const patchCard = useCallback(
    (id: string, patch: Partial<AgentCardState>) => {
      setCards((prev) => ({
        ...prev,
        [id]: { ...(prev[id] ?? emptyCard()), ...patch },
      }));
    },
    [],
  );

  const handleEvent = useCallback(
    (event: ColloquyEvent) => {
      switch (event.type) {
        case "run_started":
          setAgents(event.agents);
          setCards(
            Object.fromEntries(event.agents.map((a) => [a.id, emptyCard()])),
          );
          break;
        case "phase_started":
          setPhaseLabel(phaseTitle(event.phase, event.round));
          if (event.phase === "moderation") setModeratorLive("");
          break;
        case "speaker_started":
          rawBuffers.current[event.speakerId] = "";
          if (event.speakerId === MODERATOR_ID) {
            setModeratorLive("");
          } else if (event.phase === "analysis" || event.phase === "debate") {
            patchCard(event.speakerId, { status: "speaking", liveText: "" });
          }
          break;
        case "token": {
          const buf = (rawBuffers.current[event.speakerId] ?? "") + event.text;
          rawBuffers.current[event.speakerId] = buf;
          if (event.speakerId === MODERATOR_ID) {
            setModeratorLive(
              extractPartialStringField(buf, "compatibilityRationale"),
            );
          } else {
            const live =
              extractPartialStringField(buf, "reasoning") ||
              extractPartialStringField(buf, "position");
            patchCard(event.speakerId, { liveText: live });
          }
          break;
        }
        case "analysis_completed":
          patchCard(event.analysis.agentId, {
            status: "spoken",
            liveText: "",
            position: event.analysis.position,
            moved: false,
            movedReason: null,
            stanceTag: event.analysis.stanceTag,
            confidence: event.analysis.confidence,
          });
          setEntries((prev) => [...prev, { kind: "analysis", analysis: event.analysis }]);
          break;
        case "turn_completed":
          patchCard(event.turn.agentId, {
            status: "spoken",
            liveText: "",
            position: event.turn.position,
            moved: event.turn.moved,
            movedReason: event.turn.movedReason,
            stanceTag: event.turn.stanceTag,
            confidence: event.turn.confidence,
          });
          setEntries((prev) => [...prev, { kind: "turn", turn: event.turn }]);
          break;
        case "moderator_ruling":
          setModeratorLive(null);
          setRuling({ ruling: event.ruling, qualifies: event.qualifies });
          setEntries((prev) => [
            ...prev,
            { kind: "ruling", ruling: event.ruling, qualifies: event.qualifies },
          ]);
          setCards((prev) => {
            const next = { ...prev };
            for (const id of Object.keys(next)) {
              next[id] = {
                ...next[id],
                inMajority: event.ruling.majorityAgentIds.includes(id),
              };
            }
            return next;
          });
          break;
        case "verdict":
          setVerdict(event.verdict);
          break;
        case "run_completed":
          setStatus(event.status);
          setPhaseLabel(null);
          setModeratorLive(null);
          break;
        case "error":
          setError(event.message);
          break;
      }
    },
    [patchCard],
  );

  const convene = useCallback(async () => {
    setStatus("running");
    setError(null);
    setVerdict(null);
    setRuling(null);
    setEntries([]);
    setModeratorLive(null);
    setPhaseLabel("Convening…");
    rawBuffers.current = {};

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/colloquy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim(), maxRounds }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? `Request failed (${res.status})`);
      }
      if (!res.body) throw new Error("The server returned no stream.");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sep;
        while ((sep = buffer.indexOf("\n\n")) !== -1) {
          const frame = buffer.slice(0, sep);
          buffer = buffer.slice(sep + 2);
          for (const line of frame.split("\n")) {
            if (line.startsWith("data: ")) {
              try {
                handleEvent(JSON.parse(line.slice(6)) as ColloquyEvent);
              } catch {
                // Malformed frame — skip rather than kill the session.
              }
            }
          }
        }
      }
      setStatus((s) => (s === "running" ? "completed" : s));
    } catch (err) {
      if (controller.signal.aborted) {
        setStatus("adjourned");
        setPhaseLabel(null);
      } else {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Unknown error");
        setPhaseLabel(null);
      }
    } finally {
      abortRef.current = null;
    }
  }, [topic, maxRounds, handleEvent]);

  const adjourn = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const running = status === "running";

  return (
    <div className="space-y-5">
      <TopicEditor
        topic={topic}
        maxRounds={maxRounds}
        running={running}
        onTopicChange={setTopic}
        onMaxRoundsChange={setMaxRounds}
        onConvene={convene}
        onAdjourn={adjourn}
      />

      {(phaseLabel || status !== "idle") && (
        <p aria-live="polite" className="font-mono text-xs uppercase tracking-widest text-chamber-muted">
          {phaseLabel ??
            (status === "completed"
              ? "The colloquy has concluded."
              : status === "adjourned"
                ? "Adjourned early — partial record preserved."
                : status === "error"
                  ? "Session ended with an error."
                  : "")}
        </p>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-400/50 bg-red-950/30 p-4 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      {agents.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((meta) => (
            <AgentCard key={meta.id} meta={meta} state={cards[meta.id] ?? emptyCard()} />
          ))}
        </div>
      )}

      {moderatorLive !== null && ruling === null && (
        <ModeratorDeliberating liveText={moderatorLive} />
      )}
      {ruling && (
        <ConsensusBanner
          ruling={ruling.ruling}
          qualifies={ruling.qualifies}
          agents={agents}
          moderatorLive={moderatorLive}
        />
      )}

      {verdict && <VerdictPanel verdict={verdict} agents={agents} />}

      <Transcript entries={entries} agents={agents} />
    </div>
  );
}

function phaseTitle(
  phase: "analysis" | "debate" | "moderation" | "verdict",
  round: number | null,
): string {
  switch (phase) {
    case "analysis":
      return "Phase 1 · Independent analysis";
    case "debate":
      return `Phase 2 · Debate round ${round}`;
    case "moderation":
      return `Moderator check · round ${round}`;
    case "verdict":
      return "Recording the verdict";
  }
}
