import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { checkAdminAuth } from '../../../lib/adminAuth';
import { requireCsrf } from '../../../lib/csrf';
import { rateLimitAsync } from '../../../lib/rateLimit';
import { withLogging } from '../../../lib/logger';
import { withSentryTracing } from '../../../lib/sentry';

// Single DB-backed handler for /api/admin/settings
export default withSentryTracing(withLogging(async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!checkAdminAuth(req)) return res.status(401).json({ error: 'unauthorized' });

  const rl = await rateLimitAsync('admin:settings:' + (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anon'), 5, 60_000);
  if (!rl.ok) {
    res.setHeader('RateLimit-Limit', String(rl.limit));
    res.setHeader('RateLimit-Remaining', String(rl.remaining));
    res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt / 1000)));
    return res.status(429).json({ error: 'rate_limited' });
  }

  res.setHeader('RateLimit-Limit', String(rl.limit));
  res.setHeader('RateLimit-Remaining', String(rl.remaining));
  res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt / 1000)));

  const pdb: any = prisma;

  if (req.method === 'GET') {
    const s = await pdb.settings.findUnique({ where: { id: 1 } });
    res.json(s || {});
    return;
  }

  if (req.method === 'POST') {
    if (!requireCsrf(req, res)) return;
    const { dunningBaseHours, dunningMaxAttempts, safeMode } = req.body || {};
    const s = await pdb.settings.upsert({
      where: { id: 1 },
      update: {
        dunningBaseHours: dunningBaseHours ?? undefined,
        dunningMaxAttempts: dunningMaxAttempts ?? undefined,
        safeMode: safeMode ?? undefined,
      },
      create: { id: 1, dunningBaseHours: dunningBaseHours ?? null, dunningMaxAttempts: dunningMaxAttempts ?? null, safeMode: !!safeMode },
    });
    res.json(s);
    return;
  }

  res.status(405).end('Method Not Allowed');
}));
