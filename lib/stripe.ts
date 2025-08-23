import Stripe from 'stripe';

export const requireEnv = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing env ${k}`);
  return v;
};

const key = process.env.STRIPE_SECRET_KEY;
export const stripe: any = key ? new Stripe(key, { apiVersion: '2022-11-15' } as any) : {
  checkout: { sessions: { create: async () => ({ url: 'https://checkout.test' }) } },
  billingPortal: { sessions: { create: async () => ({ url: 'https://portal.test' }) } },
  invoices: { pay: async () => ({}) },
};

export default stripe;
