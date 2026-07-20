import { getStorage } from "../../../../lib/storage";
import type { RunSummary } from "../../../../schemas/run";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/colloquy/runs — newest-first summaries of persisted transcripts. */
export async function GET(): Promise<Response> {
  const storage = getStorage();
  const ids = await storage.listRunIds();

  const summaries: RunSummary[] = [];
  for (const id of ids) {
    try {
      const run = await storage.getRun(id);
      if (!run) continue;
      summaries.push({
        id: run.id,
        topic: run.topic,
        status: run.status,
        createdAt: run.createdAt,
        roundsUsed: run.rounds.length,
        outcome: run.verdict?.outcome ?? null,
      });
    } catch {
      // A corrupt or foreign file in the runs dir must not break the archive.
    }
  }
  summaries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return Response.json(summaries);
}
