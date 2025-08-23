import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

function levelOrder(l: LogLevel): number {
  return ['debug', 'info', 'warn', 'error', 'silent'].indexOf(l);
}

function getLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL || process.env.NEXT_PUBLIC_LOG_LEVEL || 'info').toLowerCase();
  if (['debug', 'info', 'warn', 'error', 'silent'].includes(env)) return env as LogLevel;
  return 'info';
}

function shouldLog(target: LogLevel): boolean {
  return levelOrder(target) >= levelOrder(getLevel());
}

function redactHeaders(headers: NextApiRequest['headers']): Record<string, string | string[] | undefined> {
  const copy: Record<string, string | string[] | undefined> = {};
  const redactList = new Set(['authorization', 'cookie', 'x-csrf-token']);
  for (const [k, v] of Object.entries(headers)) {
    if (redactList.has(k.toLowerCase())) {
      copy[k] = Array.isArray(v) ? v.map(() => '[redacted]') : '[redacted]';
    } else {
      copy[k] = v as any;
    }
  }
  return copy;
}

function getClientIp(req: NextApiRequest): string {
  const xf = (req.headers['x-forwarded-for'] as string) || '';
  return (xf.split(',')[0] || (req.socket as any)?.remoteAddress || 'unknown').trim();
}

export function withLogging<T = any>(handler: NextApiHandler<T>): NextApiHandler<T> {
  return async function wrapped(req: NextApiRequest, res: NextApiResponse<T>) {
    if (!shouldLog('info')) return handler(req, res);
    const start = Date.now();
    const rid = (req.headers['x-request-id'] as string) || Math.random().toString(36).slice(2);
    try { res.setHeader('X-Request-Id', rid); } catch {}
    let errored: any = null;
    try {
      const out = await handler(req, res);
      return out as any;
    } catch (e: any) {
      errored = e;
      throw e;
    } finally {
      const dur = Date.now() - start;
      try {
        const entry = {
          t: new Date().toISOString(),
          rid,
          ip: getClientIp(req),
          method: req.method,
          url: req.url,
          status: (res as any).statusCode,
          ms: dur,
          ua: req.headers['user-agent'] || '',
        } as any;
        if (shouldLog('debug')) entry.headers = redactHeaders(req.headers);
        if (errored) entry.error = { message: String(errored?.message || errored), name: errored?.name };
        // eslint-disable-next-line no-console
        console.log(JSON.stringify({ type: 'api', ...entry }));
      } catch {}
    }
  };
}

export default withLogging;
