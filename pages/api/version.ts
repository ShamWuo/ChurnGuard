import type { NextApiRequest, NextApiResponse } from 'next';
import pkg from '../../package.json';

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  const commit = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GIT_COMMIT || 'unknown';
  res.json({ version: (pkg as any).version, commit });
}
