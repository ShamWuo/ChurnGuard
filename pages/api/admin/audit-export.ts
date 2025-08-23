import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { checkAdminAuth } from '../../../lib/adminAuth';
import { rateLimitAsync } from '../../../lib/rateLimit';
import { withLogging } from '../../../lib/logger';
import { withSentryTracing } from '../../../lib/sentry';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end('Method Not Allowed');
  if (!checkAdminAuth(req)) return res.status(401).json({ error: 'unauthorized' });
  const rl = await rateLimitAsync('admin:audit-export:' + (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anon'), 2, 60_000);
  if (!rl.ok) { res.setHeader('RateLimit-Limit', String(rl.limit)); res.setHeader('RateLimit-Remaining', String(rl.remaining)); res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt/1000))); return res.status(429).json({ error: 'rate_limited' }); }
  res.setHeader('RateLimit-Limit', String(rl.limit));
  res.setHeader('RateLimit-Remaining', String(rl.remaining));
  res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt/1000)));
  const where: any = {};
  if (req.query.action) where.action = String(req.query.action);
  if (req.query.actor) where.actor = String(req.query.actor);
  if (req.query.since) where.createdAt = { gte: new Date(String(req.query.since)) };
  if (req.query.until) where.createdAt = { ...(where.createdAt || {}), lte: new Date(String(req.query.until)) };
  const logs = await prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 5000 });
  const rows: Array<Array<string|number>> = [
    ['id','createdAt','actor','action','details'],
    ...logs.map((l: any) => [l.id, l.createdAt.toISOString(), l.actor || '', l.action, (l.details || '').replace(/\n/g, ' ')]),
  ];
  const csv = rows.map((r: Array<string|number>) => r.map((v: any) => typeof v === 'string' && v.includes(',') ? '"'+v.replace(/"/g,'""')+'"' : String(v)).join(',')).join('\n');
  // Caching headers
  const hash = require('crypto').createHash('sha1').update(csv).digest('hex');
  res.setHeader('ETag', 'W/"'+hash+'"');
  res.setHeader('Cache-Control', 'private, max-age=0, must-revalidate');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="audit.csv"');
  if (req.method === 'HEAD') { res.status(200).end(); return; }
  res.send(csv);
}
export default withSentryTracing(withLogging(handler));
