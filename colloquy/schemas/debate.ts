import { z } from "zod";
import {
  ConfidenceSchema,
  ScriptureRefSchema,
  StanceTagSchema,
} from "./analysis";

/** Phase 2 — one debate turn, spoken in view of the other agents and the transcript. */
export const DebateTurnSchema = z
  .object({
    agentId: z.string().min(1),
    round: z.number().int().min(1),
    position: z.string().min(1).describe("Current position — possibly revised this round"),
    moved: z
      .boolean()
      .describe("True if the position substantively changed from the previous turn"),
    movedReason: z
      .string()
      .nullable()
      .describe("Why the position changed; null when moved is false"),
    respondsTo: z
      .array(z.string())
      .describe("agentIds this turn directly engages with"),
    reasoning: z.string().min(1),
    scriptureRefs: z.array(ScriptureRefSchema).min(1),
    stanceTag: StanceTagSchema,
    confidence: ConfidenceSchema,
  })
  .strict()
  .refine((t) => !t.moved || (t.movedReason !== null && t.movedReason.length > 0), {
    message: "movedReason is required when moved is true",
    path: ["movedReason"],
  })
  .refine((t) => t.moved || t.movedReason === null, {
    message: "movedReason must be null when moved is false",
    path: ["movedReason"],
  });
export type DebateTurn = z.infer<typeof DebateTurnSchema>;
