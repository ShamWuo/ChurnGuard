import type { NextApiRequest, NextApiResponse } from 'next';
import { checkAdminAuth } from '../../../lib/adminAuth';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (!checkAdminAuth(req)) return res.status(401).json({ error: 'unauthorized' });

  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const ttlDays = Number(body?.ttlDays ?? req.query.ttlDays ?? 30);
    const cutoff = new Date(Date.now() - Math.max(1, ttlDays) * 24 * 60 * 60 * 1000);

    // hard-delete rows soft-deleted before cutoff
    const result = await (prisma as any)?.cspReport?.deleteMany?.({ where: { deletedAt: { lt: cutoff } } }) as any;
    const count = result?.count ?? 0;

    try {
      await (prisma as any)?.auditLog?.create?.({ data: { actor: (req as any).admin || 'admin', action: 'csp:purge', details: JSON.stringify({ count, cutoff: cutoff.toISOString(), ttlDays }) } });
    } catch {}

    return res.json({ ok: true, purged: count, cutoff: cutoff.toISOString() });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e || 'error') });
  }
}
