import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { withLogging } from '../../../lib/logger';
import { withSentryTracing } from '../../../lib/sentry';

async function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  try {
    
    await prisma.$queryRaw`SELECT 1`;
  const settings: any = await (prisma as any).settings.findUnique?.({ where: { id: 1 } }) || {};
  const envSafe = process.env.SAFE_MODE === 'true';
  const dbSafe = !!settings.safeMode;
  const uptime = Math.floor((Date.now() - ((global as any).__boot_ts ||= Date.now())) / 1000);
  res.json({ ok: true, db: true, safeMode: envSafe || dbSafe, envSafe, dbSafe, uptime });
  } catch (e) {
    res.status(500).json({ ok: false, db: false, error: (e as Error).message });
  }
}
export default withSentryTracing(withLogging(handler));
