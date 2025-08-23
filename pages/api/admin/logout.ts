import type { NextApiRequest, NextApiResponse } from 'next';
import { withLogging } from '../../../lib/logger';
import { withSentryTracing } from '../../../lib/sentry';
import { requireCsrf } from '../../../lib/csrf';
import { checkAdminAuth } from '../../../lib/adminAuth';

function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  if (!checkAdminAuth(req)) return res.status(401).json({ error: 'unauthorized' });
  if (!requireCsrf(req, res)) return;
  const secureFlag = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const sameSite = process.env.NODE_ENV === 'production' ? 'Strict' : 'Lax';
  const domain = process.env.COOKIE_DOMAIN ? `; Domain=${process.env.COOKIE_DOMAIN}` : '';
  res.setHeader('Set-Cookie', `admin_token=; HttpOnly; Path=/; Max-Age=0; SameSite=${sameSite}${domain}${secureFlag}`);
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true });
}
export default withSentryTracing(withLogging(handler));
