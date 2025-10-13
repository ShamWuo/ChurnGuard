import type { NextApiRequest } from 'next';
import jwt from 'jsonwebtoken';



export function checkAdminAuth(req: NextApiRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return false;

  
  let token: string | undefined = undefined;
  if ((req as any).cookies && (req as any).cookies['admin_token']) {
    token = (req as any).cookies['admin_token'];
  } else if (req.headers.cookie) {
    const cookieHeader = req.headers.cookie as string;
    const match = cookieHeader.split(';').map(s => s.trim()).find(s => s.startsWith('admin_token='));
    if (match) token = decodeURIComponent(match.split('=')[1]);
  }

  if (token) {
    try {
      jwt.verify(token, secret);
      return true;
    } catch (e) {
      
      return false;
    }
  }

  
  return false;
}
