import type { NextApiRequest, NextApiResponse } from 'next';
import jwt from 'jsonwebtoken';
import { withLogging } from '../../../lib/logger';
import { withSentryTracing } from '../../../lib/sentry';
import { rateLimitAsync } from '../../../lib/rateLimit';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  
  const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anon');
  const rl = await rateLimitAsync(`admin:login:${ip}`, 10, 10 * 60_000); 
  res.setHeader('RateLimit-Limit', String(rl.limit));
  res.setHeader('RateLimit-Remaining', String(rl.remaining));
  res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt / 1000)));
  if (!rl.ok) return res.status(429).json({ error: 'rate_limited' });

  const { username, password } = req.body || {};
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return res.status(500).json({ error: 'server not configured' });

  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;
  let ok = false;
  if (adminUser && adminPass) {
    if (username === adminUser && password === adminPass) ok = true;
  } else {
    
    if (password === secret) ok = true;
  }

  if (!ok) {
    
    const delayMs = 150 + Math.floor(Math.random() * 200);
    await new Promise(r => setTimeout(r, delayMs));
    return res.status(401).json({ error: 'invalid' });
  }

  const token = jwt.sign({ admin: true }, secret, { expiresIn: '2h' });
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const sameSite = process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax';
  const domain = process.env.COOKIE_DOMAIN ? `; Domain=${process.env.COOKIE_DOMAIN}` : '';
  
  res.setHeader('Set-Cookie', `admin_token=${encodeURIComponent(token)}; HttpOnly; Path=/; Max-Age=7200; SameSite=${sameSite}${domain}${secureFlag}`);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true });
}
export default withSentryTracing(withLogging(handler));
