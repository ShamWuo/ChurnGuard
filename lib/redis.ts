import Redis from 'ioredis';

let cached: Redis | null | undefined;

/**
 * Returns a singleton Redis client when REDIS_URL is set. Otherwise returns null.
 * Disabled under test to avoid network I/O.
 */
export function getRedis(): Redis | null {
  if (process.env.NODE_ENV === 'test') return null;
  if (cached !== undefined) return cached;
  const url = process.env.REDIS_URL;
  if (!url) { cached = null; return cached; }
  try {
    // Lazy connection; ioredis connects on first command.
    cached = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    });
  } catch {
    cached = null;
  }
  return cached;
}
