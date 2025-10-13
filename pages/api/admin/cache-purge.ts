import type { NextApiRequest, NextApiResponse } from 'next';
import { checkAdminAuth } from '../../../lib/adminAuth';
import { getRedis } from '../../../lib/redis';
import { rateLimitAsync } from '../../../lib/rateLimit';
import { requireCsrf } from '../../../lib/csrf';
import { withLogging } from '../../../lib/logger';
import { withSentryTracing } from '../../../lib/sentry';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  if (!checkAdminAuth(req)) return res.status(401).json({ error: 'unauthorized' });
  const rl = await rateLimitAsync('admin:cache-purge:' + (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anon'), 2, 60_000);
  if (!rl.ok) { res.setHeader('RateLimit-Limit', String(rl.limit)); res.setHeader('RateLimit-Remaining', String(rl.remaining)); res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt/1000))); return res.status(429).json({ error: 'rate_limited' }); }
  
  res.setHeader('RateLimit-Limit', String(rl.limit));
  res.setHeader('RateLimit-Remaining', String(rl.remaining));
  res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt/1000)));

  if (!requireCsrf(req, res)) return;

  const scope = String((req.body && (req.body as any).scope) || 'metrics');
  let purged = 0;
  try {
    const r = getRedis();
    if (r) {
      const pattern = scope === 'all' ? '*' : `${scope}:*`;
      const stream = r.scanStream({ match: pattern, count: 100 });
      for await (const keys of stream as any) {
        if (keys.length) { purged += keys.length; await r.del(...keys); }
      }
    } else {
      const store: any = (global as any).__metricsCache || {};
      const keys = Object.keys(store).filter(k => scope === 'all' ? true : k.startsWith(`${scope}:`));
      for (const k of keys) { delete store[k]; purged++; }
    }
    res.json({ ok: true, purged });
  } catch (e: any) {
    res.status(500).json({ error: e.message, purged });
  }
}
export default withSentryTracing(withLogging(handler));
