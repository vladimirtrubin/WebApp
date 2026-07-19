import Anthropic from "@anthropic-ai/sdk";

/** Thrown for user-facing configuration/runtime failures with a clean message. */
export class ColloquyError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "ColloquyError";
  }
}

export class AdjournedError extends Error {
  constructor() {
    super("The colloquy was adjourned early.");
    this.name = "AdjournedError";
  }
}

export const DEFAULT_MODEL = "claude-opus-4-8";

export function getModel(): string {
  return process.env.COLLOQUY_MODEL?.trim() || DEFAULT_MODEL;
}

export function getMaxRounds(): number {
  const raw = Number(process.env.COLLOQUY_MAX_ROUNDS ?? 4);
  return Number.isInteger(raw) && raw >= 1 && raw <= 10 ? raw : 4;
}

let client: Anthropic | null = null;

/** Server-only singleton. The key comes from the environment and never leaves it. */
export function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ColloquyError(
      "ANTHROPIC_API_KEY is not set. Copy .env.example to .env and add your key.",
    );
  }
  // maxRetries: 0 — we own retry/backoff in withBackoff so streamed calls
  // are retried as whole attempts, with abort awareness.
  client ??= new Anthropic({ maxRetries: 0 });
  return client;
}

function isRetryable(err: unknown): boolean {
  if (err instanceof Anthropic.APIConnectionError) return true;
  if (err instanceof Anthropic.RateLimitError) return true;
  if (err instanceof Anthropic.InternalServerError) return true;
  if (err instanceof Anthropic.APIError) {
    const status = (err as { status?: number }).status;
    return status === 408 || status === 409 || status === 529;
  }
  return false;
}

function retryDelayMs(err: unknown, attempt: number): number {
  // Honor the server's retry-after when present (rate limits).
  if (err instanceof Anthropic.RateLimitError) {
    const after = Number(err.headers?.get?.("retry-after"));
    if (Number.isFinite(after) && after > 0) return Math.min(after * 1000, 30_000);
  }
  // Exponential backoff with jitter: ~1s, 2s, 4s, 8s.
  const base = 1000 * 2 ** attempt;
  return base + Math.floor(Math.random() * 250);
}

function abortableSleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AdjournedError());
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new AdjournedError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export interface BackoffOptions {
  signal?: AbortSignal;
  maxAttempts?: number;
}

/**
 * Run an API call with exponential backoff on retryable failures
 * (connection errors, 429 with retry-after, 5xx, 529 overloaded).
 * Aborts promptly when the adjourn signal fires.
 */
export async function withBackoff<T>(
  fn: () => Promise<T>,
  { signal, maxAttempts = 4 }: BackoffOptions = {},
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (signal?.aborted) throw new AdjournedError();
    try {
      return await fn();
    } catch (err) {
      if (signal?.aborted) throw new AdjournedError();
      lastError = err;
      if (!isRetryable(err) || attempt === maxAttempts - 1) throw err;
      await abortableSleep(retryDelayMs(err, attempt), signal);
    }
  }
  throw lastError;
}

/** Map SDK errors to clean, user-facing messages. */
export function describeApiError(err: unknown): string {
  if (err instanceof ColloquyError) return err.message;
  if (err instanceof Anthropic.AuthenticationError) {
    return "The Anthropic API rejected the key (401). Check ANTHROPIC_API_KEY.";
  }
  if (err instanceof Anthropic.RateLimitError) {
    return "Rate limited by the Anthropic API after several retries. Try again shortly.";
  }
  if (err instanceof Anthropic.APIConnectionError) {
    return "Could not reach the Anthropic API. Check your network and try again.";
  }
  if (err instanceof Anthropic.APIError) {
    return `Anthropic API error (${(err as { status?: number }).status ?? "unknown"}): ${err.message}`;
  }
  return err instanceof Error ? err.message : "Unknown error";
}
