import { z } from "zod";

const MajorityBlockSchema = z
  .object({
    agentIds: z.array(z.string()).min(1),
    statement: z.string().min(1),
  })
  .strict();

/** Phase 4 — the recording secretary's official result. */
export const VerdictSchema = z
  .object({
    topic: z.string().min(1),
    outcome: z.enum(["consensus", "qualified_majority", "dissensus"]),
    headline: z.string().min(1).describe("One-line official result"),
    consensus: z
      .string()
      .nullable()
      .describe("Ground shared by all agents, if any"),
    majority: MajorityBlockSchema.nullable(),
    dissent: MajorityBlockSchema.nullable().describe(
      "A fair statement of the minority view, in its strongest form",
    ),
    scriptureFoundation: z
      .array(
        z
          .object({
            citation: z.string().min(1),
            role: z.string().min(1).describe("What this passage contributes to the result"),
          })
          .strict(),
      )
      .min(1),
    deadlockBreaker: z
      .string()
      .nullable()
      .describe("What evidence would break the deadlock — required when outcome is dissensus"),
    roundsUsed: z.number().int().min(0),
  })
  .strict()
  .refine((v) => v.outcome !== "dissensus" || v.deadlockBreaker !== null, {
    message: "deadlockBreaker is required when outcome is dissensus",
    path: ["deadlockBreaker"],
  })
  .refine((v) => v.outcome !== "qualified_majority" || v.majority !== null, {
    message: "majority is required when outcome is qualified_majority",
    path: ["majority"],
  });
export type Verdict = z.infer<typeof VerdictSchema>;
