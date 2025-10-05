import React, { useEffect, useState } from 'react';

export default function AdminBilling() {
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/billing')
      .then((r) => r.json())
      .then((d) => setSummary(d))
      .catch((e) => setSummary({ connected: false, message: String(e) }))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading billing...</div>;

  if (!summary) return <div>No billing data</div>;

  if (!summary.connected) {
    return (
      <div>
        <h1>Billing (Stripe)</h1>
        <p style={{ color: 'crimson' }}>{summary.message}</p>
        <p>To enable billing, set the environment variable <code>STRIPE_SECRET</code> or <code>STRIPE_API_KEY</code>.</p>
        <p>In production use a managed secrets store (Vercel/GH Actions/Cloud provider).</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Billing (Stripe)</h1>
      <ul>
        <li>Plans: {summary.plans}</li>
        <li>Active subscriptions: {summary.activeSubscriptions}</li>
        <li>Customers: {summary.customers}</li>
      </ul>
    </div>
  );
}
