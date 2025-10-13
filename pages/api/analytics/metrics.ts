import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { rateLimitAsync } from '../../../lib/rateLimit';
import { getRedis } from '../../../lib/redis';
import crypto from 'crypto';
import { withLogging } from '../../../lib/logger';
import { withSentryTracing } from '../../../lib/sentry';

type Bucket = 'day' | 'week' | 'month';

function getClientIp(req: NextApiRequest): string {
  const xf = (req.headers['x-forwarded-for'] as string) || '';
  return (xf.split(',')[0] || (req.socket as any)?.remoteAddress || 'unknown').trim();
}

function parseDate(input?: string | string[]): Date | undefined {
  if (!input) return undefined;
  const v = Array.isArray(input) ? input[0] : input;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

function startOfDay(d: Date, tzOffsetMin: number): Date {
  const z = new Date(d.getTime() + tzOffsetMin * 60000);
  z.setUTCHours(0, 0, 0, 0);
  return new Date(z.getTime() - tzOffsetMin * 60000);
}

function keyForBucket(d: Date, bucket: Bucket, tzOffsetMin: number): string {
  const local = new Date(d.getTime() + tzOffsetMin * 60000);
  const y = local.getUTCFullYear();
  const m = local.getUTCMonth() + 1;
  const day = local.getUTCDate();
  if (bucket === 'day') return `${y}-${String(m).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  if (bucket === 'week') {
    
    const date = new Date(Date.UTC(y, m - 1, day));
    const dayNum = (date.getUTCDay() + 6) % 7; 
    date.setUTCDate(date.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
    const week = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
  }
  
  return `${y}-${String(m).padStart(2, '0')}`;
}

function fillSeries(start: Date, end: Date, bucket: Bucket, tzOffsetMin: number): string[] {
  const keys: string[] = [];
  let cur = startOfDay(start, tzOffsetMin);
  const endDay = startOfDay(end, tzOffsetMin);
  while (cur <= endDay) {
    keys.push(keyForBucket(cur, bucket, tzOffsetMin));
    
    if (bucket === 'day') cur = new Date(cur.getTime() + 86400000);
    else if (bucket === 'week') cur = new Date(cur.getTime() + 7 * 86400000);
    else {
      const d = new Date(cur);
      d.setUTCMonth(d.getUTCMonth() + 1);
      cur = d;
    }
  }
  return keys;
}

function etagOf(obj: any): string {
  const s = JSON.stringify(obj);
  return 'W/"' + crypto.createHash('sha1').update(s).digest('hex') + '"';
}

function etagMatches(ifNoneMatch: string | string[] | undefined, tag: string): boolean {
  if (!ifNoneMatch) return false;
  const raw = Array.isArray(ifNoneMatch) ? ifNoneMatch.join(',') : String(ifNoneMatch);
  const want = tag.replace(/^W\//, '').replace(/^\"|\"$/g, '');
  return raw.split(',').some(t => t.trim().replace(/^W\//, '').replace(/^\"|\"$/g, '') === want);
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  
  if (process.env.NODE_ENV !== 'test') {
    const ip = getClientIp(req);
    const rl = await rateLimitAsync(`metrics:${ip}`, 60, 60_000);
    
    res.setHeader('RateLimit-Limit', String(rl.limit));
    res.setHeader('RateLimit-Remaining', String(rl.remaining));
    res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt / 1000)));
    if (!rl.ok) { res.status(429).json({ error: 'rate_limited' }); return; }
  }

  
  const cacheTtlMs = Number(process.env.METRICS_CACHE_TTL_MS || 10_000);
  const cacheKey = `metrics:${JSON.stringify(req.query)}`;
  const now = Date.now();
  let redis = getRedis();
  if (process.env.NODE_ENV !== 'test') {
    try {
      if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          const tag = etagOf(parsed);
          if (etagMatches(req.headers['if-none-match'], tag)) { res.status(304).end(); return; }
          res.setHeader('ETag', tag);
          res.setHeader('Cache-Control', `public, max-age=${Math.floor(cacheTtlMs/1000)}`);
          res.json(parsed); return;
        }
      } else {
        const cacheStore: any = (global as any).__metricsCache ||= {};
        const existing = cacheStore[cacheKey];
        if (existing && existing.expires > now) {
          const tag = etagOf(existing.data);
          if (etagMatches(req.headers['if-none-match'], tag)) { res.status(304).end(); return; }
          res.setHeader('ETag', tag);
          res.setHeader('Cache-Control', `public, max-age=${Math.floor(cacheTtlMs/1000)}`);
          res.json(existing.data); return;
        }
      }
    } catch {
      
    }
  }

  try {
    
  
  const providedStart = parseDate(req.query.start);
  const providedEnd = parseDate(req.query.end);
  const defaultEnd = new Date(Math.floor(Date.now() / 60000) * 60000);
  const end = providedEnd || defaultEnd;
  const start = providedStart || new Date(end.getTime() - 30 * 86400000);
    const bucketRaw = (Array.isArray(req.query.bucket) ? req.query.bucket[0] : req.query.bucket) as string | undefined;
    const bucket: Bucket = bucketRaw === 'week' || bucketRaw === 'month' ? bucketRaw : 'day';
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      res.status(400).json({ error: 'invalid_range' });
      return;
    }
    const tzOffsetMin = Number(process.env.METRICS_TZ_OFFSET_MINUTES || 0);

    
    const total = await prisma.recoveryAttribution.findMany({
      orderBy: { createdAt: 'asc' },
      where: { createdAt: { gte: start, lte: end } } as any,
    });

    const recovered = total.reduce((s: number, r: any) => s + (r.amountRecovered || 0), 0);
    const count = total.length;

    
    const buckets: Record<string, number> = {};
    for (const r of total) {
      const d = new Date(r.createdAt);
      const key = keyForBucket(d, bucket, tzOffsetMin);
      buckets[key] = (buckets[key] || 0) + (r.amountRecovered || 0);
    }

    
    const seriesKeys = fillSeries(start, end, bucket, tzOffsetMin);
    const perBucket: Record<string, number> = {};
    for (const k of seriesKeys) perBucket[k] = buckets[k] || 0;

    const payload = { recoveredRevenue: recovered, count, bucket, start: start.toISOString(), end: end.toISOString(), perBucket };

    
    const isHead = req.method === 'HEAD';

    if ((Array.isArray(req.query.format) ? req.query.format[0] : req.query.format) === 'csv') {
      const rows = [['bucket','amount_cents']].concat(Object.entries(perBucket).map(([k, v]) => [k, String(v)]));
      const csv = rows.map(r => r.map(x => /[",\n]/.test(x) ? '"'+x.replace(/"/g,'""')+'"' : x).join(',')).join('\n');
      const tag = etagOf(csv);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="metrics-${bucket}.csv"`);
      res.setHeader('ETag', tag);
      res.setHeader('Cache-Control', `public, max-age=${Math.floor(cacheTtlMs/1000)}`);
  if (etagMatches(req.headers['if-none-match'], tag)) { res.status(304).end(); return; }
      if (isHead) { res.status(200).end(); return; }
      res.send(csv);
      return;
    }

  const tag = etagOf(payload);
  res.setHeader('ETag', tag);
  res.setHeader('Cache-Control', `public, max-age=${Math.floor(cacheTtlMs/1000)}`);
  if (etagMatches(req.headers['if-none-match'], tag)) { res.status(304).end(); return; }
    if (process.env.NODE_ENV !== 'test') {
      try {
        if (redis) {
          await redis.set(cacheKey, JSON.stringify(payload), 'PX', cacheTtlMs);
        } else {
          const cacheStore: any = (global as any).__metricsCache ||= {};
          cacheStore[cacheKey] = { data: payload, expires: now + cacheTtlMs, ts: now };
          // simple eviction to cap memory
          const keys = Object.keys(cacheStore);
          if (keys.length > 100) {
            keys.sort((a, b) => (cacheStore[a].ts || 0) - (cacheStore[b].ts || 0));
            for (let i = 0; i < keys.length - 100; i++) delete cacheStore[keys[i]];
          }
        }
      } catch {
        // ignore cache write errors
      }
    }
    if (isHead) { res.status(200).end(); return; }
    res.json(payload);
  } catch (e: any) {
    console.error('analytics.metrics error', e && e.message, e && e.stack);
    res.status(500).json({ error: e.message });
  }
}
export default withSentryTracing(withLogging(handler));
