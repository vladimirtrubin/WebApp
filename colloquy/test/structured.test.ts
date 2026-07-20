import { describe, expect, it, vi, beforeEach } from "vitest";
import { z } from "zod";

/**
 * Tests for callStructured's strict-JSON contract: parse + zod validation,
 * exactly one corrective retry, then a clean error. The Anthropic client is
 * mocked — no live API calls.
 */

const holder = vi.hoisted(() => ({
  stream: vi.fn<(params: unknown, opts: unknown) => unknown>(),
}));

vi.mock("../lib/anthropic", async (importOriginal) => {
  const mod = await importOriginal<typeof import("../lib/anthropic")>();
  return {
    ...mod,
    getModel: () => "test-model",
    getClient: () => ({ messages: { stream: holder.stream } }),
  };
});

import { callStructured } from "../lib/structured";
import { ColloquyError } from "../lib/anthropic";

function fakeStream(text: string, stopReason: string = "end_turn") {
  return {
    async *[Symbol.asyncIterator]() {
      // Emit in two chunks so onToken sees deltas, not one blob.
      const mid = Math.ceil(text.length / 2);
      yield {
        type: "content_block_delta",
        delta: { type: "text_delta", text: text.slice(0, mid) },
      };
      yield {
        type: "content_block_delta",
        delta: { type: "text_delta", text: text.slice(mid) },
      };
    },
    async finalMessage() {
      return { stop_reason: stopReason, content: [{ type: "text", text }] };
    },
  };
}

const Schema = z
  .object({ verdict: z.string().min(1), unanimous: z.boolean() })
  .strict()
  .refine((v) => !v.unanimous || v.verdict.includes("all"), {
    message: "a unanimous verdict must speak for all",
    path: ["verdict"],
  });

const baseOpts = {
  schema: Schema,
  schemaName: "test_schema",
  system: "test system",
  messages: [{ role: "user" as const, content: "question" }],
};

beforeEach(() => {
  holder.stream.mockReset();
});

describe("callStructured", () => {
  it("parses and returns valid JSON on the first attempt", async () => {
    holder.stream.mockReturnValueOnce(
      fakeStream('{"verdict":"split 3-2","unanimous":false}'),
    );
    const tokens: string[] = [];
    const result = await callStructured({
      ...baseOpts,
      onToken: (t) => tokens.push(t),
    });
    expect(result).toEqual({ verdict: "split 3-2", unanimous: false });
    expect(holder.stream).toHaveBeenCalledTimes(1);
    expect(tokens.join("")).toBe('{"verdict":"split 3-2","unanimous":false}');
  });

  it("retries once with a JSON reminder after unparseable output, then succeeds", async () => {
    holder.stream
      .mockReturnValueOnce(fakeStream("I believe the answer is clear."))
      .mockReturnValueOnce(fakeStream('{"verdict":"split 3-2","unanimous":false}'));

    const result = await callStructured(baseOpts);
    expect(result).toEqual({ verdict: "split 3-2", unanimous: false });
    expect(holder.stream).toHaveBeenCalledTimes(2);

    const retryParams = holder.stream.mock.calls[1][0] as {
      messages: { role: string; content: string }[];
    };
    // The retry carries the bad reply plus the corrective instruction.
    expect(retryParams.messages).toHaveLength(3);
    expect(retryParams.messages[1]).toMatchObject({
      role: "assistant",
      content: "I believe the answer is clear.",
    });
    expect(retryParams.messages[2].content).toContain("Return ONLY valid JSON");
    expect(retryParams.messages[2].content).toContain("not parseable JSON");
  });

  it("retries with the concrete zod issues when a refinement fails", async () => {
    holder.stream
      .mockReturnValueOnce(fakeStream('{"verdict":"split","unanimous":true}'))
      .mockReturnValueOnce(fakeStream('{"verdict":"all agree","unanimous":true}'));

    const result = await callStructured(baseOpts);
    expect(result).toEqual({ verdict: "all agree", unanimous: true });

    const retryParams = holder.stream.mock.calls[1][0] as {
      messages: { content: string }[];
    };
    expect(retryParams.messages[2].content).toContain("Validation errors");
    expect(retryParams.messages[2].content).toContain(
      "a unanimous verdict must speak for all",
    );
  });

  it("surfaces a clean ColloquyError after the retry also fails", async () => {
    holder.stream
      .mockReturnValueOnce(fakeStream("nonsense"))
      .mockReturnValueOnce(fakeStream("more nonsense"));

    await expect(callStructured(baseOpts)).rejects.toThrow(ColloquyError);
    await expect(async () => {
      holder.stream
        .mockReturnValueOnce(fakeStream("nonsense"))
        .mockReturnValueOnce(fakeStream("more nonsense"));
      await callStructured(baseOpts);
    }).rejects.toThrow(/failed to produce valid test_schema JSON/);
    expect(holder.stream).toHaveBeenCalledTimes(4);
  });

  it("reports a refusal as a clean error without retrying JSON repair", async () => {
    holder.stream.mockReturnValueOnce(fakeStream("", "refusal"));
    await expect(callStructured(baseOpts)).rejects.toThrow(/declined to answer/);
    expect(holder.stream).toHaveBeenCalledTimes(1);
  });

  it("reports max_tokens exhaustion as a clean error", async () => {
    holder.stream.mockReturnValueOnce(fakeStream('{"verdict":', "max_tokens"));
    await expect(callStructured(baseOpts)).rejects.toThrow(/ran out of output tokens/);
  });
});
