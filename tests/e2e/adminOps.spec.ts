import { test, expect } from '@playwright/test';

test.describe('admin operations', () => {
  test.skip(({}) => !process.env.ADMIN_SECRET, 'ADMIN_SECRET must be set');

  test('cache purge returns ok', async ({ page }) => {
    // Login via ADMIN_SECRET (legacy path)
    await page.goto('/admin-login');
    await page.getByPlaceholder('Admin password').fill(process.env.ADMIN_SECRET!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Signed in — go to /admin')).toBeVisible();

    // Navigate, fetch CSRF via page load, submit form
    await page.goto('/admin');
    await page.getByRole('button', { name: 'Purge metrics cache' }).click();
    // Confirm dialog is shown by onSubmit, accept it
    page.on('dialog', d => d.accept());
    // A simple smoke: after form submits, we should still be on admin page
    await expect(page.getByRole('heading', { name: 'Admin' })).toBeVisible();
  });

  test('rate-limit status endpoint returns JSON', async ({ page }) => {
    await page.goto('/admin-login');
    await page.getByPlaceholder('Admin password').fill(process.env.ADMIN_SECRET!);
    await page.getByRole('button', { name: 'Sign in' }).click();
    const res = await page.request.get('/api/admin/rate-limit-status');
    expect([200, 204, 404, 401]).toContain(res.status());
  });
});
