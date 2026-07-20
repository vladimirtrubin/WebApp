import type { AgentPersona } from "../agents/types";
import { toMeta } from "../agents/types";
import type { Analysis } from "../schemas/analysis";
import { AnalysisSchema } from "../schemas/analysis";
import type { DebateTurn } from "../schemas/debate";
import { DebateTurnSchema } from "../schemas/debate";
import type { ModeratorRuling } from "../schemas/moderator";
import { ModeratorRulingSchema } from "../schemas/moderator";
import type { Verdict } from "../schemas/verdict";
import { VerdictSchema } from "../schemas/verdict";
import type { Run, Round } from "../schemas/run";
import {
  MODERATOR_ID,
  SECRETARY_ID,
  type ColloquyEvent,
} from "../schemas/events";
import { AdjournedError, describeApiError, getModel } from "./anthropic";
import { isQualifyingMajority, shouldContinue } from "./consensus";
import type { StructuredGenerate } from "./structured";
import type { StorageAdapter } from "./storage";
import {
  analysisSystem,
  analysisUser,
  debateSystem,
  debateUser,
  moderatorSystem,
  moderatorUser,
  renderTranscript,
  secretarySystem,
  secretaryUser,
} from "./prompts";

export interface OrchestratorInput {
  topic: string;
  maxRounds: number;
  signal?: AbortSignal;
}

export interface OrchestratorDeps {
  /** Structured model call — injectable so tests never hit the live API. */
  generate: StructuredGenerate;
  storage: StorageAdapter;
  panel: AgentPersona[];
  emit: (event: ColloquyEvent) => void;
  model?: string;
  newId?: () => string;
  now?: () => Date;
}

function defaultId(): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `run_${Date.now().toString(36)}_${rand}`;
}

/**
 * The phase state machine:
 *   1. independent analysis (parallel)
 *   2. debate rounds (sequential turns), each followed by
 *   3. a moderator check — exiting early on a qualifying majority
 *   4. verdict by the recording secretary
 * Emits typed events as it goes and persists the run after every phase.
 */
