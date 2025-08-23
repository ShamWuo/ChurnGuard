import { useState } from 'react';

export default function AdminLogin() {
  const [user, setUser] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const showUser = !!process.env.NEXT_PUBLIC_ADMIN_USER;

  async function submit(e: any) {
    e.preventDefault();
    setMsg('Signing in...');
    const body: any = { password: pw };
    if (showUser) body.username = user;
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const j = await r.json();
    if (j.ok) { setMsg('Signed in — go to /admin'); } else { setMsg('Failed: ' + JSON.stringify(j)); }
  }

  return (
    <main className="container container--narrow">
      <h1>Admin login</h1>
      <p>Set `ADMIN_SECRET` in your environment before using this page.</p>
      <form onSubmit={submit} className="grid">
        {showUser && (
          <label>
            <span className="sr-only">Admin username</span>
            <input className="input" placeholder="Admin username" value={user} onChange={e => setUser(e.target.value)} aria-label="Admin username" />
          </label>
        )}
        <label>
          <span className="sr-only">Admin password</span>
          <input className="input" type="password" placeholder="Admin password" value={pw} onChange={e => setPw(e.target.value)} aria-label="Admin password" />
        </label>
        <button className="btn primary" type="submit">Sign in</button>
      </form>
      <pre className="code-block mt-12" role="status" aria-live="polite">{msg}</pre>
    </main>
  );
}
