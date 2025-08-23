import type { NextApiRequest, NextApiResponse } from 'next';
import { withLogging } from '../../lib/logger';
import { withSentryTracing, captureError } from '../../lib/sentry';

function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  res.setHeader('Cache-Control', 'no-store');
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    // Standard CSP report body uses either 'csp-report' or 'body'
    const report = (body && (body['csp-report'] || body['csp_report'] || body['body'])) || body || {};
    // Attach minimal context; avoid logging PII
    const msg = `CSP report: ${report['violated-directive'] || 'unknown'} on ${report['document-uri'] || ''}`;
    try { captureError(new Error(msg)); } catch {}
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message || 'bad_request' });
  }
}

export default withSentryTracing(withLogging(handler));