export async function runColloquy(
  input: OrchestratorInput,
  deps: OrchestratorDeps,
): Promise<Run> {
  const { topic, maxRounds } = input;
  const { generate, storage, panel, emit } = deps;
  const model = deps.model ?? getModel();
  const now = deps.now ?? (() => new Date());
  const runId = (deps.newId ?? defaultId)();
  const panelIds = panel.map((p) => p.id);

  // Internal controller so one agent's fatal failure cancels its peers.
  const controller = new AbortController();
  const onOuterAbort = () => controller.abort();
  input.signal?.addEventListener("abort", onOuterAbort, { once: true });
  if (input.signal?.aborted) controller.abort();
  const signal = controller.signal;

  const run: Run = {
    id: runId,
    topic,
    model,
    createdAt: now().toISOString(),
    status: "running",
    maxRounds,
    agents: panel.map(toMeta),
    analyses: [],
    rounds: [],
    verdict: null,
    error: null,
  };

  const save = async () => {
    try {
      await storage.saveRun(run);
    } catch (err) {
      // Persistence must never kill a live debate; surface it as an event.
      emit({
        type: "error",
        message: `Failed to persist transcript: ${describeApiError(err)}`,
        speakerId: null,
      });
    }
  };

  const checkAdjourned = () => {
    if (signal.aborted) throw new AdjournedError();
  };

  try {
    emit({
      type: "run_started",
      runId,
      topic,
      model,
      maxRounds,
      agents: run.agents,
    });
    await save();

    // ── Phase 1: independent analysis (parallelizable by design) ──────────
    emit({ type: "phase_started", phase: "analysis", round: null });
    const analyses = await Promise.all(
      panel.map(async (persona): Promise<Analysis> => {
        emit({
          type: "speaker_started",
          phase: "analysis",
          speakerId: persona.id,
          round: null,
        });
        try {
          const raw = await generate({
            schema: AnalysisSchema,
            schemaName: "analysis",
            system: analysisSystem(persona),
            messages: [{ role: "user", content: analysisUser(persona, topic) }],
            signal,
            onToken: (text) => emit({ type: "token", speakerId: persona.id, text }),
          });
          // Normalize identity fields the model could plausibly mangle.
          const analysis: Analysis = { ...raw, agentId: persona.id };
          emit({ type: "analysis_completed", analysis });
          return analysis;
        } catch (err) {
          controller.abort(); // stop sibling streams
          throw err;
        }
      }),
    );
    run.analyses = analyses;
    await save();

    // ── Phases 2–3: debate rounds with a moderator check after each ───────
    let finalRuling: ModeratorRuling | null = null;
    for (let round = 1; round <= maxRounds; round++) {
      checkAdjourned();
      emit({ type: "phase_started", phase: "debate", round });

      const currentRound: Round = { round, turns: [], ruling: null };
      run.rounds.push(currentRound);

      for (const persona of panel) {
        checkAdjourned();
        emit({
          type: "speaker_started",
          phase: "debate",
          speakerId: persona.id,
          round,
        });
        const transcript = renderTranscript(topic, run.analyses, run.rounds, panel);
        const raw = await generate({
          schema: DebateTurnSchema,
          schemaName: "debate_turn",
          system: debateSystem(persona),
          messages: [
            {
              role: "user",
              content: debateUser(
                persona,
                topic,
                round,
                transcript,
                currentRound.turns,
                panel,
              ),
            },
          ],
          signal,
          onToken: (text) => emit({ type: "token", speakerId: persona.id, text }),
        });
        const turn: DebateTurn = { ...raw, agentId: persona.id, round };
        currentRound.turns.push(turn);
        emit({ type: "turn_completed", turn });
      }

      checkAdjourned();
      emit({ type: "phase_started", phase: "moderation", round });
      emit({
        type: "speaker_started",
        phase: "moderation",
        speakerId: MODERATOR_ID,
        round,
      });
      const transcript = renderTranscript(topic, run.analyses, run.rounds, panel);
      const ruling = await generate({
        schema: ModeratorRulingSchema,
        schemaName: "moderator_ruling",
        system: moderatorSystem(),
        messages: [
          { role: "user", content: moderatorUser(topic, round, transcript, panel) },
        ],
        signal,
        onToken: (text) => emit({ type: "token", speakerId: MODERATOR_ID, text }),
      });
      currentRound.ruling = ruling;
      finalRuling = ruling;
      const qualifies = isQualifyingMajority(ruling, panelIds);
      emit({ type: "moderator_ruling", ruling, qualifies });
      await save();

      if (!shouldContinue(ruling, panelIds, round, maxRounds)) break;
    }

    // ── Phase 4: verdict ──────────────────────────────────────────────────
    checkAdjourned();
    emit({ type: "phase_started", phase: "verdict", round: null });
    emit({
      type: "speaker_started",
      phase: "verdict",
      speakerId: SECRETARY_ID,
      round: null,
    });
    const transcript = renderTranscript(topic, run.analyses, run.rounds, panel);
    const verdict: Verdict = await generate({
      schema: VerdictSchema,
      schemaName: "verdict",
      system: secretarySystem(),
      messages: [
        {
          role: "user",
          content: secretaryUser(
            topic,
            transcript,
            finalRuling,
            run.rounds.length,
            panel,
          ),
        },
      ],
      signal,
      onToken: (text) => emit({ type: "token", speakerId: SECRETARY_ID, text }),
    });
    run.verdict = verdict;
    emit({ type: "verdict", verdict });

    run.status = "completed";
    await save();
    emit({ type: "run_completed", runId, status: "completed" });
    return run;
  } catch (err) {
    if (err instanceof AdjournedError || input.signal?.aborted) {
      run.status = "adjourned";
      await save();
      emit({ type: "run_completed", runId, status: "adjourned" });
      return run;
    }
    run.status = "error";
    run.error = describeApiError(err);
    await save();
    emit({ type: "error", message: run.error, speakerId: null });
    emit({ type: "run_completed", runId, status: "error" });
    return run;
  } finally {
    input.signal?.removeEventListener("abort", onOuterAbort);
  }
}
