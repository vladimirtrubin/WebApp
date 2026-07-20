import { describe, expect, it } from "vitest";
import {
  isQualifyingMajority,
  majorityThreshold,
  shouldContinue,
} from "../lib/consensus";
import type { ModeratorRuling } from "../schemas/moderator";

const PANEL = ["huff", "augustine", "calvin", "bonhoeffer", "geisler"] as const;

function ruling(overrides: Partial<ModeratorRuling> = {}): ModeratorRuling {
  return {
    round: 1,
    agentCount: 5,
    majorityThreshold: 3,
    majorityAgentIds: ["huff", "calvin", "geisler"],
    compatibilityRationale: "Compatible conclusions on the decisive question.",
    scriptureGrounded: true,
    dissentingAgentIds: ["augustine", "bonhoeffer"],
    majorityReached: true,
    continueDebate: false,
    ...overrides,
  };
}

describe("majorityThreshold", () => {
  it("is ceil(n/2): 3 of 5 on the default panel", () => {
    expect(majorityThreshold(5)).toBe(3);
  });

  it.each([
    [2, 1],
    [3, 2],
    [4, 2],
    [6, 3],
    [7, 4],
  ])("n=%i → %i", (n, expected) => {
    expect(majorityThreshold(n)).toBe(expected);
  });

  it("rejects invalid panel sizes", () => {
    expect(() => majorityThreshold(1)).toThrow();
    expect(() => majorityThreshold(2.5)).toThrow();
  });
});

describe("isQualifyingMajority", () => {
  it("qualifies with 3 of 5, scripture-grounded, moderator-affirmed", () => {
    expect(isQualifyingMajority(ruling(), PANEL)).toBe(true);
  });

  it("fails below the threshold even if the moderator claims majority", () => {
    expect(
      isQualifyingMajority(
        ruling({ majorityAgentIds: ["huff", "calvin"] }),
        PANEL,
      ),
    ).toBe(false);
  });

  it("fails when the shared conclusion is not scripture-grounded", () => {
    expect(isQualifyingMajority(ruling({ scriptureGrounded: false }), PANEL)).toBe(
      false,
    );
  });

  it("fails when the moderator itself does not affirm the majority", () => {
    expect(isQualifyingMajority(ruling({ majorityReached: false }), PANEL)).toBe(
      false,
    );
  });

  it("rejects ids that are not on the panel", () => {
    expect(
      isQualifyingMajority(
        ruling({ majorityAgentIds: ["huff", "calvin", "aquinas"] }),
        PANEL,
      ),
    ).toBe(false);
  });

  it("rejects a cluster padded with duplicate ids", () => {
    expect(
      isQualifyingMajority(
        ruling({ majorityAgentIds: ["huff", "huff", "calvin"] }),
        PANEL,
      ),
    ).toBe(false);
  });

  it("a full-panel consensus qualifies", () => {
    expect(
      isQualifyingMajority(ruling({ majorityAgentIds: [...PANEL] }), PANEL),
    ).toBe(true);
  });
});

describe("shouldContinue", () => {
  it("stops immediately when a qualifying majority exists", () => {
    expect(shouldContinue(ruling(), PANEL, 1, 4)).toBe(false);
  });

  it("continues when no majority and rounds remain", () => {
    expect(
      shouldContinue(ruling({ majorityReached: false }), PANEL, 1, 4),
    ).toBe(true);
  });

  it("stops when rounds are exhausted even without a majority", () => {
    expect(
      shouldContinue(ruling({ majorityReached: false }), PANEL, 4, 4),
    ).toBe(false);
  });
});
