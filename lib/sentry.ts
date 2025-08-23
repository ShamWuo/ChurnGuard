import * as Sentry from '@sentry/node';

let inited = false;
export function initSentry() {
  if (inited) return;
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return; // no-op if not configured
  const tracesSampleRate = Number(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1');
  Sentry.init({ dsn, tracesSampleRate, environment: process.env.NODE_ENV });
  inited = true;
}

export function captureError(err: any) {
  try {
    initSentry();
    (Sentry as any).captureException?.(err);
  } catch {}
}

export function withSentryTracing<T extends (...args: any[]) => any>(fn: T): T {
  return (async function wrapped(this: any, ...args: any[]) {
    try {
      initSentry();
      const transaction = (Sentry as any).startTransaction?.({ name: fn.name || 'handler' });
      const scope = (Sentry as any).getCurrentHub?.().getScope?.();
      if (scope && transaction) scope.setSpan?.(transaction);
      try {
        // tag request context if NextApiRequest-like arg present
        try {
          const req = args?.[0];
          const rid = req?.headers?.['x-request-id'] || undefined;
          if (rid && scope) scope.setTag?.('request_id', String(rid));
          if (scope && req?.method) scope.setTag?.('http.method', req.method);
          if (scope && req?.url) scope.setTag?.('http.route', String(req.url));
        } catch {}
        const result = await fn.apply(this, args as any);
        transaction?.finish?.();
        return result;
      } catch (e) {
        (Sentry as any).captureException?.(e);
        transaction?.finish?.();
        throw e;
      }
    } catch {
      // Sentry not configured, just run
      return await fn.apply(this, args as any);
    }
  }) as any as T;
}

export default Sentry;
