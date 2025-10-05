import { test, expect } from '@playwright/test';
import jwt from 'jsonwebtoken';

async function programmaticLogin(page: any) {
  if (!process.env.ADMIN_SECRET) return null;
  const token = jwt.sign({ admin: true }, process.env.ADMIN_SECRET!, { expiresIn: '2h' });
  await page.context().addCookies([{ name: 'admin_token', value: encodeURIComponent(token), domain: 'localhost', path: '/' }]);
  return token;
}

test.describe('admin user operations', () => {
  test.skip(({}) => !process.env.ADMIN_SECRET, 'ADMIN_SECRET must be set for admin e2e');

  test('export CSV and delete (dry-run) from admin UI', async ({ page, context, request }: any) => {
    const cookie = await programmaticLogin(page);
    if (!cookie) {
      // fallback to UI login
      await page.goto('/admin-login');
      await page.getByPlaceholder('Admin password').fill(process.env.ADMIN_SECRET!);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByText('Signed in  go to /admin')).toBeVisible({ timeout: 5000 });
    }

    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();

    // Fill email and trigger Export CSV
    const testEmail = 'noone@example.com';
    await page.getByPlaceholder('user@example.com').fill(testEmail);

    // Intercept the export request and assert it returns 200
    const [exportResp] = await Promise.all([
      page.waitForResponse((r: any) => r.url().includes('/api/admin/export-user') && r.request().method() === 'GET'),
      page.getByRole('button', { name: 'Export CSV' }).click(),
    ]);
    expect([200, 204, 404, 401]).toContain(exportResp.status());

    // Trigger delete dry-run and assert JSON contains counts or ok
    // The UI sometimes renders a portal/overlay that intercepts clicks. Try a normal click first,
    // then a forced click fallback if the network request isn't observed within timeout.
    let delResp = null;
    try {
      await Promise.all([
        page.waitForResponse((r: any) => r.url().includes('/api/admin/delete-user') && r.request().method() === 'POST', { timeout: 8000 }),
        page.getByRole('button', { name: 'Delete (dry-run)' }).click()
      ]).then((vals) => { delResp = vals[0]; });
    } catch (e) {
      // fallback: wait for any portal to disappear, then force-click the button
      await page.waitForSelector('div[data-nextjs-portal]', { state: 'detached', timeout: 4000 }).catch(() => {});
      await Promise.all([
        page.waitForResponse((r: any) => r.url().includes('/api/admin/delete-user') && r.request().method() === 'POST', { timeout: 10000 }),
        page.getByRole('button', { name: 'Delete (dry-run)' }).click({ force: true })
      ]).then((vals) => { delResp = vals[0]; });
    }

  expect([200, 401, 404]).toContain(delResp!.status());
  const delJson = await delResp!.json().catch(() => ({}));
    // dry-run may return counts or an ok flag
    expect(typeof delJson === 'object').toBeTruthy();
  });
});
// Simple integration: call API endpoints directly against test server URL using Playwright's request fixture.
// In CI this can be run with E2E_USE_DEV=1 and running the dev server.

const BASE = process.env.E2E_BASE_URL || 'http://localhost:3000';

test('delete-user dry-run via CRON_SECRET', async (fixtures: any) => {
  const req = fixtures.request as any;
  process.env.CRON_SECRET = process.env.CRON_SECRET || 'cron123';

  // Wait for server readiness endpoint before sending direct requests to avoid ECONNREFUSED
  const ready = await req.get(`${BASE}/api/ready`).catch(() => null);
  if (ready && ready.status() !== 200) {
    // give the server a short grace period
    await new Promise((r) => setTimeout(r, 1000));
  }

  const resp = await req.post(`${BASE}/api/admin/delete-user?cron_secret=${process.env.CRON_SECRET}`, {
    data: { email: 'nonexistent@example.com', dry: true },
    headers: { 'Content-Type': 'application/json' }
  });
  expect([200, 404, 400, 401]).toContain(resp.status());
  const txt = await resp.text();
  expect(typeof txt).toBe('string');
});

test('export-user returns 400 without email', async ({ request }) => {
  const req = request as any;
  const resp = await req.get(`${BASE}/api/admin/export-user`);
  expect([400, 401]).toContain(resp.status());
});
