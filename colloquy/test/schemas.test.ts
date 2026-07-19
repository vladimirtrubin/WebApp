import { describe, expect, it } from "vitest";
import { AnalysisSchema } from "../schemas/analysis";
import { DebateTurnSchema } from "../schemas/debate";
import { ModeratorRulingSchema } from "../schemas/moderator";
import { VerdictSchema } from "../schemas/verdict";
import { RunSchema } from "../schemas/run";

const validRef = {
  citation: "Joshua 2:4-6",
  point: "Rahab hides the spies and misdirects the king's men.",
  narratorStance: "reports",
};

const validAnalysis = {
  agentId: "augustine",
  position: "Every lie is sin; Rahab was rewarded for her faith, not her lie.",
  reasoning: "De Mendacio argues that speech against the mind is always sinful…",
  scriptureRefs: [validRef],
  stanceTag: "lie_always_sin",
  confidence: "high",
};

describe("AnalysisSchema", () => {
  it("accepts a valid analysis", () => {
    expect(AnalysisSchema.parse(validAnalysis)).toEqual(validAnalysis);
  });

  it("requires at least one scripture reference", () => {
    expect(() =>
      AnalysisSchema.parse({ ...validAnalysis, scriptureRefs: [] }),
    ).toThrow();
  });

  it("rejects unknown stance tags and narrator stances", () => {
    expect(() =>
      AnalysisSchema.parse({ ...validAnalysis, stanceTag: "maybe" }),
    ).toThrow();
    expect(() =>
      AnalysisSchema.parse({
        ...validAnalysis,
        scriptureRefs: [{ ...validRef, narratorStance: "endorses" }],
      }),
    ).toThrow();
  });

  it("rejects extra keys (strict)", () => {
    expect(() =>
      AnalysisSchema.parse({ ...validAnalysis, mood: "confident" }),
    ).toThrow();
  });
});

const validTurn = {
  agentId: "calvin",
  round: 2,
  position: "The act of faith is praised; the lie itself is a pardoned fault.",
  moved: false,
  movedReason: null,
  respondsTo: ["geisler"],
  reasoning: "Commentary on Joshua 2 distinguishes the deed from the deceit…",
  scriptureRefs: [validRef],
  stanceTag: "lie_pardoned_fault",
  confidence: "medium",
};

describe("DebateTurnSchema", () => {
  it("accepts a valid unmoved turn", () => {
    expect(DebateTurnSchema.parse(validTurn)).toEqual(validTurn);
  });

  it("requires movedReason when moved is true", () => {
    expect(() =>
      DebateTurnSchema.parse({ ...validTurn, moved: true, movedReason: null }),
    ).toThrow();
    expect(() =>
      DebateTurnSchema.parse({ ...validTurn, moved: true, movedReason: "" }),
    ).toThrow();
  });

  it("accepts a moved turn with a reason", () => {
    const moved = {
      ...validTurn,
      moved: true,
      movedReason: "Bonhoeffer's reading of the relational claim persuaded me.",
    };
    expect(DebateTurnSchema.parse(moved)).toEqual(moved);
  });

  it("requires movedReason to be null when not moved", () => {
    expect(() =>
      DebateTurnSchema.parse({ ...validTurn, movedReason: "stray reason" }),
    ).toThrow();
  });
});

const validRuling = {
  round: 1,
  agentCount: 5,
  majorityThreshold: 3,
  majorityAgentIds: ["huff", "calvin", "geisler"],
  compatibilityRationale: "Three agents agree the act as a whole was faithful.",
  scriptureGrounded: true,
  dissentingAgentIds: ["augustine", "bonhoeffer"],
  majorityReached: true,
  continueDebate: false,
};

describe("ModeratorRulingSchema", () => {
  it("accepts a valid ruling", () => {
    expect(ModeratorRulingSchema.parse(validRuling)).toEqual(validRuling);
  });

  it("rejects missing rationale", () => {
    expect(() =>
      ModeratorRulingSchema.parse({ ...validRuling, compatibilityRationale: "" }),
    ).toThrow();
  });
});

const validVerdict = {
  topic: "Is it ever righteous to lie?",
  outcome: "qualified_majority",
  headline: "A majority holds Rahab's deception was not counted against her.",
  consensus: "All agree her faith is commended in Hebrews 11:31.",
  majority: {
    agentIds: ["huff", "calvin", "geisler"],
    statement: "The deception belongs to the act of faith God rewarded.",
  },
  dissent: {
    agentIds: ["augustine", "bonhoeffer"],
    statement: "The lie remains sin, however pardonable; truth admits no exception.",
  },
  scriptureFoundation: [
    { citation: "Hebrews 11:31", role: "Commends Rahab's faith explicitly." },
  ],
  deadlockBreaker: null,
  roundsUsed: 2,
};

describe("VerdictSchema", () => {
  it("accepts a valid qualified-majority verdict", () => {
    expect(VerdictSchema.parse(validVerdict)).toEqual(validVerdict);
  });

  it("requires deadlockBreaker for dissensus", () => {
    expect(() =>
      VerdictSchema.parse({
        ...validVerdict,
        outcome: "dissensus",
        deadlockBreaker: null,
      }),
    ).toThrow();
    expect(
      VerdictSchema.parse({
        ...validVerdict,
        outcome: "dissensus",
        deadlockBreaker: "A demonstration that the absolutes do not conflict.",
      }).outcome,
    ).toBe("dissensus");
  });

  it("requires a majority block for qualified_majority", () => {
    expect(() =>
      VerdictSchema.parse({ ...validVerdict, majority: null }),
    ).toThrow();
  });
});

describe("RunSchema", () => {
  it("round-trips a full run envelope", () => {
    const run = {
      id: "run_test_1",
      topic: "Is it ever righteous to lie?",
      model: "claude-opus-4-8",
      createdAt: new Date("2026-07-19T00:00:00Z").toISOString(),
      status: "completed",
      maxRounds: 4,
      agents: [
        {
          id: "huff",
          name: "Wesley Huff",
          era: "Contemporary",
          school: "Evangelical apologetics",
          accentColor: "#2DB8A8",
          isLiving: true,
        },
        {
          id: "augustine",
          name: "Augustine of Hippo",
          era: "354–430",
          school: "Latin patristics",
          accentColor: "#D4A72C",
          isLiving: false,
        },
      ],
      analyses: [validAnalysis],
      rounds: [{ round: 1, turns: [{ ...validTurn, round: 1 }], ruling: validRuling }],
      verdict: validVerdict,
      error: null,
    };
    expect(RunSchema.parse(run)).toEqual(run);
  });

  it("rejects an unknown status", () => {
    expect(() =>
      RunSchema.parse({ ...({} as object), status: "paused" }),
    ).toThrow();
  });
});
