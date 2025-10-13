import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const priceId = process.env.STRIPE_PRICE_ID || null;
  const priceDisplay = process.env.STRIPE_PRICE_DISPLAY || priceId || null;
  const secret = process.env.STRIPE_SECRET_KEY || '';
  const stripeConfigured = !!secret;
  const stripeMode = !secret ? null : (secret.startsWith('sk_test_') ? 'test' : 'live');
  res.json({ priceDisplay, priceId, stripeConfigured, stripeMode });
}
