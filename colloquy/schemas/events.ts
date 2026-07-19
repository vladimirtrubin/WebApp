import type { Analysis } from "./analysis";
import type { DebateTurn } from "./debate";
import type { ModeratorRuling } from "./moderator";
import type { Verdict } from "./verdict";
import type { AgentMeta, RunStatus } from "./run";

/**
 * Typed SSE contract between the orchestrator and the client.
 * Every server-sent event is one of these, serialized as JSON on a `data:` line.
 */
export type Phase = "analysis" | "debate" | "moderation" | "verdict";

/** Non-panel speakers use reserved speaker ids. */
export const MODERATOR_ID = "__moderator__";
export const SECRETARY_ID = "__secretary__";

export type ColloquyEvent =
  | {
      type: "run_started";
      runId: string;
      topic: string;
      model: string;
      maxRounds: number;
      agents: AgentMeta[];
    }
  | { type: "phase_started"; phase: Phase; round: number | null }
  | { type: "speaker_started"; phase: Phase; speakerId: string; round: number | null }
  | { type: "token"; speakerId: string; text: string }
  | { type: "analysis_completed"; analysis: Analysis }
  | { type: "turn_completed"; turn: DebateTurn }
  | { type: "moderator_ruling"; ruling: ModeratorRuling; qualifies: boolean }
  | { type: "verdict"; verdict: Verdict }
  | { type: "run_completed"; runId: string; status: RunStatus }
  | { type: "error"; message: string; speakerId: string | null };
