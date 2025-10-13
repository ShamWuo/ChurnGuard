import Redis from 'ioredis';

let cached: Redis | null | undefined;


export function getRedis(): Redis | null {
  if (process.env.NODE_ENV === 'test') return null;
  if (cached !== undefined) return cached;
  const url = process.env.REDIS_URL;
  if (!url) { cached = null; return cached; }
  try {
    
    cached = new Redis(url, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    });
  } catch {
    cached = null;
  }
  return cached;
}
