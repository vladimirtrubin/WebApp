import type Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import {
  AdjournedError,
  ColloquyError,
  getClient,
  getModel,
  withBackoff,
} from "./anthropic";

export interface StructuredCallOptions<T> {
  schema: z.ZodType<T>;
  /** Stable name for the output format (helps schema caching server-side). */
  schemaName: string;
  system: string;
  messages: Anthropic.MessageParam[];
  maxTokens?: number;
  signal?: AbortSignal;
  /** Called with raw streamed text as it arrives (token-by-token UI). */
  onToken?: (text: string) => void;
}

/** Signature the orchestrator depends on — injectable for tests (no live calls). */
export type StructuredGenerate = <T>(opts: StructuredCallOptions<T>) => Promise<T>;

/**
 * Make one model call that must return strict JSON:
 * - streams output (tokens surface via onToken),
 * - constrains the response with a JSON schema (structured outputs),
 * - validates with zod (including refinements the API cannot enforce),
 * - on parse/validation failure retries ONCE with a "return only valid JSON"
 *   reminder, then surfaces a clean error.
 */
export const callStructured: StructuredGenerate = async function callStructured<T>({
  schema,
  schemaName,
  system,
  messages,
  maxTokens = 4096,
  signal,
  onToken,
}: StructuredCallOptions<T>): Promise<T> {
  const client = getClient();
  const model = getModel();

  const attempt = async (attemptMessages: Anthropic.MessageParam[]): Promise<string> =>
    withBackoff(
      async () => {
        const stream = client.messages.stream(
          {
            model,
            max_tokens: maxTokens,
            system,
            messages: attemptMessages,
            output_config: { format: zodOutputFormat(schema, schemaName) },
          },
          { signal },
        );
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            onToken?.(event.delta.text);
          }
        }
        const final = await stream.finalMessage();
        if (final.stop_reason === "refusal") {
          throw new ColloquyError("The model declined to answer this prompt.");
        }
        if (final.stop_reason === "max_tokens") {
          throw new ColloquyError(
            "The model ran out of output tokens before finishing its statement.",
          );
        }
        return final.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("");
      },
      { signal },
    );

  const parseStrict = (raw: string): T => {
    const parsed: unknown = JSON.parse(raw);
    return schema.parse(parsed);
  };

  let firstRaw = "";
  try {
    firstRaw = await attempt(messages);
    return parseStrict(firstRaw);
  } catch (err) {
    if (signal?.aborted) throw new AdjournedError();
    if (!(err instanceof SyntaxError) && !(err instanceof z.ZodError)) throw err;

    // One corrective retry, quoting the failure so the model can fix it.
    const issue =
      err instanceof z.ZodError
        ? `Validation errors: ${err.issues
            .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
            .join("; ")}`
        : `The reply was not parseable JSON: ${err.message}`;

    const retryMessages: Anthropic.MessageParam[] = [
      ...messages,
      { role: "assistant", content: firstRaw || "(empty reply)" },
      {
        role: "user",
        content:
          `${issue}\n\nReturn ONLY valid JSON conforming exactly to the required ` +
          `schema — no prose, no markdown fences, no commentary.`,
      },
    ];

    try {
      const secondRaw = await attempt(retryMessages);
      return parseStrict(secondRaw);
    } catch (retryErr) {
      if (signal?.aborted) throw new AdjournedError();
      if (retryErr instanceof SyntaxError || retryErr instanceof z.ZodError) {
        throw new ColloquyError(
          `The model failed to produce valid ${schemaName} JSON after a retry.`,
          retryErr,
        );
      }
      throw retryErr;
    }
  }
};
