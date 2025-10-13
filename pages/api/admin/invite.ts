import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const secret = req.headers['x-admin-secret'] as string | undefined
  if (!secret || secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'unauthorized' })
  if (req.method !== 'POST') return res.status(405).end()
  const { email } = req.body || {}
  if (!email) return res.status(400).json({ error: 'email required' })
  try {
    
    await prisma.auditLog.create({ data: { action: 'invite', detail: email } })
    return res.status(200).json({ ok: true })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
