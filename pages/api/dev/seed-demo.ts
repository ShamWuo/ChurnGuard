import type { NextApiRequest, NextApiResponse } from 'next';
import { seedDemo } from '../../../lib/seedDemo';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  const secret = req.headers['x-admin-secret'] as string | undefined;
  const isDev = process.env.NODE_ENV !== 'production';
  if (!isDev && (!secret || secret !== process.env.ADMIN_SECRET)) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  try {
    await seedDemo();
    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'seed_failed' });
  }
}
