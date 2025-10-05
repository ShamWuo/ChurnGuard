import type { NextApiRequest, NextApiResponse } from 'next'
import { handleStripeEvent } from '../../api/stripe/webhook'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const secret = req.headers['x-admin-secret'] as string | undefined
  if (process.env.NODE_ENV !== 'development' && (!secret || secret !== process.env.ADMIN_SECRET)) {
    return res.status(401).json({ error: 'unauthorized' })
  }
  if (req.method !== 'POST') return res.status(405).end()
  const event = req.body
  try {
    await handleStripeEvent(event)
    return res.status(200).json({ ok: true })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
