import React, { useEffect, useState } from 'react';

export default function AdminSettings() {
  const [stripeSecret, setStripeSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
  fetch('/api/admin/dev-settings')
      .then((r) => r.json())
      .then((d) => {
        setStripeSecret(d.stripeSecret || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setMessage(null);
    const res = await fetch('/api/admin/settings', {
  // dev-only endpoint
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'x-admin-secret': (window as any).__ADMIN_SECRET || '' },
  body: JSON.stringify({ stripeSecret }),
    });
    const data = await res.json();
    if (data.ok) setMessage('Saved to .env.local'); else setMessage(data.error || 'Failed');
  };

  if (loading) return <div>Loading settings...</div>;

  return (
    <div>
      <h1>Admin Settings (Dev only)</h1>
      <p>Paste Stripe secret for local demos. This writes to <code>.env.local</code> (not production).</p>
      <div>
        <label>STRIPE_SECRET</label>
        <br />
        <input style={{ width: 600 }} value={stripeSecret} onChange={(e) => setStripeSecret(e.target.value)} />
      </div>
      <div style={{ marginTop: 8 }}>
        <button onClick={save}>Save</button>
      </div>
      {message && <p>{message}</p>}
    </div>
  );
}
