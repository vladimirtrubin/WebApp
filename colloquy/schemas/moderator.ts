import { z } from "zod";

/**
 * Phase 3 — neutral moderator ruling after each round.
 * The moderator clusters agents whose conclusions are substantively compatible
 * (judged on reasoning, not matching enum tags) and checks scripture grounding.
 * The orchestrator re-verifies the arithmetic server-side (see lib/consensus.ts).
 */
export const ModeratorRulingSchema = z
  .object({
    round: z.number().int().min(1),
    agentCount: z.number().int().min(2),
    majorityThreshold: z
      .number()
      .int()
      .min(2)
      .describe("Minimum cluster size for a qualifying majority: ceil(agentCount / 2)"),
    majorityAgentIds: z
      .array(z.string())
      .describe("The largest cluster of agents holding substantively compatible conclusions"),
    compatibilityRationale: z
      .string()
      .min(1)
      .describe("Why these positions are substantively compatible — reasoning, not tags"),
    scriptureGrounded: z
      .boolean()
      .describe("Whether the shared conclusion is actually grounded in the scripture cited"),
    dissentingAgentIds: z.array(z.string()),
    majorityReached: z
      .boolean()
      .describe("True only if the cluster meets the threshold AND is scripture-grounded"),
    continueDebate: z.boolean(),
  })
  .strict();
export type ModeratorRuling = z.infer<typeof ModeratorRulingSchema>;
