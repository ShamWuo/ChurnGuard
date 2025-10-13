import type { NextApiRequest, NextApiResponse } from 'next';
import { stripe } from '../../../lib/stripe';
import { rateLimitAsync } from '../../../lib/rateLimit';
import { withLogging } from '../../../lib/logger';
import { withSentryTracing } from '../../../lib/sentry';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  const rl = await rateLimitAsync('checkout:' + (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anon'), 10, 60_000);
  if (!rl.ok) {
    res.setHeader('RateLimit-Limit', String(rl.limit));
    res.setHeader('RateLimit-Remaining', String(rl.remaining));
    res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt/1000)));
    return res.status(429).json({ error: 'rate_limited' });
  }
    res.setHeader('RateLimit-Limit', String(rl.limit));
    res.setHeader('RateLimit-Remaining', String(rl.remaining));
    res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt/1000)));
  
  const bodyAny: any = req.body || {};
  const price = bodyAny.priceId || process.env.STRIPE_PRICE_ID;
  if (!price) return res.status(500).json({ error: 'No price configured' });

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?checkout=cancel`,
    });
    res.json({ url: session.url });
  } catch (err: any) {
    console.error('create-session error', err);
    res.status(500).json({ error: err.message || 'failed to create session' });
  }
}
export default withSentryTracing(withLogging(handler));
