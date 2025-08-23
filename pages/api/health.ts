import type { NextApiRequest, NextApiResponse } from 'next';
import { withLogging } from '../../lib/logger';
import { withSentryTracing } from '../../lib/sentry';

function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ ok: true, ts: Date.now() });
}

export default withSentryTracing(withLogging(handler));
