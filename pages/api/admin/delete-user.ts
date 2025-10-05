import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import jwt from 'jsonwebtoken';
import { checkAdminAuth } from '../../../lib/adminAuth';
import { rateLimitAsync } from '../../../lib/rateLimit';
import { withLogging } from '../../../lib/logger';
import { withSentryTracing } from '../../../lib/sentry';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  // Allow admin cookie auth or CRON_SECRET for scripted purge
  const cronSecret = process.env.CRON_SECRET;
  const providedCron = (req.headers['x-cron-secret'] as string) || (req.query.cron_secret as string | undefined);
  const isCron = cronSecret && providedCron === cronSecret;
  if (!checkAdminAuth(req) && !isCron) return res.status(401).json({ error: 'unauthorized' });
  const rl = await rateLimitAsync('admin:delete-user:' + (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anon'), 2, 60_000);
  if (!rl.ok) { res.setHeader('RateLimit-Limit', String(rl.limit)); res.setHeader('RateLimit-Remaining', String(rl.remaining)); res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt/1000))); return res.status(429).json({ error: 'rate_limited' }); }
  res.setHeader('RateLimit-Limit', String(rl.limit));
  res.setHeader('RateLimit-Remaining', String(rl.remaining));
  res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt/1000)));

  const body = req.body || {};
  const email = typeof body.email === 'string' ? body.email : (typeof req.query.email === 'string' ? req.query.email : undefined);
  const dry = body.dry === true || body.dry === 'true' || req.query.dry === 'true';
  if (!email) return res.status(400).json({ error: 'missing email' });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: 'not_found' });

  // Dry-run: count affected records but don't mutate (use count queries so we don't change data)
  if (dry) {
    const cspCount = await prisma.cspReport.count({ where: { ua: { contains: user.email } } }).catch(() => 0);
    const subsCount = await prisma.subscription.count({ where: { userId: user.id } }).catch(() => 0);
    return res.json({ ok: true, dry: true, counts: { cspReports: Number(cspCount || 0), subscriptions: Number(subsCount || 0) } });
  }

  // Safety: prevent accidental destructive deletes in environments where this is not explicitly enabled.
  // To allow destructive deletes set ENABLE_DESTRUCTIVE_DELETES=1 in the environment, or call via CRON_SECRET.
  if (!process.env.ENABLE_DESTRUCTIVE_DELETES && !isCron) {
    return res.status(403).json({ error: 'destructive_deletes_disabled', message: 'Destructive deletes are disabled. Set ENABLE_DESTRUCTIVE_DELETES=1 to enable.' });
  }

  // Helper: try to extract admin actor from JWT cookie (if present), fall back to 'system'
  const getActor = () => {
    try {
      const cookieToken = (req as any).cookies?.['admin_token'] || (req.headers.cookie && String(req.headers.cookie).split(';').map(s => s.trim()).find(s => s.startsWith('admin_token='))?.split('=')[1]);
      if (!cookieToken) return 'system';
      const token = decodeURIComponent(cookieToken as string);
      // Verify when possible to ensure token is valid
      if (process.env.ADMIN_SECRET) {
        try {
          const payload = jwt.verify(token, process.env.ADMIN_SECRET as string) as any;
          return payload?.admin && payload?.sub ? String(payload.sub) : (payload?.admin ? 'admin' : 'system');
        } catch {
          // fallback to decode without verify
        }
      }
      const decoded = jwt.decode(token) as any;
      return decoded?.admin ? (decoded?.sub || 'admin') : 'system';
    } catch (e) {
      return 'system';
    }
  };

  const actor = getActor();

  // Perform deletion steps in a transaction where supported (atomic)
  try {
    const now = new Date();
    // Use $transaction with array of operations so databases that support transactions run atomically.
    const [cspRes, subsRes, userRes] = await prisma.$transaction([
      prisma.cspReport.updateMany({ where: { ua: { contains: user.email } }, data: { deletedAt: now } }),
      prisma.subscription.updateMany({ where: { userId: user.id }, data: { userId: null, status: 'canceled', cancelAtPeriodEnd: true } }),
      prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: null } }),
    ]);

    // Create audit log entry after successful transaction
    try {
      await prisma.auditLog.create({ data: { actor, action: 'delete_user', details: `Deleted data for ${email}` } });
    } catch (e) {
      // audit creation failure shouldn't block the success response
      console.warn('delete-user: failed to create audit log', e);
    }

  return res.json({ ok: true, actor, counts: { cspReports: Number(cspRes?.count || 0), subscriptions: Number(subsRes?.count || 0) } });
  } catch (e) {
    // In environments that don't support transactional behavior for these operations, attempt best-effort fallback
    try {
      const now = new Date();
      const cspRes = await prisma.cspReport.updateMany({ where: { ua: { contains: user.email } }, data: { deletedAt: now } }).catch(() => ({ count: 0 }));
      const subsRes = await prisma.subscription.updateMany({ where: { userId: user.id }, data: { userId: null, status: 'canceled', cancelAtPeriodEnd: true } }).catch(() => ({ count: 0 }));
      await prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: null } }).catch(() => null);
      try {
        await prisma.auditLog.create({ data: { actor, action: 'delete_user', details: `Deleted data for ${email}` } }).catch(() => null);
      } catch {}
  return res.json({ ok: true, partial: true, actor, counts: { cspReports: Number(cspRes?.count || 0), subscriptions: Number(subsRes?.count || 0) } });
    } catch (e2) {
      console.error('delete-user transaction failed', e, e2);
      return res.status(500).json({ error: 'internal' });
    }
  }
}

export default withSentryTracing(withLogging(handler));
