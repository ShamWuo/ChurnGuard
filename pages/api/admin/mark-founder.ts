import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { actorFromReq } from '../../../lib/audit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();
  const { invoiceId, customerId, amount, currency } = req.body || {};
  if (!invoiceId) return res.status(400).json({ error: 'invoiceId required' });
  const actor = actorFromReq(req) || 'admin';
  try {
    await prisma.auditLog.create({ data: { actor, action: 'billing:purchase', details: JSON.stringify({ invoiceId, customerId, amount, currency }) } });
    return res.json({ ok: true });
  } catch (e: any) {
    console.error('mark-founder failed', e);
    return res.status(500).json({ error: e.message || 'failed' });
  }
}
