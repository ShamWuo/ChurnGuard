import { getRedis } from './redis';

export function rateLimit(key: string, max: number, windowMs: number) {
  // Very small in-memory token bucket for dev/testing with metadata.
  const store: any = (global as any).__rateLimitStore ||= {};
  const now = Date.now();
  const bucket = store[key] ||= { tokens: max, last: now, windowMs };
  const elapsed = now - bucket.last;
  // refill tokens proportional to time passed
  const refill = Math.floor((elapsed / bucket.windowMs) * max);
  if (refill > 0) { bucket.tokens = Math.min(max, bucket.tokens + refill); bucket.last = now; }
  if (bucket.tokens > 0) {
    bucket.tokens -= 1;
    const resetAt = bucket.last + bucket.windowMs;
    return { ok: true, limit: max, remaining: bucket.tokens, resetAt };
  }
  const resetAt = bucket.last + bucket.windowMs;
  return { ok: false, limit: max, remaining: 0, resetAt };
}

export type RateLimitResult = { ok: boolean; limit: number; remaining: number; resetAt: number };

/**
 * Redis-backed fixed-window rate limit. Falls back to in-memory bucket when Redis is unavailable.
 */
export async function rateLimitAsync(key: string, max: number, windowMs: number): Promise<RateLimitResult> {
  const r = getRedis();
  if (!r) return rateLimit(key, max, windowMs);
  const now = Date.now();
  const windowKey = `rl:${key}:${Math.floor(now / windowMs)}`;
  try {
    const n = await r.incr(windowKey);
    if (n === 1) {
      // set px only on first increment
      await r.pexpire(windowKey, windowMs);
    }
    const ttl = await r.pttl(windowKey);
    const remaining = Math.max(0, max - n);
    const ok = n <= max;
    const resetAt = now + (ttl > 0 ? ttl : windowMs);
    return { ok, limit: max, remaining: ok ? remaining : 0, resetAt };
  } catch {
    return rateLimit(key, max, windowMs);
  }
}
