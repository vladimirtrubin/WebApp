import { getPanel } from "../../../agents/registry";
import type { ColloquyEvent } from "../../../schemas/events";
import { describeApiError, getMaxRounds } from "../../../lib/anthropic";
import { runColloquy } from "../../../lib/orchestrator";
import { callStructured } from "../../../lib/structured";
import { getStorage } from "../../../lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TOPIC_LENGTH = 2000;

/**
 * POST /api/colloquy — starts a debate and streams typed events over SSE.
 * The Anthropic key lives server-side only; the client sees events, never keys.
 * Aborting the request (the "Adjourn early" button) cancels in-flight work.
 */
export async function POST(req: Request): Promise<Response> {
  let topic: string;
  let maxRounds: number;
  try {
    const body = (await req.json()) as { topic?: unknown; maxRounds?: unknown };
    topic = typeof body.topic === "string" ? body.topic.trim() : "";
    const requested = Number(body.maxRounds);
    maxRounds =
      Number.isInteger(requested) && requested >= 1 && requested <= 10
        ? requested
        : getMaxRounds();
  } catch {
    return json({ error: "Request body must be JSON." }, 400);
  }

  if (!topic) {
    return json({ error: "Topic must not be empty." }, 400);
  }
  if (topic.length > MAX_TOPIC_LENGTH) {
    return json(
      { error: `Topic is too long (max ${MAX_TOPIC_LENGTH} characters).` },
      400,
    );
  }

  let panel;
  try {
    panel = getPanel();
  } catch (err) {
    return json({ error: describeApiError(err) }, 500);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(streamController) {
      let closed = false;
      const emit = (event: ColloquyEvent) => {
        if (closed) return;
        try {
          streamController.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`),
          );
        } catch {
          closed = true; // client went away; orchestrator still finishes + persists
        }
      };

      void runColloquy(
        { topic, maxRounds, signal: req.signal },
        {
          generate: callStructured,
          storage: getStorage(),
          panel,
          emit,
        },
      )
        .catch((err) => {
          emit({ type: "error", message: describeApiError(err), speakerId: null });
        })
        .finally(() => {
          if (!closed) {
            closed = true;
            try {
              streamController.close();
            } catch {
              // already closed by cancel()
            }
          }
        });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
