import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Validate secret
  const secret = process.env.CRON_SECRET || '';
  const provided = String(req.query.secret || req.headers['x-cron-secret'] || '');
  if (!secret || !provided || provided !== secret) return res.status(401).json({ ok: false, error: 'unauthorized' });

  const ttlDays = Number(req.query.ttlDays || 30);
  const cutoff = new Date(Date.now() - Math.max(1, ttlDays) * 24 * 60 * 60 * 1000);

  try {
    const result = await (prisma as any)?.cspReport?.deleteMany?.({ where: { deletedAt: { lt: cutoff } } }) as any;
    const count = result?.count ?? 0;
    try { await (prisma as any)?.auditLog?.create?.({ data: { actor: 'cron', action: 'csp:purge', details: JSON.stringify({ count, cutoff: cutoff.toISOString(), ttlDays }) } }); } catch {}
    return res.json({ ok: true, purged: count, cutoff: cutoff.toISOString() });
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e || 'error') });
  }
}
