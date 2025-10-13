import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

const COOKIE_NAME = 'csrf_token';

export function issueCsrf(res: NextApiResponse) {
  const secret = process.env.CSRF_SECRET || process.env.ADMIN_SECRET || 'dev';
  const token = crypto.createHmac('sha256', secret).update(String(Date.now()) + Math.random()).digest('hex');
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  
  res.setHeader('Set-Cookie', `${COOKIE_NAME}=${token}; HttpOnly; Path=/; SameSite=Lax${secureFlag}`);
  return token;
}

export function getCsrfFromCookie(req: NextApiRequest) {
  const c = req.headers.cookie || '';
  const m = c.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE_NAME + '='));
  if (!m) return undefined;
  return decodeURIComponent(m.split('=')[1]);
}

export function requireCsrf(req: NextApiRequest, res: NextApiResponse) {
  if (process.env.NODE_ENV === 'test') return true;
  const header = (req.headers['x-csrf-token'] as string) || '';
  const cookie = getCsrfFromCookie(req) || '';
  
  const bodyToken = typeof req.body === 'object' && req.body ? (req.body as any)['x-csrf-token'] : '';
  const token = header || bodyToken || '';
  if (!token || !cookie || token !== cookie) {
    res.status(403).json({ error: 'invalid_csrf' });
    return false;
  }
  return true;
}
