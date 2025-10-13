import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

type Body = {
  stripeSecret?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  
  const adminHeader = req.headers['x-admin-secret'] || req.headers['admin-secret'];
  const ADMIN_SECRET = process.env.ADMIN_SECRET;
  if (!ADMIN_SECRET || String(adminHeader) !== String(ADMIN_SECRET)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  if (req.method === 'GET') {
    return res.status(200).json({ stripeSecret: process.env.STRIPE_SECRET || process.env.STRIPE_API_KEY || null, writable: process.env.NODE_ENV !== 'production' });
  }

  if (req.method === 'POST') {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ error: 'Cannot write env in production' });
    }

    const body = req.body as Body;
    const secret = body && body.stripeSecret;
    if (typeof secret !== 'string') return res.status(400).json({ error: 'stripeSecret required' });

    
    const envPath = path.resolve(process.cwd(), '.env.local');
    let content = '';
    try {
      if (fs.existsSync(envPath)) content = fs.readFileSync(envPath, 'utf8');
      const lines = content.split(/\r?\n/).filter(Boolean).filter((l) => !l.startsWith('STRIPE_SECRET') && !l.startsWith('STRIPE_API_KEY'));
      lines.push(`STRIPE_SECRET=${secret}`);
      fs.writeFileSync(envPath, lines.join('\n') + '\n', { encoding: 'utf8' });
      return res.status(200).json({ ok: true, path: '.env.local' });
    } catch (err: any) {
      console.error('write env error', err);
      return res.status(500).json({ error: String(err) });
    }
  }

  return res.status(405).end();
}
