import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'
import { logAudit } from '../../../lib/audit'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { priceId } = req.body || {}
  const effectivePrice = priceId || process.env.STRIPE_PRICE_ID
  if (!effectivePrice) return res.status(400).json({ error: 'priceId required' })

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: effectivePrice, quantity: 1 }],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?checkout=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/?checkout=cancel`,
    })
    try {
      // record checkout initiation for auditing and metrics
      await logAudit('system', 'billing:checkout_started', { sessionId: session.id, price: effectivePrice });
    } catch (e) {
      // swallow - non-critical
      console.warn('failed to log checkout start', e);
    }
    return res.status(200).json({ url: session.url })
  } catch (err: any) {
    console.error('checkout error', err)
    return res.status(500).json({ error: err.message || 'stripe error' })
  }
}
