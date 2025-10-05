import React, { useState } from 'react';

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkout = async (priceId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout/session', { method: 'POST', body: JSON.stringify({ priceId }), headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
      setError(data.error || 'Unknown error');
    } catch (e: any) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Pricing</h1>
      <p>Demo pricing page. Configure Stripe (STRIPE_SECRET) to enable checkout.</p>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ border: '1px solid #ddd', padding: 12 }}>
          <h3>Starter</h3>
          <p>$10 / month</p>
          <button onClick={() => checkout('price_XXX_STARTER')}>Checkout</button>
        </div>
        <div style={{ border: '1px solid #ddd', padding: 12 }}>
          <h3>Pro</h3>
          <p>$49 / month</p>
          <button onClick={() => checkout('price_XXX_PRO')}>Checkout</button>
        </div>
      </div>
      {loading && <p>Redirecting to Stripe...</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
    </div>
  );
}
