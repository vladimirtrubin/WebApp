# The Colloquy

A multi-agent debate engine. Five AI personas — each simulating a real
theologian's **documented** positions — analyze a question independently, then
debate in rounds until a scripture-grounded majority forms, or the rounds run
out. A neutral moderator rules after every round; a recording secretary seals
the official verdict.

> **AI-simulation disclaimer.** Every voice in this app is an AI approximation
> reconstructed from each theologian's published writings. It is **not** their
> words and may misstate their views. **Wesley Huff is a living person**; his
> simulated positions are *inferred* from his public work and may misrepresent
> him. The UI displays this notice persistently; keep it if you fork the app.
> Verify anything quotable against the primary sources.

## Setup

```bash
cd colloquy
npm install
cp .env.example .env    # then put your Anthropic API key in .env
npm run dev             # http://localhost:3000
```

`.env` values:

| Variable            | Required | Default            | Purpose                                      |
| ------------------- | -------- | ------------------ | -------------------------------------------- |
| `ANTHROPIC_API_KEY` | yes      | —                  | Server-side only; never shipped to the client |
| `COLLOQUY_MODEL`    | no       | `claude-opus-4-8`  | Claude model used for every phase            |
| `COLLOQUY_MAX_ROUNDS` | no     | `4`                | Default cap on debate rounds (1–10)          |
| `COLLOQUY_RUNS_DIR` | no       | `./runs`           | Where transcripts are written (point at a NAS) |

Other commands: `npm test` (vitest, fully mocked — no live API calls),
`npm run typecheck`, `npm run build && npm start`.

## How a run works

1. **Independent analysis** — each panelist answers the topic in parallel,
   without seeing the others.
2. **Debate rounds** (max N) — every agent speaks once per round in view of the
   full transcript. Position changes are captured as a `moved` flag plus the
   reasoning for the move.
3. **Moderator check** — after each round a neutral moderator clusters agents
   whose conclusions are *substantively compatible* (reasoning, not matching
   labels) and checks the cluster is genuinely scripture-grounded. The loop
   exits the moment a qualifying majority exists.
4. **Verdict** — a recording secretary writes the official result: consensus /
   qualified majority with fair dissent / an honest record of dissensus with
   the evidence that would break the deadlock.

### The consensus rule

A **qualifying majority** is a cluster of at least `⌈n/2⌉` agents (3 of the
default 5) whose conclusions the moderator judges substantively compatible
**and** scripture-grounded. The moderator's self-reported ruling is re-verified
server-side in `lib/consensus.ts` (threshold arithmetic, panel membership,
duplicate ids) — a hallucinated "majority reached" that fails the arithmetic
does not stop the debate.

Every model call must return strict JSON (one zod schema per phase in
`schemas/`), enforced with the API's structured-output format and validated
with zod. On a validation failure the call is retried once with the concrete
errors quoted; a second failure surfaces as a clean error event.

## Adding or swapping a persona

The roster is data-driven — no orchestrator changes needed:

1. Create `agents/personas/your-theologian.ts` exporting an `AgentPersona`:
   `id`, `name`, `era`, `school`, `accentColor`, `isLiving`, and a
   `systemPrompt` that (a) stays in character, (b) grounds claims in specific
   scripture, (c) distinguishes what a narrator *commends* from what it merely
   *reports*, and (d) permits honest position change.
2. List it in the `PANEL` array in `agents/registry.ts`.

The consensus threshold, moderator prompts, and UI all adapt to the panel size
automatically. Set `isLiving: true` for any living person — the UI adds an
"inferred" flag to their card.

## Browsing past sessions

Every run is persisted as JSON the moment each phase completes, so even
adjourned or failed sessions leave a record. The **Past sessions** panel on the
page lists them (newest first) and reopens any transcript read-only. The same
data is available raw:

- `GET /api/colloquy/runs` — summaries (`id`, `topic`, `status`, `outcome`, …)
- `GET /api/colloquy/runs/:id` — one full `Run` envelope

## Architecture

```
app/api/colloquy/route.ts   thin SSE endpoint: validate → stream → abort on disconnect
app/api/colloquy/runs/      read-only archive endpoints over the same storage
lib/orchestrator.ts         phase state machine; emits typed events (schemas/events.ts)
lib/structured.ts           streaming structured call: JSON schema + zod + 1 repair retry
lib/anthropic.ts            SDK client, abort-aware exponential backoff, clean errors
lib/consensus.ts            pure consensus arithmetic (unit-tested)
lib/storage.ts              StorageAdapter interface; v1 = JSON files under ./runs/
agents/                     persona registry (data, not logic)
schemas/                    zod schemas: analysis, debate turn, ruling, verdict, run
components/, app/page.tsx   single-page UI; tokens stream into the agent cards
```

Design notes:

- **The key never reaches the browser.** All Anthropic calls happen in the
  Node route; the client receives only typed events.
- **Adjourn early** aborts the fetch; the server cancels in-flight API calls
  via `AbortSignal` and persists the partial run as `status: "adjourned"`.
- **Storage is an interface.** Swap `FileStorageAdapter` for a database by
  implementing `StorageAdapter` in `lib/storage.ts`; nothing else changes.
- Rate limits and transient API failures retry with exponential backoff
  (honoring `retry-after`); persistent failures end the run cleanly with the
  partial transcript saved.
