import React, { useEffect, useState } from 'react';
import { useToast } from './_app';
import { OnboardingChecklist } from '../components/OnboardingChecklist';

export default function Pricing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cfg, setCfg] = useState<{ priceDisplay?: string | null; priceId?: string | null; stripeConfigured?: boolean } | null>(null);
  const [founderSlots, setFounderSlots] = useState<{ total: number; used: number; remaining: number } | null>(null);

  useEffect(() => { fetch('/api/config').then(r => r.json()).then(setCfg).catch(() => setCfg({ stripeConfigured: false })); }, []);
  useEffect(() => { fetch('/api/promo/founder-slots').then(r => r.json()).then(setFounderSlots).catch(() => setFounderSlots(null)); }, []);

  const checkout = async (priceId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/checkout/create-session', { method: 'POST', body: JSON.stringify({ priceId }), headers: { 'Content-Type': 'application/json' } });
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
  const toast = useToast();

  return (
    <div>
      <h1>Pricing</h1>
      <p>Simple pricing for early access. Founder promo: 25% off first year for first 50 customers.</p>
      {cfg && !cfg.stripeConfigured && (
        <div style={{ padding: 12, background: '#fff7ed', border: '1px solid #fed7aa', marginBottom: 12 }}>
          <strong>Stripe not configured:</strong> set STRIPE_SECRET_KEY and STRIPE_PRICE_ID to enable checkout.
        </div>
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        {founderSlots && (
          <div style={{ marginBottom: 12, width: '100%' }}>
            <strong>Founder promo:</strong> {founderSlots.remaining} of {founderSlots.total} slots remaining — 25% off first year for early adopters.
          </div>
        )}
        <div style={{ border: '1px solid #ddd', padding: 12 }}>
          <h3>Starter</h3>
          <p>{cfg?.priceDisplay || '$99 / year (intro) — $9/mo equivalent'}</p>
          <button disabled={!cfg?.stripeConfigured || !cfg?.priceId} onClick={async () => {
            if (!cfg?.stripeConfigured || !cfg?.priceId) { toast?.('Checkout not configured'); return; }
            await checkout(cfg?.priceId || '');
          }}>
            {cfg?.stripeConfigured ? `Buy — ${cfg?.priceDisplay || '$99/yr'}` : 'Configure Stripe to enable'}
          </button>
        </div>
        <div style={{ border: '1px solid #ddd', padding: 12 }}>
          <h3>Pro</h3>
          <p>$299 one-time (code license) or $49 / month for hosted</p>
          <button disabled={!cfg?.stripeConfigured} onClick={() => checkout(cfg?.priceId || '')}>Checkout</button>
        </div>
      </div>
      {loading && <p>Redirecting to Stripe...</p>}
      {error && <p style={{ color: 'crimson' }}>{error}</p>}
      <div className="mt-16">
        <OnboardingChecklist compact />
      </div>
    </div>
  );
}
