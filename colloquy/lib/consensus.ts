import type { ModeratorRuling } from "../schemas/moderator";

/**
 * Consensus rule: a qualifying majority is a cluster of at least ⌈n/2⌉ agents
 * (3 of 5 on the default panel) holding substantively compatible,
 * scripture-grounded conclusions. The moderator judges compatibility; this
 * module owns the arithmetic and re-verifies the moderator's self-report.
 */
export function majorityThreshold(agentCount: number): number {
  if (!Number.isInteger(agentCount) || agentCount < 2) {
    throw new Error(`agentCount must be an integer >= 2, got ${agentCount}`);
  }
  return Math.ceil(agentCount / 2);
}

/**
 * Trust-but-verify: the ruling only qualifies if
 *  - every cited agent id is on the panel and unique,
 *  - the cluster meets the ⌈n/2⌉ threshold,
 *  - the moderator judged the shared conclusion scripture-grounded,
 *  - and the moderator itself asserts a majority was reached.
 */
export function isQualifyingMajority(
  ruling: ModeratorRuling,
  panelIds: readonly string[],
): boolean {
  const unique = new Set(ruling.majorityAgentIds);
  if (unique.size !== ruling.majorityAgentIds.length) return false;
  if (!ruling.majorityAgentIds.every((id) => panelIds.includes(id))) return false;
  return (
    ruling.majorityReached &&
    ruling.scriptureGrounded &&
    unique.size >= majorityThreshold(panelIds.length)
  );
}

/** The debate continues only while rounds remain and no qualifying majority exists. */
export function shouldContinue(
  ruling: ModeratorRuling,
  panelIds: readonly string[],
  round: number,
  maxRounds: number,
): boolean {
  if (isQualifyingMajority(ruling, panelIds)) return false;
  return round < maxRounds;
}
