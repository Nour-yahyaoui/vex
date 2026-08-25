import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Both the AI chat route and the sandbox execution route are guarded through
// this file. If Upstash isn't configured, `configured` is false and callers
// fall back to "allow everything, cache nothing" so local dev without Redis
// still works — but in production you want this wired up, since it's the
// only thing standing between one user and an unbounded Groq/Sandbox bill.
export const configured = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);

export const redis = configured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

// 30 AI chat calls per user per hour — generous for a "help me build
// something" assistant, tight enough to bound Groq usage per person.
export const aiRatelimit = configured
  ? new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(30, "1 h"),
      prefix: "vex:ratelimit:ai",
      analytics: true,
    })
  : null;

// Sandbox executions are real (billed) compute, so the budget is tighter:
// 15 runs per user per hour.
export const sandboxRatelimit = configured
  ? new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(15, "1 h"),
      prefix: "vex:ratelimit:sandbox",
      analytics: true,
    })
  : null;

export async function checkRatelimit(
  limiter: Ratelimit | null,
  identifier: string
): Promise<{ ok: boolean; remaining?: number }> {
  if (!limiter) return { ok: true };
  const { success, remaining } = await limiter.limit(identifier);
  return { ok: success, remaining };
}

// Simple string cache with TTL, used to avoid re-asking Groq the exact same
// question twice in a short window (e.g. two people asking "how do I use
// grep" back to back, or a user re-sending after a page refresh).
export async function cacheGet(key: string): Promise<string | null> {
  if (!redis) return null;
  const val = await redis.get<string>(key);
  return val ?? null;
}

export async function cacheSet(key: string, value: string, ttlSeconds = 60 * 60): Promise<void> {
  if (!redis) return;
  await redis.set(key, value, { ex: ttlSeconds });
}

export async function hashKey(parts: string[]): Promise<string> {
  const data = new TextEncoder().encode(parts.join("\u241F"));
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
