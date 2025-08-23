import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Edge-safe boot timestamp for lightweight uptime header
const __BOOT = Date.now();

export function middleware(req: NextRequest) {
  // allow forwarding custom headers to the downstream node SSR
  const requestHeaders = new Headers(req.headers);
  // Per-request nonce for inline runtime scripts
  const scriptNonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
  // Expose nonce to SSR and client so NextScript can use it
  requestHeaders.set('x-csp-nonce', scriptNonce);
  const res = NextResponse.next({ request: { headers: requestHeaders } });
  // Request Id
  const rid = req.headers.get('x-request-id') || Math.random().toString(36).slice(2);
  res.headers.set('X-Request-Id', rid);
  // Basic security headers
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('Referrer-Policy', 'no-referrer');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.headers.set('X-XSS-Protection', '1; mode=block');
  // Additional isolation headers
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  res.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  res.headers.set('X-DNS-Prefetch-Control', 'off');
  res.headers.set('X-Permitted-Cross-Domain-Policies', 'none');
  // Avoid indexing admin and auth pages
  const p = req.nextUrl.pathname || '';
  if (p.startsWith('/admin') || p.startsWith('/api/admin') || p === '/admin-login') {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  // HSTS (disabled on localhost by browser rules; safe for prod)
  res.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  // Simple CSP suitable for this app; adjust as you harden inline usage
  const isProd = process.env.NODE_ENV === 'production';
  res.headers.set('X-CSP-Nonce', scriptNonce);
  const scriptDirectives = isProd
    // In production: allow self + nonce + Stripe; no unsafe-eval/inline
    ? `script-src 'self' 'nonce-${scriptNonce}' https://js.stripe.com`
    // In dev: keep unsafe-eval/inline for Fast Refresh
    : "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com";
  const styleDirectives = isProd ? "style-src 'self'" : "style-src 'self' 'unsafe-inline'";
  const connectExtras = isProd ? '' : ' ws: http://localhost:* https://localhost:*';
  const reportEndpoint = '/api/csp-report';
  const csp = [
    "default-src 'self'",
    "img-src 'self' data:",
    styleDirectives,
    scriptDirectives,
  `connect-src 'self' https://api.stripe.com https://checkout.stripe.com https://billing.stripe.com${connectExtras}`,
    "frame-src 'self' https://js.stripe.com https://checkout.stripe.com https://billing.stripe.com",
    "font-src 'self' data:",
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    `report-uri ${reportEndpoint}`,
    `report-to csp-endpoint`,
  ].join('; ');
  res.headers.set('Content-Security-Policy', csp);
  try {
    const origin = req.nextUrl.origin;
    res.headers.set('Report-To', JSON.stringify({
      group: 'csp-endpoint',
      max_age: 10886400,
      endpoints: [{ url: `${origin}${reportEndpoint}` }],
      include_subdomains: false,
    }));
  } catch {}
  // lightweight uptime header (seconds since module init; Edge-safe)
  try { res.headers.set('X-Uptime-Seconds', String(Math.floor((Date.now() - __BOOT) / 1000))); } catch {}
  return res;
}

export const config = {
  matcher: ['/((?!_next|.*\\.\w+$).*)'],
};
