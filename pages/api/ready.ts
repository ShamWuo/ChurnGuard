import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../lib/prisma';
import { stripe } from '../../lib/stripe';
import { isSmtpConfigured } from '../../lib/email';
import { getRedis } from '../../lib/redis';
import { withLogging } from '../../lib/logger';
import { withSentryTracing } from '../../lib/sentry';

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  let db = false;
  try { await prisma.$queryRaw`SELECT 1`; db = true; } catch {}
  const stripeOk = !!(process.env.STRIPE_SECRET_KEY || (stripe && stripe.checkout));
  const smtpOk = isSmtpConfigured();
  const redisOk = !!getRedis();

  
  const envErrors: string[] = [];
  const hasAdminCreds = !!((process.env.ADMIN_USER && process.env.ADMIN_PASS) || process.env.ADMIN_SECRET);
  if (!hasAdminCreds) envErrors.push('ADMIN_USER/ADMIN_PASS or ADMIN_SECRET');
  const csrfOk = !!(process.env.CSRF_SECRET || process.env.ADMIN_SECRET);
  if (!csrfOk) envErrors.push('CSRF_SECRET');

  
  const isProd = process.env.NODE_ENV === 'production';
  if (!process.env.STRIPE_SECRET_KEY) envErrors.push('STRIPE_SECRET_KEY');
  if (!process.env.STRIPE_WEBHOOK_SECRET) envErrors.push('STRIPE_WEBHOOK_SECRET');
  if (!process.env.CRON_SECRET) envErrors.push('CRON_SECRET');

  
  const ok = db && hasAdminCreds && csrfOk && (isProd ? stripeOk : true);

  res.status(ok ? 200 : 503).json({ ok, db, stripe: stripeOk, smtp: smtpOk, redis: redisOk, csrf: csrfOk, envErrors });
}

export default withSentryTracing(withLogging(handler));
