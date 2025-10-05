import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { checkAdminAuth } from '../../../lib/adminAuth';
import { rateLimitAsync } from '../../../lib/rateLimit';
import { withLogging } from '../../../lib/logger';
import { withSentryTracing } from '../../../lib/sentry';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(405).end('Method Not Allowed');
  if (!checkAdminAuth(req)) return res.status(401).json({ error: 'unauthorized' });
  const rl = await rateLimitAsync('admin:export-user:' + (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anon'), 5, 60_000);
  if (!rl.ok) { res.setHeader('RateLimit-Limit', String(rl.limit)); res.setHeader('RateLimit-Remaining', String(rl.remaining)); res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt/1000))); return res.status(429).json({ error: 'rate_limited' }); }
  res.setHeader('RateLimit-Limit', String(rl.limit));
  res.setHeader('RateLimit-Remaining', String(rl.remaining));
  res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt/1000)));

  const email = typeof req.query.email === 'string' ? req.query.email : undefined;
  if (!email) return res.status(400).json({ error: 'missing email query parameter' });

  const user = await prisma.user.findUnique({ where: { email }, include: { subscriptions: true } });
  if (!user) return res.status(404).json({ error: 'not_found' });

  // CSV export if requested
  if (req.query.format === 'csv') {
    const rows = [ ['id','email','stripeCustomerId','createdAt'], [user.id, user.email, user.stripeCustomerId||'', user.createdAt.toISOString()] ];
    const csv = rows.map(r => r.map(v => typeof v === 'string' && v.includes(',') ? '"'+v.replace(/"/g,'""')+'"' : String(v)).join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="user-${user.id}.csv"`);
    if (req.method === 'HEAD') { res.status(200).end(); return; }
    res.send(csv);
    return;
  }

  // For HEAD requests, return headers only
  if (req.method === 'HEAD') { res.status(200).end(); return; }

  res.json(user);
}

export default withSentryTracing(withLogging(handler));
