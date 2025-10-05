import { useEffect, useState } from 'react';
import Link from 'next/link';

type Item = { t: number; violated?: string; doc?: string; blocked?: string; ua?: string };

export default function AdminCsp() {
  const [items, setItems] = useState<Item[]>([]);
  const [now, setNow] = useState<number>(Date.now());
  const [err, setErr] = useState<string>('');
  const [since, setSince] = useState<string>('');
  const [q, setQ] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);
  const [total, setTotal] = useState<number>(0);
  const [detail, setDetail] = useState<Item | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [pendingDelete, setPendingDelete] = useState<{ id?: number; ts?: number; text?: string } | null>(null);
  const [deleting, setDeleting] = useState<boolean>(false);
  const [showDeleted, setShowDeleted] = useState<boolean>(false);

  async function load() {
  setErr('');
  setLoading(true);
    try {
      const params = new URLSearchParams();
      if (since) params.set('since', since);
      if (q) params.set('q', q);
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      const res = await fetch('/api/admin/csp-reports?' + params.toString());
      const j = await res.json();
      if (res.ok) {
        setItems(j.items || []);
        setNow(j.now || Date.now());
        setTotal(j.total || 0);
      } else setErr(JSON.stringify(j));
    } catch (e: any) { setErr(String(e?.message || e)); }
  finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [page, pageSize]);

  async function clearAll() {
    await fetch('/api/admin/csp-reports', { method: 'DELETE' });
    setPage(1);
    load();
  }

  function openDetail(it: Item) { setDetail(it); }
  function closeDetail() { setDetail(null); }

  // debounced search
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 350);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function confirmDelete(id?: number, ts?: number, text?: string) {
    setPendingDelete({ id, ts, text });
  }

  async function doDelete(id?: number, ts?: number) {
    setDeleting(true);
    try {
      const params = new URLSearchParams();
      if (id) params.set('id', String(id));
      if (ts) params.set('ts', String(ts));
      await fetch('/api/admin/csp-reports?' + params.toString(), { method: 'DELETE' });
      setPendingDelete(null);
      // reload first page after delete to keep UX predictable
      setPage(1);
      await load();
    } catch (e) { setErr(String(e || 'delete failed')); }
    finally { setDeleting(false); }
  }

  function copyJson(it: Item) {
    try {
      navigator.clipboard.writeText(JSON.stringify(it, null, 2));
    } catch {}
  }

  return (
    <main className="container container--narrow">
      <h1 className="mt-0">CSP reports</h1>
      <p className="muted">Most recent first. Requires admin login.</p>

      <div className="flex gap-8 wrap mb-8">
        <input className="input" placeholder="Search (violated/doc/ua)" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <label>Since: <input className="input" placeholder="ms epoch" value={since} onChange={(e) => setSince(e.target.value)} /></label>
        <button className="btn" onClick={() => { setPage(1); load(); }}>Apply</button>
        <button className="btn" onClick={() => { setQ(''); setSince(''); setPage(1); load(); }}>Reset</button>
        <label className="ml-6"><input type="checkbox" checked={showDeleted} onChange={(e) => { setShowDeleted(e.target.checked); setPage(1); }} /> Show deleted</label>
      </div>

      <div className="flex gap-8 wrap mb-16">
        <button className="btn" onClick={load}>Refresh</button>
        <a className="btn" href={`/api/admin/csp-reports${since || q ? '?'+ new URLSearchParams({ since, q }).toString() : ''}&format=csv`} target="_blank" rel="noreferrer">Export CSV</a>
        <button className="btn" onClick={clearAll}>Clear</button>
        <Link className="btn" href="/admin">Back to admin</Link>
      </div>

      {err && <p className="error">{err}</p>}

      <table className="table">
        <thead>
          <tr>
            <th className="w-100px">Age</th>
            <th>Violated</th>
            <th>Document</th>
            <th>Blocked</th>
            <th>User-Agent</th>
            <th className="w-120px">Actions</th>
          </tr>
        </thead>
        <tbody>
          {(items || []).map((it, i) => {
            const ageSec = Math.max(0, Math.floor((now - it.t) / 1000));
            return (
              <tr key={i}>
                <td>{ageSec}s</td>
                <td className="mono">{it.violated || ''}</td>
                <td className="mono">{it.doc || ''}</td>
                <td className="mono">{it.blocked || ''}</td>
                <td>{it.ua || ''}</td>
                        <td>
                          <button className="btn small" onClick={() => openDetail(it)} disabled={loading || deleting}>View JSON</button>
                          <button className="btn small ml-4" onClick={() => copyJson(it)} disabled={loading || deleting}>Copy</button>
                          {/* if id exists, show delete/restore by id, otherwise delete by ts */}
                          {(it as any).deletedAt ? (
                            <>
                              <button className="btn small ml-4" onClick={() => { /* restore */ fetch('/api/admin/csp-reports?id=' + (it as any).id, { method: 'POST', body: JSON.stringify({ action: 'restore', id: (it as any).id }) }).then(() => load()); }} disabled={loading || deleting}>Restore</button>
                              <button className="btn small ml-4 danger" onClick={() => confirmDelete((it as any).id, undefined, 'Hard delete record?')} disabled={loading || deleting}>Hard Delete</button>
                            </>
                          ) : (
                            <button className="btn small ml-4" onClick={() => confirmDelete((it as any).id, it.t, (it.violated || it.doc || '').slice(0, 120))} disabled={loading || deleting}>Delete</button>
                          )}
                        </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex items-center mt-12">
        <button className="btn" onClick={() => { setPage(Math.max(1, page - 1)); load(); }} disabled={page <= 1}>Prev</button>
        <span className="mono ml-8 mr-8">Page {page} — {total} total</span>
        <button className="btn" onClick={() => { setPage(page + 1); load(); }} disabled={page * pageSize >= total}>Next</button>
        <label className="ml-12">Page size: <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}>
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
          <option value={100}>100</option>
        </select></label>
      </div>

      {loading && <p className="muted mt-8">Loading…</p>}

      {pendingDelete && (
        <div className="modal">
          <div className="modal-content">
            <h3>Confirm delete</h3>
            <p>Are you sure you want to delete this CSP report?</p>
            {pendingDelete.text && <pre className="code-block">{pendingDelete.text}</pre>}
            <div className="flex gap-4 mt-8">
              <button className="btn" onClick={() => setPendingDelete(null)} disabled={deleting}>Cancel</button>
              <button className="btn danger" onClick={() => doDelete(pendingDelete.id, pendingDelete.ts)} disabled={deleting}>{deleting ? 'Deleting…' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}

      {detail && (
        <div className="modal">
          <div className="modal-content">
            <h3>Report detail</h3>
            <div className="grid gap-8">
              <div>
                <h4>Summary</h4>
                <pre className="code-block">{JSON.stringify({ violated: detail.violated, doc: detail.doc, blocked: detail.blocked, ua: detail.ua }, null, 2)}</pre>
              </div>
              <div>
                <h4>Raw payload</h4>
                <pre className="code-block">{JSON.stringify((detail as any).raw || {}, null, 2)}</pre>
              </div>
              <div>
                <h4>Headers</h4>
                <pre className="code-block">{JSON.stringify((detail as any).headers || {}, null, 2)}</pre>
              </div>
            </div>
            <div className="mt-8"><button className="btn" onClick={closeDetail}>Close</button></div>
          </div>
        </div>
      )}

    </main>
  );
}
