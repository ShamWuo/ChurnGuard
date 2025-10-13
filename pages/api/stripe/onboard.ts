import type { NextApiRequest, NextApiResponse } from 'next'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2023-10-16' })

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email } = req.body || {}
  if (!email) return res.status(400).json({ error: 'email required' })

  try {
    
    const customer = await stripe.customers.create({ email })
    return res.status(200).json({ customerId: customer.id })
  } catch (err: any) {
    console.error('stripe onboard error', err)
    return res.status(500).json({ error: err.message || 'stripe error' })
  }
}
