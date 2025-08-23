import { useEffect, useState } from 'react';
import { GetServerSideProps } from 'next';
import jwt from 'jsonwebtoken';

export default function Admin() {
  const [cases, setCases] = useState<any[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [audit, setAudit] = useState<any>({ logs: [], total: 0, page: 1, pageSize: 20, action: '', actor: '' });
  const [settings, setSettings] = useState<any>({ dunningBaseHours: '', dunningMaxAttempts: '', safeMode: false });
  const [dryRun, setDryRun] = useState<boolean>(false);
  const [ready, setReady] = useState<any | null>(null);

  // map form state
  const [email, setEmail] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [msg, setMsg] = useState("");
  const [csrf, setCsrf] = useState<string | null>(null);

  useEffect(() => {
  fetch('/api/admin/dunning-list').then(r => r.json()).then(j => setCases(j.cases || []));
  fetch('/api/admin/csrf').then(r => r.json()).then(j => setCsrf(j.token)).catch(() => setCsrf(null));
  fetch('/api/admin/audit-list?page=1&pageSize=20').then(r => r.json()).then(j => setAudit({ ...j, action: '', actor: '' }));
  fetch('/api/admin/settings').then(r => r.json()).then(s => setSettings({ dunningBaseHours: s?.dunningBaseHours ?? '', dunningMaxAttempts: s?.dunningMaxAttempts ?? '', safeMode: !!s?.safeMode }));
  fetch('/api/ready').then(r => r.json()).then(setReady).catch(() => setReady({ ok: false }));
  }, []);

  async function runDunning() {
    setRunning(true);
    try {
  const r = await fetch('/api/admin/run-dunning?dryRun=' + String(dryRun), { method: 'POST', headers: { ...(csrf ? { 'x-csrf-token': csrf } : {}) } });
      const j = await r.json();
      setResult(j);
      // refresh list
  const l = await fetch('/api/admin/dunning-list').then(r => r.json());
      setCases(l.cases || []);
    } finally { setRunning(false); }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg('Saving...');
    try {
  const res = await fetch('/api/admin/map', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'x-csrf-token': csrf } : {}) }, body: JSON.stringify({ email, customerId }) });
      const data = await res.json();
      setMsg(JSON.stringify(data));
    } catch (err: any) {
      setMsg(err.message || 'error');
    }
  }

  async function previewTemplate() {
    try {
  const r = await fetch('/api/admin/template-preview', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'x-csrf-token': csrf } : {}) }, body: JSON.stringify({ kind: 'reminder' }) });
      const j = await r.json();
      alert('Template preview subject:\n' + j.subject);
    } catch (e: any) { alert(e.message || 'error'); }
  }

  async function simulateWebhook() {
    try {
  const r = await fetch('/api/admin/simulate-webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'x-csrf-token': csrf } : {}) }, body: JSON.stringify({ type: 'invoice.payment_failed', data: { object: { id: 'in_123', customer: 'cus_test' } } }) });
      const j = await r.json();
      alert('Simulated: ' + JSON.stringify(j));
    } catch (e: any) { alert(e.message || 'error'); }
  }

  const [rl, setRl] = useState<{ items?: any[] } | null>(null);
  async function refreshRateLimits() {
    try { const j = await (await fetch('/api/admin/rate-limit-status')).json(); setRl(j); } catch {}
  }
  useEffect(() => { refreshRateLimits(); const t = setInterval(refreshRateLimits, 15000); return () => clearInterval(t); }, []);

  return (
    <main className="container">
      <h1>Admin</h1>
      <div className="right">
        <form method="post" action="/api/admin/logout">
          {csrf && <input type="hidden" name="x-csrf-token" value={csrf} />}
          <button className="btn small" type="submit">Logout</button>
        </form>
      </div>
      {ready && (
        <section className="panel mb-16">
          <h2>Status</h2>
          <div className="flex wrap">
            <Badge label="App" ok={!!ready.ok} />
            <Badge label="DB" ok={!!ready.db} />
            <Badge label="Stripe" ok={!!ready.stripe} />
            <Badge label="SMTP" ok={!!ready.smtp} />
            {typeof ready.csrf !== 'undefined' && <Badge label="CSRF" ok={!!ready.csrf} />}
            <Badge label="Redis" ok={!!ready.redis} />
          </div>
          <div className="mt-8">
            <a className="mono" href="/api/admin/rate-limit-status" target="_blank" rel="noreferrer">View raw rate limits</a>
          </div>
          <div className="mt-8">
            <strong>Rate limits</strong>
            <div className="panel mt-6">
              {rl?.items?.length ? (
                <table className="table mono">
                  <thead><tr><th>Key</th><th>Count/Tokens</th><th>TTL (ms)</th></tr></thead>
                  <tbody>
                    {rl.items.map((it: any, i: number) => (
                      <tr key={i}><td>{it.key}</td><td>{it.count ?? it.tokens ?? '-'}</td><td>{it.ttlMs ?? it.resetAt ?? '-'}</td></tr>
                    ))}
                  </tbody>
                </table>
              ) : <em>No keys</em>}
            </div>
          </div>
          <form method="post" action="/api/admin/cache-purge" onSubmit={(e)=>{ if(!confirm('Purge analytics cache?')) e.preventDefault(); }} className="mt-12">
            <input type="hidden" name="scope" value="metrics" />
            {csrf && <input type="hidden" name="x-csrf-token" value={csrf} />}
            <button className="btn" type="submit">Purge metrics cache</button>
          </form>
          {Array.isArray(ready.envErrors) && ready.envErrors.length > 0 && (
            <div className="mt-8 error">
              <strong>Missing/invalid env:</strong>
              <ul>
                {ready.envErrors.map((e: string, i: number) => (<li key={i}>{e}</li>))}
              </ul>
            </div>
          )}
        </section>
      )}
      <section className="mb-24">
        <h2>Map user to Stripe customer</h2>
  <form onSubmit={save} className="grid max-w-700">
          <input className="input" placeholder="User email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <input className="input" placeholder="Stripe customer id (cus_...)" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
          <button className="btn" type="submit">Save</button>
        </form>
        <pre className="code-block mt-12">{msg}</pre>
      </section>
      <section className="mt-24">
        <h2>Audit Log</h2>
        <p>Recent admin actions.</p>
  <div className="flex items-center">
          <input className="input" placeholder="Filter action" value={audit.action} onChange={(e) => setAudit({ ...audit, action: e.target.value })} />
          <input className="input" placeholder="Filter actor" value={audit.actor} onChange={(e) => setAudit({ ...audit, actor: e.target.value })} />
          <button className="btn" onClick={async () => { const j = await (await fetch(`/api/admin/audit-list?page=1&pageSize=${audit.pageSize}&action=${encodeURIComponent(audit.action||'')}&actor=${encodeURIComponent(audit.actor||'')}`)).json(); setAudit({ ...j, action: audit.action, actor: audit.actor }); }}>Apply</button>
          <button className="btn" onClick={async () => { const p = Math.max(1, audit.page - 1); const j = await (await fetch(`/api/admin/audit-list?page=${p}&pageSize=${audit.pageSize}&action=${encodeURIComponent(audit.action||'')}&actor=${encodeURIComponent(audit.actor||'')}`)).json(); setAudit({ ...j, action: audit.action, actor: audit.actor }); }}>Prev</button>
          <button className="btn" onClick={async () => { const p = audit.page + 1; const j = await (await fetch(`/api/admin/audit-list?page=${p}&pageSize=${audit.pageSize}&action=${encodeURIComponent(audit.action||'')}&actor=${encodeURIComponent(audit.actor||'')}`)).json(); setAudit({ ...j, action: audit.action, actor: audit.actor }); }}>Next</button>
          <a href={`/api/admin/audit-export?action=${encodeURIComponent(audit.action||'')}&actor=${encodeURIComponent(audit.actor||'')}`} target="_blank" rel="noreferrer">Export CSV</a>
        </div>
        <ul>
          {audit.logs && audit.logs.map((l: any) => (
            <li key={l.id}>{new Date(l.createdAt).toLocaleString()} — {l.actor || 'unknown'} — {l.action} — {l.details}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2>Dunning Cases</h2>
        <p>View dunning cases and trigger a run (server will send emails/slack according to config).</p>
        <div className="flex items-center mb-16">
          <label className="mr-8"><input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} /> Dry run</label>
          <button className="btn" onClick={runDunning} disabled={running}>{running ? 'Running...' : 'Run Dunning Now'}</button>
          <button className="btn ml-8" onClick={previewTemplate}>Preview Template</button>
          <button className="btn ml-8" onClick={simulateWebhook}>Simulate Webhook</button>
        </div>
        {result && (
          <pre className="code-block">{JSON.stringify(result, null, 2)}</pre>
        )}

    <table className="table">
          <thead>
      <tr><th>Invoice</th><th>Status</th><th>Amount</th><th>Customer</th></tr>
          </thead>
          <tbody>
            {cases.map(c => (
              <tr key={c.id}>
        <td>{c.stripeInvoiceId}</td>
        <td>{c.status}</td>
        <td>{(c.amountDue/100).toFixed(2)} {c.currency}</td>
        <td>{c.stripeCustomerId}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-24">
        <h2>Settings</h2>
  <form onSubmit={async (e) => { e.preventDefault(); const res = await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'x-csrf-token': csrf } : {}) }, body: JSON.stringify({ dunningBaseHours: Number(settings.dunningBaseHours)||null, dunningMaxAttempts: Number(settings.dunningMaxAttempts)||null, safeMode: !!settings.safeMode }) }); const j = await res.json(); alert('Saved'); }} className="grid max-w-400">
          <label>Base Hours <input type="number" value={settings.dunningBaseHours} onChange={(e) => setSettings({ ...settings, dunningBaseHours: e.target.value })} /></label>
          <label>Max Attempts <input type="number" value={settings.dunningMaxAttempts} onChange={(e) => setSettings({ ...settings, dunningMaxAttempts: e.target.value })} /></label>
          <label><input type="checkbox" checked={settings.safeMode} onChange={(e) => setSettings({ ...settings, safeMode: e.target.checked })} /> Safe Mode (no emails or charges)</label>
          <button className="btn" type="submit">Save Settings</button>
        </form>
      </section>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const token = ctx.req.cookies['admin_token'];
  const secret = process.env.ADMIN_SECRET;
  if (!token || !secret) {
    return { redirect: { destination: '/admin-login', permanent: false } };
  }
  try {
    jwt.verify(token, secret);
    return { props: {} };
  } catch (e) {
    return { redirect: { destination: '/admin-login', permanent: false } };
  }
};

function Badge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span title={ok ? 'OK' : 'Not Ready'} className={`badge ${ok ? 'ok' : 'bad'}`}>
      <span className={`dot ${ok ? 'ok' : 'bad'}`} /> {label}
    </span>
  );
}
