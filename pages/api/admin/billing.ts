import type { NextApiRequest, NextApiResponse } from 'next';

type BillingSummary = {
  connected: boolean;
  message?: string;
  plans?: number;
  activeSubscriptions?: number;
  customers?: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<BillingSummary>) {
  const secret = process.env.STRIPE_SECRET || process.env.STRIPE_API_KEY;
  if (!secret) {
    return res.status(200).json({
      connected: false,
      message:
        'Stripe not configured. Set STRIPE_SECRET (or STRIPE_API_KEY) in your environment to enable billing features. For local development you can set it in your shell or docker-compose file.',
    });
  }

  try {
    // Use require to avoid crash when stripe isn't installed at runtime in some environments
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Stripe = require('stripe');
    const stripe = new Stripe(secret, { apiVersion: '2023-08-16' });

    // Fetch lightweight counts to show a summary on the admin page. Keep calls small.
    const [plans, subscriptions, customers] = await Promise.all([
      stripe.plans.list({ limit: 1 }).then((r: any) => r.total_count || (r.data && r.data.length) || 0),
      stripe.subscriptions.list({ limit: 1 }).then((r: any) => r.total_count || (r.data && r.data.length) || 0),
      stripe.customers.list({ limit: 1 }).then((r: any) => r.total_count || (r.data && r.data.length) || 0),
    ]);

    return res.status(200).json({
      connected: true,
      plans: Number(plans),
      activeSubscriptions: Number(subscriptions),
      customers: Number(customers),
    });
  } catch (err: any) {
    console.error('Stripe billing API error:', err && err.message ? err.message : err);
    return res.status(500).json({ connected: false, message: 'Failed to reach Stripe API: ' + (err && err.message ? err.message : String(err)) });
  }
}
