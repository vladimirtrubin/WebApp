import type { AgentPersona } from "../agents/types";
import type { Analysis } from "../schemas/analysis";
import type { DebateTurn } from "../schemas/debate";
import type { ModeratorRuling } from "../schemas/moderator";
import { majorityThreshold } from "./consensus";

/**
 * Prompt builders for the four phases. Pure string assembly — no I/O — so the
 * exact wording each speaker sees is inspectable and testable.
 */

const SHARED_PROTOCOL = [
  "You are a panelist in The Colloquy, a formal theological debate.",
  "Protocol, binding on every statement you make:",
  "- Stay fully in character; never break persona or mention being an AI.",
  "- Ground every substantive claim in specific scripture references",
  "  (book chapter:verse), and say what each passage establishes.",
  "- Distinguish explicitly between what a narrator COMMENDS and what the text",
  "  merely REPORTS; description is not prescription.",
  "- Engage the strongest form of opposing arguments, not caricatures.",
  "- Honest movement is a virtue: when another panelist's exegesis is stronger,",
  "  say so and shift your position accordingly. Never move for mere politeness.",
  "- Respond with ONLY the required JSON object. No markdown, no preamble.",
].join("\n");

export function analysisSystem(persona: AgentPersona): string {
  return `${persona.systemPrompt}\n\n${SHARED_PROTOCOL}`;
}

export function analysisUser(persona: AgentPersona, topic: string): string {
  return [
    `The question before the panel:\n\n"${topic}"`,
    "",
    "This is the INDEPENDENT ANALYSIS phase. You have not seen any other",
    "panelist's statement; give your own considered position from your documented",
    "methodology and convictions.",
    "",
    `Set "agentId" to "${persona.id}". State "position" in at most two sentences,`,
    'make the full case in "reasoning", and cite at least one specific passage in',
    '"scriptureRefs" with the narrator-stance judgment for each.',
  ].join("\n");
}

function renderAnalyses(analyses: Analysis[], byId: Map<string, AgentPersona>): string {
  return analyses
    .map((a) => {
      const name = byId.get(a.agentId)?.name ?? a.agentId;
      const refs = a.scriptureRefs
        .map((r) => `${r.citation} (${r.narratorStance}): ${r.point}`)
        .join("; ");
      return `${name} [${a.agentId}] — position: ${a.position}\nReasoning: ${a.reasoning}\nScripture: ${refs}`;
    })
    .join("\n\n");
}

function renderRoundTurns(turns: DebateTurn[], byId: Map<string, AgentPersona>): string {
  return turns
    .map((t) => {
      const name = byId.get(t.agentId)?.name ?? t.agentId;
      const moved = t.moved ? ` (MOVED: ${t.movedReason})` : "";
      const refs = t.scriptureRefs
        .map((r) => `${r.citation} (${r.narratorStance}): ${r.point}`)
        .join("; ");
      return `${name} [${t.agentId}] — position: ${t.position}${moved}\nReasoning: ${t.reasoning}\nScripture: ${refs}`;
    })
    .join("\n\n");
}

export function renderTranscript(
  topic: string,
  analyses: Analysis[],
  rounds: { round: number; turns: DebateTurn[]; ruling: ModeratorRuling | null }[],
  panel: AgentPersona[],
): string {
  const byId = new Map(panel.map((p) => [p.id, p]));
  const parts: string[] = [
    `TOPIC: ${topic}`,
    "",
    "=== INDEPENDENT ANALYSES ===",
    renderAnalyses(analyses, byId),
  ];
  for (const r of rounds) {
    parts.push("", `=== DEBATE ROUND ${r.round} ===`, renderRoundTurns(r.turns, byId));
    if (r.ruling) {
      parts.push(
        "",
        `Moderator after round ${r.round}: majority ${
          r.ruling.majorityReached ? "REACHED" : "not reached"
        } — cluster [${r.ruling.majorityAgentIds.join(", ")}]. ${r.ruling.compatibilityRationale}`,
      );
    }
  }
  return parts.join("\n");
}

export function debateSystem(persona: AgentPersona): string {
  return `${persona.systemPrompt}\n\n${SHARED_PROTOCOL}`;
}

