import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { checkAdminAuth } from '../../../lib/adminAuth';
import { requireCsrf } from '../../../lib/csrf';
import { logAudit, actorFromReq } from '../../../lib/audit';
import { withLogging } from '../../../lib/logger';
import { withSentryTracing } from '../../../lib/sentry';

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');
  if (!checkAdminAuth(req)) return res.status(401).json({ error: 'unauthorized' });
  if (!requireCsrf(req, res)) return;
  const { email, customerId } = req.body as { email?: string; customerId?: string };
  if (!email || !customerId) return res.status(400).json({ error: 'Missing email or customerId' });
  const pdb: any = prisma;
  const user = await pdb.user.upsert({ where: { email }, update: { stripeCustomerId: customerId }, create: { email, stripeCustomerId: customerId } });
  try { await logAudit(actorFromReq(req), 'map_user', { email, customerId }); } catch (e) {}
  res.json({ ok: true, user });
}
export default withSentryTracing(withLogging(handler));
 
