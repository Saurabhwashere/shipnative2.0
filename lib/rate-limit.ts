/**
 * lib/rate-limit.ts
 *
 * Zero-dependency in-memory sliding-window rate limiter.
 * Works per-process (single Next.js server instance).
 * To upgrade to distributed rate limiting (e.g. Upstash), replace this file only.
 */

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetInMs: number;
}

function createLimiter(opts: { maxTokens: number; windowMs: number }) {
  const store = new Map<string, RateLimitEntry>();

  // Prune stale entries every 5 minutes to prevent unbounded memory growth
  setInterval(
    () => {
      const now = Date.now();
      for (const [key, entry] of store.entries()) {
        if (now - entry.lastRefill > opts.windowMs * 2) {
          store.delete(key);
        }
      }
    },
    5 * 60 * 1000,
  );

  return {
    check(identifier: string): RateLimitResult {
      const now = Date.now();
      const entry = store.get(identifier);
      const refillRate = opts.maxTokens / opts.windowMs; // tokens per ms

      if (!entry) {
        store.set(identifier, { tokens: opts.maxTokens - 1, lastRefill: now });
        return {
          success: true,
          limit: opts.maxTokens,
          remaining: opts.maxTokens - 1,
          resetInMs: opts.windowMs,
        };
      }

      const elapsed = now - entry.lastRefill;
      const newTokens = Math.min(opts.maxTokens, entry.tokens + elapsed * refillRate);

      if (newTokens < 1) {
        const resetInMs = Math.ceil((1 - entry.tokens) / refillRate);
        store.set(identifier, { tokens: newTokens, lastRefill: now });
        return { success: false, limit: opts.maxTokens, remaining: 0, resetInMs };
      }

      store.set(identifier, { tokens: newTokens - 1, lastRefill: now });
      return {
        success: true,
        limit: opts.maxTokens,
        remaining: Math.floor(newTokens - 1),
        resetInMs: opts.windowMs,
      };
    },
  };
}

export const rateLimiters = {
  /** AI chat: 10 requests per user per 60 seconds */
  chat: createLimiter({ maxTokens: 10, windowMs: 60_000 }),
  /** Image upload: 20 requests per user per 60 seconds */
  upload: createLimiter({ maxTokens: 20, windowMs: 60_000 }),
  /** General API mutations: 60 requests per user per 60 seconds */
  api: createLimiter({ maxTokens: 60, windowMs: 60_000 }),
};
