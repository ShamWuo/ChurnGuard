import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { checkAdminAuth } from '../../../lib/adminAuth';
import { rateLimitAsync } from '../../../lib/rateLimit';
import { withLogging } from '../../../lib/logger';
import { withSentryTracing } from '../../../lib/sentry';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (!checkAdminAuth(req)) return res.status(401).json({ error: 'unauthorized' });
  const rl = await rateLimitAsync('admin:dunning-list:' + (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anon'), 5, 60_000);
  if (!rl.ok) { res.setHeader('RateLimit-Limit', String(rl.limit)); res.setHeader('RateLimit-Remaining', String(rl.remaining)); res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt/1000))); return res.status(429).json({ error: 'rate_limited' }); }
  res.setHeader('RateLimit-Limit', String(rl.limit));
  res.setHeader('RateLimit-Remaining', String(rl.remaining));
  res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt/1000)));
  try {
    const cases = await prisma.dunningCase.findMany({ take: 50, orderBy: { createdAt: 'desc' } });
    try {
      const audit = await import('../../../lib/audit');
      await audit.logAudit(audit.actorFromReq(req), 'list_dunning');
    } catch (e) {}
  res.json({ cases });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
export default withSentryTracing(withLogging(handler));
