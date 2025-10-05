import { test, expect } from '@playwright/test';
import jwt from 'jsonwebtoken';

async function programmaticLogin(page: any) {
  if (!process.env.ADMIN_SECRET) return null;
  const token = jwt.sign({ admin: true }, process.env.ADMIN_SECRET!, { expiresIn: '2h' });
  await page.context().addCookies([{ name: 'admin_token', value: encodeURIComponent(token), domain: 'localhost', path: '/' }]);
  return token;
}

test.describe('admin flow', () => {
  test.skip(({}) => !process.env.ADMIN_SECRET, 'ADMIN_SECRET must be set for admin e2e');

  test('login and view status', async ({ page, request }) => {
    const cookie = await programmaticLogin(page);
    if (!cookie) {
      // Fallback to UI login if programmatic failed (e.g., due to rate-limit)
      await page.goto('/admin-login');
      // wait for any portal overlays to disappear
      try { await page.locator('nextjs-portal').first().waitFor({ state: 'detached', timeout: 2500 }); } catch {};
      await page.getByPlaceholder('Admin password').fill(process.env.ADMIN_SECRET!);
      await page.getByRole('button', { name: 'Sign in' }).click();
      // Wait for signed-in indicator
      await expect(page.getByText('Signed in \u2014 go to /admin')).toBeVisible({ timeout: 5000 });
    }
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
    await expect(page.getByText('Status')).toBeVisible();

    // Check ready endpoint shape while authenticated
    const res = await request.get('/api/ready');
    expect([200,503]).toContain(res.status());
    const json = await res.json();
    expect(json).toHaveProperty('ok');
    expect(json).toHaveProperty('db');
  });
});
