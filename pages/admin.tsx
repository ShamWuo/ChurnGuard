import { useEffect, useState } from 'react';
import { useToast, useConfirm, usePrompt } from './_app';
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
  const [recovered, setRecovered] = useState<any | null>(null);
  const [retentionDays, setRetentionDays] = useState<number>(30);
  const [purgeResult, setPurgeResult] = useState<any | null>(null);
  const [founderSlots, setFounderSlots] = useState<{ total: number; used: number; remaining: number } | null>(null);
  const [founderInvoice, setFounderInvoice] = useState('');
  const [founderCustomer, setFounderCustomer] = useState('');
  const [markingFounder, setMarkingFounder] = useState(false);
  const [founderMarkResult, setFounderMarkResult] = useState<string | null>(null);

  // map form state
  const [email, setEmail] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [msg, setMsg] = useState("");
  const [csrf, setCsrf] = useState<string | null>(null);

  useEffect(() => {
  refreshAll();
  const interval = setInterval(refreshAll, 30000);
  return () => clearInterval(interval);
  }, []);

  async function refreshAll() {
    try { const d = await (await fetch('/api/admin/dunning-list')).json(); setCases(d.cases || []); } catch {};
    try { const c = await (await fetch('/api/admin/csrf')).json(); setCsrf(c.token); } catch { setCsrf(null); };
    try { const a = await (await fetch('/api/admin/audit-list?page=1&pageSize=20')).json(); setAudit({ ...a, action: '', actor: '' }); } catch {};
    try { const r = await (await fetch('/api/admin/recovered')).json(); setRecovered(r); } catch { setRecovered(null); };
    try { const s = await (await fetch('/api/admin/settings')).json(); setSettings({ dunningBaseHours: s?.dunningBaseHours ?? '', dunningMaxAttempts: s?.dunningMaxAttempts ?? '', safeMode: !!s?.safeMode }); } catch {};
    try { const fs = await (await fetch('/api/promo/founder-slots')).json(); setFounderSlots(fs); } catch { setFounderSlots(null); };
    try { const rdy = await (await fetch('/api/ready')).json(); setReady(rdy); } catch { setReady({ ok: false }); };
  }
  const toast = useToast();
  const confirm = useConfirm();
  const prompt = usePrompt();

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
  toast?.('Template preview: ' + j.subject);
  } catch (e: any) { toast?.(e.message || 'error'); }
  }

  async function simulateWebhook() {
    try {
  const r = await fetch('/api/admin/simulate-webhook', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'x-csrf-token': csrf } : {}) }, body: JSON.stringify({ type: 'invoice.payment_failed', data: { object: { id: 'in_123', customer: 'cus_test' } } }) });
      const j = await r.json();
  toast?.('Simulated webhook (see logs)');
  } catch (e: any) { toast?.(e.message || 'error'); }
  }

  // New admin user operations: export CSV and delete (dry-run + confirm)
  const [userOpMsg, setUserOpMsg] = useState<string | null>(null);
  async function exportCsvForEmail(targetEmail: string) {
    setUserOpMsg('Exporting...');
    try {
      const url = `/api/admin/export-user?email=${encodeURIComponent(targetEmail)}&format=csv`;
      // let browser send cookies automatically
      const r = await fetch(url, { method: 'GET', credentials: 'same-origin' });
      if (!r.ok) throw new Error('export failed ' + r.status);
      const text = await r.text();
      // trigger a download in browser
      if (typeof window !== 'undefined' && typeof document !== 'undefined') {
        const blob = new Blob([text], { type: 'text/csv' });
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const safeEmail = targetEmail.replace(/[^a-z0-9@.-]/gi, '_');
        a.href = href;
        a.download = `user-${safeEmail}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
      }
  setUserOpMsg('Export completed (download started)');
    } catch (e: any) { setUserOpMsg(e.message || 'error'); }
  }

  async function deleteUserTarget(targetEmail: string, doDry: boolean) {
    setUserOpMsg(doDry ? 'Dry-run...' : 'Deleting...');
    try {
      const r = await fetch('/api/admin/delete-user', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'x-csrf-token': csrf } : {}) }, body: JSON.stringify({ email: targetEmail, dry: doDry }) });
      const j = await r.json();
      // Format response for readability
      if (j?.error) {
        setUserOpMsg(`Error: ${j.error}${j.message ? ' — ' + j.message : ''}`);
      } else if (j?.dry) {
        setUserOpMsg(`Dry-run: ${j.counts?.cspReports ?? 0} CSP reports, ${j.counts?.subscriptions ?? 0} subscriptions would be affected`);
      } else if (j?.ok) {
        const parts = [] as string[];
        if (j.counts) parts.push(`${j.counts.cspReports ?? 0} CSP reports`, `${j.counts.subscriptions ?? 0} subscriptions`);
        if (j.partial) parts.push('(partial)');
        if (j.actor) parts.push(`by ${j.actor}`);
        setUserOpMsg(`Deleted: ${parts.join(' ' )}`);
      } else {
        setUserOpMsg(JSON.stringify(j));
      }
    } catch (e: any) { setUserOpMsg(e.message || 'error'); }
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
      <nav className="mt-8">
        <a className="btn small" href="/admin-csp">CSP reports</a>
        <a className="btn small ml-8" href="/admin-previews">Email previews</a>
      </nav>
      {ready && (
        <section className="panel mb-16">
          <h2>Status</h2>
      {!ready.stripe && (
            <div className="mt-4" style={{ padding: 12, background: '#fff7ed', border: '1px solid #fed7aa' }}>
              <strong>Stripe not configured.</strong> Set STRIPE_SECRET_KEY (and STRIPE_WEBHOOK_SECRET for webhooks) to enable checkout, portal, and billing flows. See
        {' '}<a className="mono" href="/docs/stripe-setup" target="_blank" rel="noreferrer">Stripe setup guide</a>.
            </div>
          )}
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
            <h3>Recovered revenue</h3>
            {recovered ? (
              <div>
                <div className="panel mb-4">
                  <strong>Total recovered:</strong> {(recovered.recoveredRevenue/100).toFixed(2)}
                  {' '}({recovered.count} attributions)
                </div>
                {/* small sparkline + list */}
                {recovered.perBucket && Object.keys(recovered.perBucket).length > 0 && (
                  <div className="mt-4">
                    <div style={{ width: 320 }}>
                      <Sparkline series={recovered.perBucket} />
                    </div>
                    <ul className="mono mt-2">
                      {Object.entries(recovered.perBucket).map(([k, v]) => (
                        <li key={k}>{k}: {(Number(v)/100).toFixed(2)}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-4">
                  <a className="mono" href={`/api/admin/recovered?format=csv`} target="_blank" rel="noreferrer">Download CSV</a>
                </div>
              </div>
            ) : <em>Loading metrics...</em>}
          <div className="mt-8">
            <h3>Founder slots</h3>
              {founderSlots ? (
              <div>
                <div className="panel mb-4">{founderSlots.remaining} of {founderSlots.total} remaining <button className="btn small ml-4" onClick={async () => { const fs = await (await fetch('/api/promo/founder-slots')).json(); setFounderSlots(fs); }}>Refresh</button></div>
                <div className="grid">
                  <label className="mt-2">Invoice ID
                    <input aria-label="Invoice ID" className="input" placeholder="inv_..." value={founderInvoice} onChange={(e) => setFounderInvoice(e.target.value)} />
                  </label>
                  <label className="mt-2">Customer ID
                    <input aria-label="Customer ID" className="input" placeholder="cus_... (optional)" value={founderCustomer} onChange={(e) => setFounderCustomer(e.target.value)} />
                  </label>
                  <div className="mt-2">
                    <button className="btn" disabled={!founderInvoice || markingFounder} onClick={async () => {
                      if (!founderInvoice) { toast?.('Invoice id required'); return; }
                      const ok = await confirm('Mark invoice ' + founderInvoice + ' as founder purchase?');
                      if (!ok) return;
                      setMarkingFounder(true);
                      try {
                        const r = await fetch('/api/admin/mark-founder', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'x-csrf-token': csrf } : {}) }, body: JSON.stringify({ invoiceId: founderInvoice, customerId: founderCustomer }) });
                        const j = await r.json();
                        if (j.ok) {
                          toast?.('Marked as founder purchase');
                          setFounderSlots(fs => fs ? { ...fs, used: fs.used + 1, remaining: Math.max(0, fs.remaining - 1) } : fs);
                          setFounderInvoice(''); setFounderCustomer('');
                          setFounderMarkResult('Marked successfully');
                        } else {
                          toast?.('Failed: ' + (j.error || 'error'));
                          setFounderMarkResult('Failed: ' + (j.error || 'error'));
                        }
                      } catch (e: any) {
                        toast?.(e?.message || 'Network error');
                        setFounderMarkResult(e?.message || 'Network error');
                      } finally { setMarkingFounder(false); setTimeout(() => setFounderMarkResult(null), 4000); }
                    }}>{markingFounder ? 'Marking...' : 'Mark founder purchase'}</button>
                    {founderMarkResult && <div className="mt-2 mono">{founderMarkResult}</div>}
                  </div>
                </div>
              </div>
            ) : <em>Loading...</em>}
          </div>
          </div>
          <div className="mt-8">
            <h3>Purge soft-deleted CSP reports</h3>
            <label>TTL days: <input className="input" type="number" value={retentionDays} onChange={(e) => setRetentionDays(Number(e.target.value || 30))} /></label>
            <button className="btn ml-4" onClick={async () => { setPurgeResult(null); const r = await fetch('/api/admin/csp-retention', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'x-csrf-token': csrf } : {}) }, body: JSON.stringify({ ttlDays: retentionDays }) }); const j = await r.json(); setPurgeResult(j); }}>Purge</button>
            {purgeResult && <div className="mt-4">Result: {JSON.stringify(purgeResult)}</div>}
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
          <form method="post" action="/api/admin/cache-purge" onSubmit={async (e)=>{ if(!(await confirm('Purge analytics cache?'))) e.preventDefault(); }} className="mt-12">
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

      <div className="mt-8 panel">
        <h3>User operations</h3>
        <div className="flex items-center">
          <input className="input" placeholder="user@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button className="btn ml-4" onClick={() => exportCsvForEmail(email)}>Export CSV</button>
          <button className="btn ml-4" onClick={() => deleteUserTarget(email, true)}>Delete (dry-run)</button>
          <button className="btn ml-4" onClick={async () => {
            if (!email) { setUserOpMsg('Enter email first'); return; }
            const typed = await prompt(`Type the email ${email} to confirm deletion:`, email);
            if (typed === email) {
              deleteUserTarget(email, false);
            } else {
              setUserOpMsg('Deletion cancelled — typed email did not match');
            }
          }}>Delete (confirm)</button>
        </div>
        {userOpMsg && <pre className="code-block mt-4">{userOpMsg}</pre>}
      </div>

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
  <form onSubmit={async (e) => { e.preventDefault(); const res = await fetch('/api/admin/settings', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(csrf ? { 'x-csrf-token': csrf } : {}) }, body: JSON.stringify({ dunningBaseHours: Number(settings.dunningBaseHours)||null, dunningMaxAttempts: Number(settings.dunningMaxAttempts)||null, safeMode: !!settings.safeMode }) }); const j = await res.json(); toast?.('Settings saved'); }} className="grid max-w-400">
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

function Sparkline({ series }: { series: Record<string, number> }) {
  const keys = Object.keys(series).slice(-30); // last 30
  const vals = keys.map(k => series[k] || 0);
  const max = Math.max(...vals, 1);
  const min = Math.min(...vals, 0);
  const width = 320;
  const height = 40;
  const step = width / Math.max(1, vals.length - 1);
  const points = vals.map((v, i) => {
    const x = i * step;
    const y = height - ((v - min) / (max - min || 1)) * height;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline fill="none" stroke="#2563eb" strokeWidth={2} points={points} />
    </svg>
  );
}
