import { test, expect } from '@playwright/test';

// This test relies on ADMIN_SECRET being set for login fallback (password === ADMIN_SECRET)
// In CI, ensure ADMIN_SECRET is set; locally, you can export it before running e2e.

test.describe('admin flow', () => {
  test.skip(({}) => !process.env.ADMIN_SECRET, 'ADMIN_SECRET must be set for admin e2e');

  test('login and view status', async ({ page, request }) => {
    await page.goto('/admin-login');
    // Enter password only (legacy fallback mode)
    await page.getByPlaceholder('Admin password').fill(process.env.ADMIN_SECRET!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Signed in — go to /admin')).toBeVisible();

    // Navigate to admin and assert status badges presence
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
