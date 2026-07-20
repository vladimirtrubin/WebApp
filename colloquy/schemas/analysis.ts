import { z } from "zod";

/** Shared enum: does the biblical narrator commend, merely report, or condemn the act? */
export const NarratorStanceSchema = z.enum([
  "commends",
  "reports",
  "condemns",
  "unclear",
]);
export type NarratorStance = z.infer<typeof NarratorStanceSchema>;

export const ScriptureRefSchema = z
  .object({
    citation: z.string().min(1).describe('Specific reference, e.g. "Joshua 2:4-6"'),
    point: z.string().min(1).describe("What this passage establishes for the argument"),
    narratorStance: NarratorStanceSchema.describe(
      "Whether the narrator commends the act, merely reports it, condemns it, or is unclear",
    ),
  })
  .strict();
export type ScriptureRef = z.infer<typeof ScriptureRefSchema>;

/** Coarse stance tag — used for display only; the moderator judges reasoning, not tags. */
export const StanceTagSchema = z.enum([
  "lie_always_sin",
  "lie_pardoned_fault",
  "lie_justified",
  "no_conflict",
  "other",
]);
export type StanceTag = z.infer<typeof StanceTagSchema>;

export const ConfidenceSchema = z.enum(["low", "medium", "high"]);
export type Confidence = z.infer<typeof ConfidenceSchema>;

/** Phase 1 — independent analysis, produced by each agent without seeing the others. */
export const AnalysisSchema = z
  .object({
    agentId: z.string().min(1),
    position: z.string().min(1).describe("The stance, stated in at most two sentences"),
    reasoning: z.string().min(1).describe("The full argument, in character"),
    scriptureRefs: z.array(ScriptureRefSchema).min(1),
    stanceTag: StanceTagSchema,
    confidence: ConfidenceSchema,
  })
  .strict();
export type Analysis = z.infer<typeof AnalysisSchema>;
