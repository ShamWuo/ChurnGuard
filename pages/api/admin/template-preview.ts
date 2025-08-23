import type { NextApiRequest, NextApiResponse } from 'next';
import { reminderEmail, failedPaymentEmail } from '../../../lib/emailTemplates';
import { checkAdminAuth } from '../../../lib/adminAuth';
import { rateLimitAsync } from '../../../lib/rateLimit';
import { requireCsrf } from '../../../lib/csrf';
import { withLogging } from '../../../lib/logger';
import { withSentryTracing } from '../../../lib/sentry';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: 'unauthorized' });
  if (!requireCsrf(req, res)) return;
  const rl = await rateLimitAsync('admin:template-preview:' + (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anon'), 10, 60_000);
  if (!rl.ok) { res.setHeader('RateLimit-Limit', String(rl.limit)); res.setHeader('RateLimit-Remaining', String(rl.remaining)); res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt/1000))); return res.status(429).json({ error: 'rate_limited' }); }
  res.setHeader('RateLimit-Limit', String(rl.limit));
  res.setHeader('RateLimit-Remaining', String(rl.remaining));
  res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt/1000)));

  const { kind = 'reminder', invoiceId = 'in_123', amount = 1999, currency = 'USD', attemptNo = 1 } = req.body || {};
  if (kind === 'failed') {
    const { subject, html } = failedPaymentEmail({ invoiceId, amount, currency, billingPortalUrl: 'https://example.com/portal' });
  try { const audit = await import('../../../lib/audit'); await audit.logAudit(audit.actorFromReq(req), 'preview_template_failed', { invoiceId, amount }); } catch (e) {}
    return res.json({ subject, html });
  }
  const { subject, html } = reminderEmail({ invoiceId, attemptNo, amount, currency });
  try { const audit = await import('../../../lib/audit'); await audit.logAudit(audit.actorFromReq(req), 'preview_template_reminder', { invoiceId, attemptNo }); } catch (e) {}
  res.json({ subject, html });
}
export default withSentryTracing(withLogging(handler));
