import type { NextApiRequest, NextApiResponse } from 'next';
import { handleStripeEvent } from '../stripe/webhook';
import { checkAdminAuth } from '../../../lib/adminAuth';
import { rateLimitAsync } from '../../../lib/rateLimit';
import { requireCsrf } from '../../../lib/csrf';
import { withLogging } from '../../../lib/logger';
import { withSentryTracing } from '../../../lib/sentry';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: 'unauthorized' });
  if (!requireCsrf(req, res)) return;
  const rl = await rateLimitAsync('admin:simulate-webhook:' + (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anon'), 5, 60_000);
  if (!rl.ok) { res.setHeader('RateLimit-Limit', String(rl.limit)); res.setHeader('RateLimit-Remaining', String(rl.remaining)); res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt/1000))); return res.status(429).json({ error: 'rate_limited' }); }
  res.setHeader('RateLimit-Limit', String(rl.limit));
  res.setHeader('RateLimit-Remaining', String(rl.remaining));
  res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt/1000)));

  const event = req.body;
  try {
    await handleStripeEvent(event as any);
  try { const audit = await import('../../../lib/audit'); await audit.logAudit(audit.actorFromReq(req), 'simulate_webhook', { eventType: (event as any).type }); } catch (e) {}
  res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
export default withSentryTracing(withLogging(handler));
