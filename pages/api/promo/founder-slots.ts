import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';

const TOTAL_SLOTS = 50;

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const purchases = await prisma.auditLog.count({ where: { action: 'billing:purchase' } });
    const remaining = Math.max(0, TOTAL_SLOTS - purchases);
    res.json({ total: TOTAL_SLOTS, used: purchases, remaining });
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
}
