import type { NextApiRequest, NextApiResponse } from 'next';
import { failedPaymentEmail, reminderEmail, recoveredEmail } from '../../../lib/emailTemplates';
import { withSentryTracing } from '../../../lib/sentry';
import { withLogging } from '../../../lib/logger';

const templates = {
  failedPayment: () => failedPaymentEmail({ invoiceId: 'inv_123', amount: 2599, currency: 'USD', billingPortalUrl: '/api/stripe/portal' }),
  reminder1: () => reminderEmail({ invoiceId: 'inv_123', attemptNo: 1, amount: 2599, currency: 'USD', billingPortalUrl: '/api/stripe/portal' }),
  reminder2: () => reminderEmail({ invoiceId: 'inv_123', attemptNo: 2, amount: 2599, currency: 'USD', billingPortalUrl: '/api/stripe/portal' }),
  recovered: () => recoveredEmail({ amount: 2599, currency: 'USD' }),
} as const;

function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const { name } = req.query;
  if (!name) return res.status(400).json({ error: 'missing name' });
  const key = String(Array.isArray(name) ? name[0] : name);
  const build = (templates as any)[key];
  if (!build) return res.status(404).json({ error: 'unknown template' });
  const { subject, html } = build();
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${subject}</title></head><body>${html}</body></html>`;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(page);
}

export default withSentryTracing(withLogging(handler));
