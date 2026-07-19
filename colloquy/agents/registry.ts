import { AgentPersonaSchema, type AgentPersona, toMeta } from "./types";
import { wesleyHuff } from "./personas/wesley-huff";
import { augustine } from "./personas/augustine";
import { calvin } from "./personas/calvin";
import { bonhoeffer } from "./personas/bonhoeffer";
import { geisler } from "./personas/geisler";

/**
 * Data-driven roster. To add or swap a persona, create a file under
 * agents/personas/ and list it here — no orchestrator changes needed.
 */
const PANEL: AgentPersona[] = [wesleyHuff, augustine, calvin, bonhoeffer, geisler];

export function getPanel(): AgentPersona[] {
  const seen = new Set<string>();
  for (const persona of PANEL) {
    AgentPersonaSchema.parse(persona);
    if (seen.has(persona.id)) {
      throw new Error(`Duplicate agent id in registry: ${persona.id}`);
    }
    seen.add(persona.id);
  }
  return PANEL;
}

export function getPanelMeta() {
  return getPanel().map(toMeta);
}

export function getPersona(id: string): AgentPersona {
  const persona = getPanel().find((p) => p.id === id);
  if (!persona) throw new Error(`Unknown agent id: ${id}`);
  return persona;
}
