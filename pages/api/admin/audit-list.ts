import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { checkAdminAuth } from '../../../lib/adminAuth';
import { rateLimitAsync } from '../../../lib/rateLimit';
import { withLogging } from '../../../lib/logger';
import { withSentryTracing } from '../../../lib/sentry';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).end('Method Not Allowed');
  if (!checkAdminAuth(req)) return res.status(401).json({ error: 'unauthorized' });
  const rl = await rateLimitAsync('admin:audit-list:' + (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anon'), 5, 60_000);
  if (!rl.ok) { res.setHeader('RateLimit-Limit', String(rl.limit)); res.setHeader('RateLimit-Remaining', String(rl.remaining)); res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt/1000))); return res.status(429).json({ error: 'rate_limited' }); }
  res.setHeader('RateLimit-Limit', String(rl.limit));
  res.setHeader('RateLimit-Remaining', String(rl.remaining));
  res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt/1000)));

  const page = parseInt((req.query.page as string) || '1', 10) || 1;
  const pageSize = Math.min(100, parseInt((req.query.pageSize as string) || '50', 10) || 50);
  const skip = (page - 1) * pageSize;
  const where: any = {};
  if (req.query.action) where.action = String(req.query.action);
  if (req.query.actor) where.actor = String(req.query.actor);
  if (req.query.since) where.createdAt = { gte: new Date(String(req.query.since)) };
  if (req.query.until) where.createdAt = { ...(where.createdAt || {}), lte: new Date(String(req.query.until)) };
  try {
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: pageSize }),
      prisma.auditLog.count({ where }),
    ]);
    res.json({ logs, total, page, pageSize });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
export default withSentryTracing(withLogging(handler));
