import { z } from "zod";
import { AnalysisSchema } from "./analysis";
import { DebateTurnSchema } from "./debate";
import { ModeratorRulingSchema } from "./moderator";
import { VerdictSchema } from "./verdict";

export const AgentMetaSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    era: z.string().min(1),
    school: z.string().min(1),
    accentColor: z.string().min(1),
    isLiving: z.boolean(),
  })
  .strict();
export type AgentMeta = z.infer<typeof AgentMetaSchema>;

export const RoundSchema = z
  .object({
    round: z.number().int().min(1),
    turns: z.array(DebateTurnSchema),
    ruling: ModeratorRulingSchema.nullable(),
  })
  .strict();
export type Round = z.infer<typeof RoundSchema>;

export const RunStatusSchema = z.enum(["running", "completed", "adjourned", "error"]);
export type RunStatus = z.infer<typeof RunStatusSchema>;

/** The persisted transcript envelope — one JSON file per run under ./runs/. */
export const RunSchema = z
  .object({
    id: z.string().min(1),
    topic: z.string().min(1),
    model: z.string().min(1),
    createdAt: z.string().min(1),
    status: RunStatusSchema,
    maxRounds: z.number().int().min(1),
    agents: z.array(AgentMetaSchema).min(2),
    analyses: z.array(AnalysisSchema),
    rounds: z.array(RoundSchema),
    verdict: VerdictSchema.nullable(),
    error: z.string().nullable(),
  })
  .strict();
export type Run = z.infer<typeof RunSchema>;
