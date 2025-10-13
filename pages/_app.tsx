import type { AppProps } from 'next/app'
import { createContext, useContext, useEffect, useState } from 'react'
import '../styles/globals.css'

function Footer() {
  const toast = useToast();
  const confirm = useConfirm();
  return (
    <footer style={{ marginTop: 48, padding: 16, borderTop: '1px solid #eee' }}>
      <div className="container container--narrow" style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <a href="/pricing">Pricing</a>
        <a href="/terms">Terms</a>
        <a href="/privacy">Privacy</a>
        <a href="/security-policy">Security</a>
        {process.env.NODE_ENV !== 'production' && (
          <button
            onClick={async () => {
              
              const ok = await confirm('Seed demo data? This will upsert demo rows into the DB.');
              if (!ok) return;
              try {
                const r = await fetch('/api/dev/seed-demo', { method: 'POST' });
                if (r.ok) toast?.('Seeded demo data'); else toast?.('Seed failed');
              } catch (e) { toast?.('Seed request failed'); }
            }}
            style={{ marginLeft: 'auto' }}
          >Seed demo</button>
        )}
      </div>
    </footer>
  )
}

export default function App({ Component, pageProps }: AppProps) {
  const [stripeConfigured, setStripeConfigured] = useState<boolean | null>(null)
  const [stripeMode, setStripeMode] = useState<'test' | 'live' | null | undefined>(undefined)
  const [safeMode, setSafeMode] = useState<boolean | null>(null)
  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(j => { setStripeConfigured(!!j.stripeConfigured); setStripeMode(j.stripeMode); })
      .catch(() => { setStripeConfigured(null); setStripeMode(undefined); })
    fetch('/api/admin/status')
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(j => setSafeMode(!!j.safeMode))
      .catch(() => setSafeMode(null))
  }, [])
  return (
    <ToastProvider>
    <>
      {safeMode === true && (
        <div style={{ background: '#eef2ff', borderBottom: '1px solid #c7d2fe' }}>
          <div className="container container--narrow" style={{ padding: 12 }}>
            Safe Mode is ON — no emails or charges will be sent. Manage in <a href="/admin">Admin → Settings</a> or unset SAFE_MODE.
          </div>
        </div>
      )}
      {stripeConfigured === false && (
        <div style={{ background: '#fff7ed', borderBottom: '1px solid #fed7aa' }}>
          <div className="container container--narrow" style={{ padding: 12 }}>
            Stripe isn’t configured yet. See <a className="mono" href="/docs/stripe-setup">Stripe setup</a> to enable checkout & billing.
          </div>
        </div>
      )}
      {stripeConfigured === true && stripeMode === 'test' && (
        <div style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
          <div className="container container--narrow" style={{ padding: 12 }}>
            Stripe is in TEST mode. Use test cards for checkout (e.g., 4242 4242 4242 4242).
          </div>
        </div>
      )}
      <Component {...pageProps} />
  <Footer />
    </>
    </ToastProvider>
  )
}

const ToastContext = createContext<((msg: string) => void) | null>(null);
export function useToast() { return useContext(ToastContext); }

type ConfirmApi = {
  confirm: (message: string) => Promise<boolean>;
  prompt: (message: string, placeholder?: string) => Promise<string | null>;
}
const ConfirmContext = createContext<ConfirmApi | null>(null);
export function useConfirm() { const c = useContext(ConfirmContext); return c ? c.confirm : async () => false; }
export function usePrompt() { const c = useContext(ConfirmContext); return c ? c.prompt : async () => null; }

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<string[]>([]);
  const [confirmState, setConfirmState] = useState<{ message: string; resolve?: (v: boolean) => void } | null>(null);
  const [promptState, setPromptState] = useState<{ message: string; placeholder?: string; resolve?: (v: string | null) => void; input?: string } | null>(null);

  const push = (msg: string) => {
    setToasts(t => [...t, msg]);
    setTimeout(() => setToasts(t => t.slice(1)), 5000);
  };

  useEffect(() => {
    
    (window as any).appToast = push;
    return () => { try { delete (window as any).appToast } catch {} };
  }, []);

  const confirm = (message: string) => new Promise<boolean>((resolve) => {
    setConfirmState({ message, resolve });
  });
  const prompt = (message: string, placeholder?: string) => new Promise<string | null>((resolve) => {
    setPromptState({ message, placeholder, resolve, input: '' });
  });

  const confirmApi: ConfirmApi = { confirm, prompt };

  return (
    <ToastContext.Provider value={push}>
      <ConfirmContext.Provider value={confirmApi}>
        {children}
        <ToastRoot toasts={toasts} />
        {confirmState && typeof window !== 'undefined' && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
            <div style={{ background: 'white', padding: 20, borderRadius: 8, width: 480 }}>
              <div style={{ marginBottom: 12 }}>{confirmState.message}</div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <button className="btn" onClick={() => { confirmState.resolve?.(false); setConfirmState(null); }}>Cancel</button>
                <button className="btn" onClick={() => { confirmState.resolve?.(true); setConfirmState(null); }}>Confirm</button>
              </div>
            </div>
          </div>
        )}
        {promptState && typeof window !== 'undefined' && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
            <div style={{ background: 'white', padding: 20, borderRadius: 8, width: 560 }}>
              <div style={{ marginBottom: 8 }}>{promptState.message}</div>
              <input autoFocus value={promptState.input || ''} onChange={(e) => setPromptState(s => s ? { ...s, input: e.target.value } : s)} className="input" placeholder={promptState.placeholder} />
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
                <button className="btn" onClick={() => { promptState.resolve?.(null); setPromptState(null); }}>Cancel</button>
                <button className="btn" onClick={() => { promptState.resolve?.(promptState.input || ''); setPromptState(null); }}>OK</button>
              </div>
            </div>
          </div>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

function ToastRoot({ toasts }: { toasts: string[] }) {
  if (typeof window === 'undefined') return null;
  return (
    <div style={{ position: 'fixed', right: 12, bottom: 12, zIndex: 1000 }}>
      {toasts.map((t, i) => (
        <div key={i} style={{ marginTop: 8, padding: 12, background: '#111827', color: 'white', borderRadius: 6 }}>{t}</div>
      ))}
    </div>
  );
}
