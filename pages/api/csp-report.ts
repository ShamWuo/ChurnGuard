import type { NextApiRequest, NextApiResponse } from 'next';
import { withLogging } from '../../lib/logger';
import { withSentryTracing } from '../../lib/sentry';
import prisma from '../../lib/prisma';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  res.setHeader('Cache-Control', 'no-store');
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    
    const report = (body && (body['csp-report'] || body['csp_report'] || body['body'])) || body || {};
    const rawPayload = report;
    const headers = Object.fromEntries(Object.entries(req.headers || {}));
    const item = {
      t: Date.now(),
      violated: report['violated-directive'] || report['effective-directive'],
      doc: report['document-uri'],
      blocked: report['blocked-uri'],
      ua: (req.headers['user-agent'] as string) || '',
      raw: rawPayload,
      headers,
    };
    try { (globalThis as any).__pushCspReport?.(item); } catch {}
    
    try {
      await (prisma as any)?.cspReport?.create?.({ data: {
        violated: item.violated,
        doc: item.doc,
        blocked: item.blocked,
        ua: item.ua,
        raw: JSON.stringify(item.raw || {}),
        headers: JSON.stringify(item.headers || {}),
      }});
    } catch {}
    res.json({ ok: true });
  } catch (e: any) {
    res.status(400).json({ ok: false, error: e.message || 'bad_request' });
  }
}

export default withSentryTracing(withLogging(handler));
