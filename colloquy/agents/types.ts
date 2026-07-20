import { z } from "zod";
import { AgentMetaSchema, type AgentMeta } from "../schemas/run";

export const AgentPersonaSchema = AgentMetaSchema.extend({
  /** Persona-specific system prompt fragment; combined with the shared protocol. */
  systemPrompt: z.string().min(1),
}).strict();

export type AgentPersona = z.infer<typeof AgentPersonaSchema>;

export function toMeta(persona: AgentPersona): AgentMeta {
  const { systemPrompt: _prompt, ...meta } = persona;
  return meta;
}
