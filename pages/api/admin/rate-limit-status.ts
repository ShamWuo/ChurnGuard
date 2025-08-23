import type { NextApiRequest, NextApiResponse } from 'next';
import { checkAdminAuth } from '../../../lib/adminAuth';
import { rateLimitAsync } from '../../../lib/rateLimit';
import { getRedis } from '../../../lib/redis';
import { withLogging } from '../../../lib/logger';
import { withSentryTracing } from '../../../lib/sentry';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).end('Method Not Allowed');
  if (!checkAdminAuth(req)) return res.status(401).json({ error: 'unauthorized' });
  const rl = await rateLimitAsync('admin:rate-limit-status:' + (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anon'), 5, 60_000);
  res.setHeader('RateLimit-Limit', String(rl.limit));
  res.setHeader('RateLimit-Remaining', String(rl.remaining));
  res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt/1000)));
  if (!rl.ok) return res.status(429).json({ error: 'rate_limited' });

  try {
    const r = getRedis();
    if (r) {
      const keys: string[] = [];
      const stream = r.scanStream({ match: 'rl:*', count: 100 });
      for await (const batch of stream as any) {
        for (const k of batch) { keys.push(k); if (keys.length >= 200) break; }
        if (keys.length >= 200) break;
      }
      if (keys.length === 0) return res.json({ ok: true, backend: 'redis', items: [] });
      const pipeline = r.pipeline();
      keys.forEach(k => { pipeline.get(k); pipeline.pttl(k); });
      const replies = (await pipeline.exec()) as Array<[Error | null, any]> | null;
      const items = [] as Array<{ key: string; count: number; ttlMs: number }>;
      if (!replies) return res.json({ ok: false, backend: 'redis', error: 'pipeline failed' });
      for (let i = 0; i < keys.length; i++) {
        const count = Number(replies[i*2]?.[1] ?? 0);
        const ttl = Number(replies[i*2+1]?.[1] ?? -1);
        items.push({ key: keys[i], count, ttlMs: ttl });
      }
      return res.json({ ok: true, backend: 'redis', items });
    }
    const store: any = (global as any).__rateLimitStore || {};
    const items = Object.entries<any>(store).map(([key, v]) => ({ key, tokens: v.tokens, resetAt: v.last + v.windowMs, windowMs: v.windowMs }));
    res.json({ ok: true, backend: 'memory', items });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e.message });
  }
}
export default withSentryTracing(withLogging(handler));
