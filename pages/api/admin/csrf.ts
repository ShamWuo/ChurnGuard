import type { NextApiRequest, NextApiResponse } from 'next';
import { issueCsrf } from '../../../lib/csrf';
import { checkAdminAuth } from '../../../lib/adminAuth';
import { withLogging } from '../../../lib/logger';
import { withSentryTracing } from '../../../lib/sentry';
import { rateLimitAsync } from '../../../lib/rateLimit';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end('Method Not Allowed');
  if (!checkAdminAuth(req)) return res.status(401).json({ error: 'unauthorized' });
  res.setHeader('Cache-Control', 'no-store');
  const rl = await rateLimitAsync('admin:csrf:' + (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anon'), 30, 60_000);
  if (!rl.ok) { res.setHeader('RateLimit-Limit', String(rl.limit)); res.setHeader('RateLimit-Remaining', String(rl.remaining)); res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt/1000))); return res.status(429).json({ error: 'rate_limited' }); }
  res.setHeader('RateLimit-Limit', String(rl.limit));
  res.setHeader('RateLimit-Remaining', String(rl.remaining));
  res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt/1000)));
  const token = issueCsrf(res);
  res.json({ token });
}
export default withSentryTracing(withLogging(handler));