export function debateUser(
  persona: AgentPersona,
  topic: string,
  round: number,
  transcript: string,
  turnsThisRound: DebateTurn[],
  panel: AgentPersona[],
): string {
  const byId = new Map(panel.map((p) => [p.id, p]));
  const soFar = turnsThisRound.length
    ? `Already spoken this round:\n\n${renderRoundTurns(turnsThisRound, byId)}`
    : "You speak first this round.";
  return [
    `This is DEBATE ROUND ${round}. The running transcript:`,
    "",
    transcript,
    "",
    soFar,
    "",
    "Now give your statement for this round, in view of all positions above.",
    `Set "agentId" to "${persona.id}" and "round" to ${round}.`,
    'If your position substantively changed from YOUR previous statement, set',
    '"moved" to true and explain the change in "movedReason"; otherwise set',
    '"moved" to false and "movedReason" to null.',
    'List in "respondsTo" the agentIds you directly engage.',
  ].join("\n");
}

export function moderatorSystem(): string {
  return [
    "You are the neutral MODERATOR of The Colloquy. You hold no theological",
    "position of your own. Your sole task is to judge whether a qualifying",
    "majority exists after a debate round.",
    "",
    "Rules:",
    "- Cluster agents by SUBSTANTIVE compatibility of their conclusions and the",
    "  reasoning behind them — not by matching labels or tags. Two agents whose",
    "  stated conclusions differ in wording but agree in substance belong",
    "  together; two agents sharing a tag but reasoning incompatibly do not.",
    "- A qualifying majority additionally requires the shared conclusion to be",
    "  genuinely grounded in the scripture the cluster cites.",
    "- Be strict: when in doubt, the majority is NOT reached.",
    "- Respond with ONLY the required JSON object.",
  ].join("\n");
}

export function moderatorUser(
  topic: string,
  round: number,
  transcript: string,
  panel: AgentPersona[],
): string {
  const n = panel.length;
  return [
    `Panel (${n} agents): ${panel.map((p) => `${p.name} [${p.id}]`).join(", ")}.`,
    `Majority threshold: at least ${majorityThreshold(n)} of ${n} agents.`,
    "",
    transcript,
    "",
    `Rule on round ${round}. Set "round" to ${round}, "agentCount" to ${n}, and`,
    `"majorityThreshold" to ${majorityThreshold(n)}. Every agent id must appear in`,
    'exactly one of "majorityAgentIds" or "dissentingAgentIds". Set',
    '"majorityReached" true only if the compatible, scripture-grounded cluster',
    "meets the threshold, and set \"continueDebate\" to the negation of that.",
  ].join("\n");
}

export function secretarySystem(): string {
  return [
    "You are the RECORDING SECRETARY of The Colloquy. You hold no position of",
    "your own. You write the official record of the result: accurate, fair to",
    "every panelist, and useful to a reader who was not present.",
    "",
    "Rules:",
    '- "consensus" only for ground genuinely shared by ALL panelists.',
    "- State the majority position in its own strongest terms, and the dissent",
    "  in ITS strongest terms — a dissenter should recognize their view.",
    "- Cite the scripture that actually carried the argument.",
    '- If the outcome is dissensus, "deadlockBreaker" must name the concrete',
    "  evidence or argument that would move the panel.",
    "- Respond with ONLY the required JSON object.",
  ].join("\n");
}

export function secretaryUser(
  topic: string,
  transcript: string,
  finalRuling: ModeratorRuling | null,
  roundsUsed: number,
  panel: AgentPersona[],
): string {
  const rulingLine = finalRuling
    ? `Final moderator ruling: majority ${
        finalRuling.majorityReached ? "REACHED" : "NOT reached"
      } with cluster [${finalRuling.majorityAgentIds.join(", ")}].`
    : "No moderator ruling was recorded.";
  return [
    transcript,
    "",
    rulingLine,
    `Rounds used: ${roundsUsed}.`,
    "",
    `Write the official verdict. Set "topic" to the question verbatim, and`,
    `"roundsUsed" to ${roundsUsed}. Choose "outcome": "consensus" if all`,
    `${panel.length} agents share the conclusion, "qualified_majority" if a`,
    "qualifying majority exists with fair dissent, otherwise \"dissensus\".",
  ].join("\n");
}
