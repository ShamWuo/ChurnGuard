import React, { useEffect, useState } from 'react';

type Ready = { ok?: boolean; db?: boolean; stripe?: boolean; csrf?: boolean; envErrors?: string[] } | null;
type Cfg = { priceDisplay?: string | null; priceId?: string | null; stripeConfigured?: boolean } | null;

export function OnboardingChecklist({ compact = false }: { compact?: boolean }) {
  const [ready, setReady] = useState<Ready>(null);
  const [cfg, setCfg] = useState<Cfg>(null);
  useEffect(() => {
    fetch('/api/ready').then(r=>r.json()).then(setReady).catch(()=>setReady({ ok:false } as any));
    fetch('/api/config').then(r=>r.json()).then(setCfg).catch(()=>setCfg({ stripeConfigured:false }));
  }, []);

  const items = [
    { label: 'Database reachable', ok: !!ready?.db },
    { label: 'Admin credentials set', ok: !(ready?.envErrors||[]).includes('ADMIN_USER/ADMIN_PASS or ADMIN_SECRET') },
    { label: 'CSRF configured', ok: !!ready?.csrf && !(ready?.envErrors||[]).includes('CSRF_SECRET') },
    { label: 'Stripe key set', ok: !!cfg?.stripeConfigured },
    { label: 'Stripe price ID set', ok: !!cfg?.priceId },
    { label: 'Webhook secret set (optional for local)', ok: !(ready?.envErrors||[]).includes('STRIPE_WEBHOOK_SECRET') },
  ];

  return (
    <section className="panel" style={{ marginTop: compact ? 12 : 24 }}>
      <h3>Onboarding checklist</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: '8px 0' }}>
        {items.map((it) => (
          <li key={it.label} className="mono" style={{ margin: '6px 0' }}>
            <span style={{ display: 'inline-block', width: 16, color: it.ok ? '#16a34a' : '#dc2626' }}>{it.ok ? '✔' : '✘'}</span>
            {it.label}
          </li>
        ))}
      </ul>
      <div className="mt-4">
        <a className="btn small" href="/docs/stripe-setup">Open Stripe setup</a>
      </div>
    </section>
  );
}
