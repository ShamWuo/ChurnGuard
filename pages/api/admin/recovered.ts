import type { NextApiRequest, NextApiResponse } from 'next';
import prisma from '../../../lib/prisma';
import { checkAdminAuth } from '../../../lib/adminAuth';

type Bucket = 'day' | 'week' | 'month';

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

function parseDate(input?: string | string[]): Date | undefined {
  if (!input) return undefined;
  const v = Array.isArray(input) ? input[0] : input;
  const d = new Date(v);
  return isNaN(d.getTime()) ? undefined : d;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Admin-only
  if (!checkAdminAuth(req)) { res.status(401).json({ error: 'unauthorized' }); return; }

  try {
    const providedStart = parseDate(req.query.start);
    const providedEnd = parseDate(req.query.end);
    const defaultEnd = new Date(Math.floor(Date.now() / 60000) * 60000);
    const end = providedEnd || defaultEnd;
    const start = providedStart || new Date(end.getTime() - 30 * 86400000);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      res.status(400).json({ error: 'invalid_range' });
      return;
    }
    const bucketRaw = (Array.isArray(req.query.bucket) ? req.query.bucket[0] : req.query.bucket) as string | undefined;
    const bucket: Bucket = bucketRaw === 'week' || bucketRaw === 'month' ? bucketRaw : 'day';
    const tzOffsetMin = Number(process.env.METRICS_TZ_OFFSET_MINUTES || 0);

    const total = await prisma.recoveryAttribution.findMany({
      where: { createdAt: { gte: start, lte: end } } as any,
      orderBy: { createdAt: 'asc' },
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

    if ((Array.isArray(req.query.format) ? req.query.format[0] : req.query.format) === 'csv') {
      const rows = [['bucket','amount_cents']].concat(Object.entries(perBucket).map(([k, v]) => [k, String(v)]));
      const csv = rows.map(r => r.map(x => /[",\n]/.test(x) ? '"'+x.replace(/"/g,'""')+'"' : x).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="recovered-${bucket}.csv"`);
      if (req.method === 'HEAD') {
        // Return headers only for HEAD requests
        res.status(200).end();
        return;
      }
      res.send(csv);
      return;
    }

    res.json(payload);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
