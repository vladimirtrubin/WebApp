import { describe, expect, it } from "vitest";
import { getPanel } from "../agents/registry";
import { runColloquy } from "../lib/orchestrator";
import type { StructuredGenerate, StructuredCallOptions } from "../lib/structured";
import type { StorageAdapter } from "../lib/storage";
import type { ColloquyEvent } from "../schemas/events";
import type { Run } from "../schemas/run";

/**
 * Orchestrator flow tests with a mocked model — no live API calls.
 * The fake `generate` returns canned, schema-valid objects per phase.
 */

class MemoryStorage implements StorageAdapter {
  saves: Run[] = [];
  async saveRun(run: Run): Promise<void> {
    this.saves.push(structuredClone(run));
  }
  async getRun(): Promise<Run | null> {
    return null;
  }
  async listRunIds(): Promise<string[]> {
    return [];
  }
}

const PANEL = getPanel();
const IDS = PANEL.map((p) => p.id);

function fakeGenerate({
  majorityInRound,
}: {
  /** Round in which the moderator finds a qualifying majority (Infinity = never). */
  majorityInRound: number;
}): StructuredGenerate {
  return async <T>(opts: StructuredCallOptions<T>): Promise<T> => {
    opts.onToken?.('{"streamed":');
    opts.onToken?.("true}");
    switch (opts.schemaName) {
      case "analysis": {
        return {
          agentId: "filled-by-orchestrator",
          position: "Initial position.",
          reasoning: "Initial reasoning.",
          scriptureRefs: [
            { citation: "Joshua 2:4-6", point: "The narrative.", narratorStance: "reports" },
          ],
          stanceTag: "other",
          confidence: "medium",
        } as T;
      }
      case "debate_turn": {
        return {
          agentId: "filled-by-orchestrator",
          round: 0,
          position: "Round position.",
          moved: false,
          movedReason: null,
          respondsTo: [],
          reasoning: "Round reasoning.",
          scriptureRefs: [
            { citation: "Hebrews 11:31", point: "Faith commended.", narratorStance: "commends" },
          ],
          stanceTag: "other",
          confidence: "medium",
        } as T;
      }
      case "moderator_ruling": {
        // Infer the round from the prompt marker the orchestrator passes.
        const match = /Rule on round (\d+)/.exec(
          String(opts.messages[0]?.content ?? ""),
        );
        const round = match ? Number(match[1]) : 1;
        const reached = round >= majorityInRound;
        return {
          round,
          agentCount: IDS.length,
          majorityThreshold: 3,
          majorityAgentIds: reached ? IDS.slice(0, 3) : IDS.slice(0, 2),
          compatibilityRationale: "Canned rationale.",
          scriptureGrounded: reached,
          dissentingAgentIds: reached ? IDS.slice(3) : IDS.slice(2),
          majorityReached: reached,
          continueDebate: !reached,
        } as T;
      }
      case "verdict": {
        return {
          topic: "test topic",
          outcome: "qualified_majority",
          headline: "Canned headline.",
          consensus: null,
          majority: { agentIds: IDS.slice(0, 3), statement: "Majority statement." },
          dissent: { agentIds: IDS.slice(3), statement: "Dissent statement." },
          scriptureFoundation: [{ citation: "Hebrews 11:31", role: "Decisive." }],
          deadlockBreaker: null,
          roundsUsed: 1,
        } as T;
      }
      default:
        throw new Error(`Unexpected schemaName: ${opts.schemaName}`);
    }
  };
}

async function drive({
  majorityInRound,
  maxRounds,
  signal,
}: {
  majorityInRound: number;
  maxRounds: number;
  signal?: AbortSignal;
}) {
  const events: ColloquyEvent[] = [];
  const storage = new MemoryStorage();
  const run = await runColloquy(
    { topic: "test topic", maxRounds, signal },
    {
      generate: fakeGenerate({ majorityInRound }),
      storage,
      panel: PANEL,
      emit: (e) => events.push(e),
      model: "test-model",
      newId: () => "run_test",
      now: () => new Date("2026-07-19T00:00:00Z"),
    },
  );
  return { run, events, storage };
}

describe("runColloquy", () => {
  it("exits the debate loop the moment a qualifying majority forms", async () => {
    const { run, events } = await drive({ majorityInRound: 2, maxRounds: 4 });

    expect(run.status).toBe("completed");
    expect(run.rounds).toHaveLength(2); // rounds 3 and 4 never happen
    expect(run.rounds[1].ruling?.majorityReached).toBe(true);
    expect(run.verdict?.outcome).toBe("qualified_majority");

    const rulings = events.filter((e) => e.type === "moderator_ruling");
    expect(rulings).toHaveLength(2);
    expect(rulings[1]).toMatchObject({ qualifies: true });
  });

  it("runs all rounds and still records a verdict when no majority forms", async () => {
    const { run, events } = await drive({
      majorityInRound: Number.POSITIVE_INFINITY,
      maxRounds: 3,
    });

    expect(run.status).toBe("completed");
    expect(run.rounds).toHaveLength(3);
    expect(run.rounds.every((r) => r.ruling?.majorityReached === false)).toBe(true);
    expect(run.verdict).not.toBeNull();
    expect(events.at(-1)).toMatchObject({
      type: "run_completed",
      status: "completed",
    });
  });

  it("collects one analysis and one turn per agent per round, normalized to panel ids", async () => {
    const { run } = await drive({ majorityInRound: 1, maxRounds: 4 });

    expect(run.analyses.map((a) => a.agentId)).toEqual(IDS);
    expect(run.rounds).toHaveLength(1);
    expect(run.rounds[0].turns.map((t) => t.agentId)).toEqual(IDS);
    expect(run.rounds[0].turns.every((t) => t.round === 1)).toBe(true);
  });

  it("persists after every phase and finishes with a valid saved run", async () => {
    const { storage } = await drive({ majorityInRound: 1, maxRounds: 4 });
    expect(storage.saves.length).toBeGreaterThanOrEqual(3);
    expect(storage.saves.at(-1)?.status).toBe("completed");
    expect(storage.saves.at(-1)?.verdict).not.toBeNull();
  });

  it("adjourns cleanly when the signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();
    const { run, events } = await drive({
      majorityInRound: 1,
      maxRounds: 4,
      signal: controller.signal,
    });

    expect(run.status).toBe("adjourned");
    expect(events.at(-1)).toMatchObject({
      type: "run_completed",
      status: "adjourned",
    });
  });

  it("streams token events tagged with the speaker id", async () => {
    const { events } = await drive({ majorityInRound: 1, maxRounds: 4 });
    const tokens = events.filter((e) => e.type === "token");
    expect(tokens.length).toBeGreaterThan(0);
    const speakerIds = new Set(tokens.map((t) => t.speakerId));
    for (const id of IDS) expect(speakerIds.has(id)).toBe(true);
  });
});
