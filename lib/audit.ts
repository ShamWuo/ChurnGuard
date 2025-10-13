import prisma from './prisma';
import jwt from 'jsonwebtoken';
import type { NextApiRequest } from 'next';

export async function logAudit(actor: string | undefined, action: string, details?: any) {
  try {
    await prisma.auditLog.create({ data: { actor: actor || null, action, details: details ? JSON.stringify(details) : null } });
  } catch (e) {
    
    console.error('audit log failed', e);
  }
}

export function actorFromReq(req: NextApiRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return undefined;
  let token: string | undefined;
  if ((req as any).cookies && (req as any).cookies['admin_token']) token = (req as any).cookies['admin_token'];
  else if (req.headers.cookie) {
    const m = (req.headers.cookie as string).split(';').map(s => s.trim()).find(s => s.startsWith('admin_token='));
    if (m) token = decodeURIComponent(m.split('=')[1]);
  }
  if (!token) return undefined;
  try { const p: any = jwt.verify(token, secret); return p.admin ? 'admin' : undefined; } catch (e) { return undefined; }
}
