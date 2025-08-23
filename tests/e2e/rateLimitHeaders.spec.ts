import { test, expect } from '@playwright/test';

const endpoints: Array<{ method: 'GET' | 'POST'; url: string; body?: any; headers?: Record<string, string>; requiresAuth?: boolean }> = [
  { method: 'GET', url: '/api/analytics/metrics' },
  { method: 'POST', url: '/api/stripe/portal', body: { customerId: 'cus_test' }, headers: { 'content-type': 'application/json' } },
  { method: 'GET', url: '/api/admin/audit-list', requiresAuth: true },
];

test('public/admin endpoints expose RateLimit headers (on success or 429)', async ({ page }) => {
  // Login for admin endpoint
  await page.goto('/admin-login');
  if (process.env.ADMIN_SECRET) {
    await page.getByPlaceholder('Admin password').fill(process.env.ADMIN_SECRET);
    await page.getByRole('button', { name: 'Sign in' }).click();
  }
  for (const ep of endpoints) {
    const res = await page.request.fetch(ep.url, { method: ep.method, data: ep.body, headers: ep.headers });
    const status = res.status();
    if ([400,405].includes(status)) continue; // skip invalid usage
    const h = res.headers();
    expect(h['ratelimit-limit']).toBeTruthy();
    expect(h['ratelimit-remaining']).toBeTruthy();
    expect(h['ratelimit-reset']).toBeTruthy();
  }
});
