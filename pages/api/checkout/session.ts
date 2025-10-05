import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const secret = process.env.STRIPE_SECRET || process.env.STRIPE_API_KEY;
  if (!secret) return res.status(400).json({ error: 'Stripe not configured. Set STRIPE_SECRET.' });

  const { priceId } = req.body || {};
  if (!priceId) return res.status(400).json({ error: 'priceId required' });

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Stripe = require('stripe');
    const stripe = new Stripe(secret, { apiVersion: '2023-08-16' });

    const origin = req.headers.origin || `http://localhost:${process.env.PORT || 3100}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/?checkout=success`,
      cancel_url: `${origin}/?checkout=cancel`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error('create checkout session error', err && err.message ? err.message : err);
    return res.status(500).json({ error: err && err.message ? err.message : String(err) });
  }
}
