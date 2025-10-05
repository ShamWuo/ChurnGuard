import { test, expect } from '@playwright/test';
import { hasStripeSecrets } from './_helpers';

const endpoints: Array<{ method: 'GET' | 'POST'; url: string; body?: any; headers?: Record<string, string>; requiresAuth?: boolean }> = [
  { method: 'GET', url: '/api/analytics/metrics' },
  { method: 'POST', url: '/api/stripe/portal', body: { customerId: 'cus_test' }, headers: { 'content-type': 'application/json' } },
  { method: 'GET', url: '/api/admin/audit-list', requiresAuth: true },
];

async function programmaticLogin(page: any) {
  if (!process.env.ADMIN_SECRET) return null;
  const maxAttempts = 5;
  let cookieVal: string | null = null;
  for (let i = 0; i < maxAttempts; i++) {
    const res = await page.request.post('/api/admin/login', { data: { password: process.env.ADMIN_SECRET } });
    if (res.status() === 200) {
      const sc = res.headers()['set-cookie'];
      if (sc) {
        const m = sc.match(/admin_token=([^;]+)/);
        if (m) cookieVal = m[1];
      }
      break;
    }
    await new Promise((r) => setTimeout(r, 300 * (i + 1)));
  }
  if (cookieVal) {
    await page.context().addCookies([{ name: 'admin_token', value: cookieVal, domain: 'localhost', path: '/' }]);
  }
  return cookieVal;
}

test('public/admin endpoints expose RateLimit headers (on success or 429)', async ({ page }) => {
  // Try programmatic login to get access to admin endpoints
  await programmaticLogin(page);
  for (const ep of endpoints) {
    // Skip stripe endpoint if no secrets are configured
    if (ep.url.includes('/api/stripe') && !hasStripeSecrets()) continue;
    const res = await page.request.fetch(ep.url, { method: ep.method, data: ep.body, headers: ep.headers });
    const status = res.status();
    if ([400,405].includes(status)) continue; // skip invalid usage
    const h = res.headers();
    // If endpoint requires auth and we got 401, skip assertion
    if (ep.requiresAuth && status === 401) continue;
    // Rate-limit headers should be present on most endpoints; tolerate absence but show test failure only when completely missing
    expect(h['ratelimit-limit'] || h['x-ratelimit-limit']).toBeTruthy();
    expect(h['ratelimit-remaining'] || h['x-ratelimit-remaining']).toBeTruthy();
    expect(h['ratelimit-reset'] || h['x-ratelimit-reset']).toBeTruthy();
  }
});
