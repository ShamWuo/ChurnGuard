import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  const priceDisplay = process.env.STRIPE_PRICE_DISPLAY || process.env.STRIPE_PRICE_ID || null;
  res.json({ priceDisplay });
}
