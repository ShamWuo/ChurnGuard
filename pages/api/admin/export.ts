import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const secret = req.headers['x-admin-secret'] as string | undefined
  if (!secret || secret !== process.env.ADMIN_SECRET) return res.status(401).json({ error: 'unauthorized' })
  if (req.method !== 'GET') return res.status(405).end()
  try {
    const rows = await prisma.user.findMany({ take: 100 })
  const csv = ['id,email'].concat(rows.map((r: { id: string; email?: string | null }) => `${r.id},${r.email || ''}`)).join('\n')
    res.setHeader('content-type', 'text/csv')
    res.setHeader('content-disposition', 'attachment; filename=users.csv')
    return res.status(200).send(csv)
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
