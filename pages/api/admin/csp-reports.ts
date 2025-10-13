import type { NextApiRequest, NextApiResponse } from 'next';
import { checkAdminAuth } from '../../../lib/adminAuth';
import prisma from '../../../lib/prisma';


type CspItem = { t: number; violated?: string; doc?: string; blocked?: string; ua?: string };
const MAX = 200;
const buf: CspItem[] = [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Cache-Control', 'no-store');
  if (!checkAdminAuth(req)) return res.status(401).json({ error: 'unauthorized' });

  
  if (req.method === 'GET') {
  const since = Number(req.query.since || 0);
    const format = String(req.query.format || '').toLowerCase();
    const q = String(req.query.q || '').toLowerCase();
    const page = Math.max(1, Number(req.query.page || 1));
    const pageSize = Math.min(200, Math.max(10, Number(req.query.pageSize || 50)));
  const includeDeleted = String(req.query.includeDeleted || '') === '1';

    
    const memAll = buf.filter(x => x.t > since);

    
    let dbItems: any[] = [];
    try {
      const whereClause: any = {};
      if (since) whereClause.createdAt = { gt: new Date(since) };
      if (!includeDeleted) whereClause.deletedAt = null;
      dbItems = (await (prisma as any)?.cspReport?.findMany?.({
        orderBy: { createdAt: 'desc' },
        take: 200,
        where: Object.keys(whereClause).length ? whereClause : undefined,
      })) || [];
    } catch {}

    const dbMapped = dbItems.map((r: any) => ({ id: r.id, t: r.createdAt ? new Date(r.createdAt).getTime() : Date.now(), violated: r.violated, doc: r.doc, blocked: r.blocked, ua: r.ua, raw: r.raw ? JSON.parse(r.raw) : undefined, headers: r.headers ? JSON.parse(r.headers) : undefined, deletedAt: r.deletedAt ? new Date(r.deletedAt).getTime() : undefined }));

    
    let mergedAll = [...dbMapped, ...memAll].sort((a, b) => b.t - a.t).slice(0, MAX);
    if (q) {
      mergedAll = mergedAll.filter(it => ((it.violated || '') + ' ' + (it.doc || '') + ' ' + (it.blocked || '') + ' ' + (it.ua || '')).toLowerCase().includes(q));
    }

    const total = mergedAll.length;
    const start = (page - 1) * pageSize;
    const items = mergedAll.slice(start, start + pageSize);

    if (format === 'csv') {
      const header = 'id,createdAt,violated,document,blocked,ua\n';
      const esc = (s: any) => '"' + String(s || '').replace(/"/g, '""') + '"';
      const lines = mergedAll.map((it: any) => [it.id || '', new Date(it.t).toISOString(), esc(it.violated), esc(it.doc), esc(it.blocked), esc(it.ua)].join(','));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="csp-reports.csv"');
      return res.send(header + lines.join('\n'));
    }

    return res.json({ items, now: Date.now(), total, page, pageSize });
  }

  // DELETE: support deleting single DB row by id, deleting in-memory item by timestamp (ts), or clearing all
  if (req.method === 'DELETE') {
    const id = req.query.id ? Number(req.query.id) : undefined;
    const ts = req.query.ts ? Number(req.query.ts) : undefined;
    if (id) {
      const force = String(req.query.force || '') === '1';
      try {
        if (force) {
          await (prisma as any)?.cspReport?.delete?.({ where: { id } });
          try { await (prisma as any)?.auditLog?.create?.({ data: { actor: (req as any).admin || 'admin', action: 'csp:hard_delete', details: String(id) } }); } catch {}
        } else {
          await (prisma as any)?.cspReport?.update?.({ where: { id }, data: { deletedAt: new Date() } });
          try { await (prisma as any)?.auditLog?.create?.({ data: { actor: (req as any).admin || 'admin', action: 'csp:soft_delete', details: String(id) } }); } catch {}
        }
      } catch (e) {
        // ignore
      }
      return res.json({ ok: true, id, softDeleted: !force });
    }

    if (ts) {
      try {
        // remove any in-memory entries with this timestamp
        for (let i = buf.length - 1; i >= 0; i--) {
          if (buf[i].t === ts) buf.splice(i, 1);
        }
  try { await (prisma as any)?.auditLog?.create?.({ data: { actor: (req as any).admin || 'admin', action: 'csp:mem_delete', details: String(ts) } }); } catch {}
      } catch {}
      return res.json({ ok: true, ts });
    }

    // fallback: clear all
    buf.length = 0;
    try { await (prisma as any)?.cspReport?.deleteMany?.({}); } catch {}
  try { await (prisma as any)?.auditLog?.create?.({ data: { actor: (req as any).admin || 'admin', action: 'csp:clear_all', details: '' } }); } catch {}
    return res.json({ ok: true });
  }

  // POST: actions like restore
  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      const action = String(req.query.action || body?.action || '');
      const id = body?.id || (req.query.id ? Number(req.query.id) : undefined);
      if (action === 'restore' && id) {
        try { await (prisma as any)?.cspReport?.update?.({ where: { id }, data: { deletedAt: null } }); } catch {}
  try { await (prisma as any)?.auditLog?.create?.({ data: { actor: (req as any).admin || 'admin', action: 'csp:restore', details: String(id) } }); } catch {}
        return res.json({ ok: true, id });
      }
    } catch (e) {}
    return res.status(400).json({ ok: false, error: 'invalid_action' });
  }

  return res.status(405).end('Method Not Allowed');
}

// Attach global push hook so /api/csp-report can push here without import cycles.
(globalThis as any).__pushCspReport = function pushCspReport(item: CspItem) {
  try {
    buf.push(item);
    if (buf.length > MAX) buf.splice(0, buf.length - MAX);
  } catch {}
};
