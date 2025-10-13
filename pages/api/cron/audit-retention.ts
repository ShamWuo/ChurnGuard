import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { withLogging } from '../../../lib/logger';
import { withSentryTracing } from '../../../lib/sentry';


async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers['x-cron-secret'] !== secret) return res.status(401).json({ error: 'unauthorized' });
  const days = parseInt((req.query.days as string) || '90', 10) || 90;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  res.json({ deleted: result.count, olderThanDays: days });
}
export default withSentryTracing(withLogging(handler));
