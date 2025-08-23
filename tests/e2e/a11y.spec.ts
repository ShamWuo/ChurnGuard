import { test, expect } from '@playwright/test';

test.describe('a11y', () => {
  test('landing has no serious accessibility violations', async ({ page }) => {
    await page.goto('/');
    // basic checks: title present, primary button exists
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: /buy subscription/i })).toBeVisible();
  });

  test('admin-login form is accessible', async ({ page }) => {
    await page.goto('/admin-login');
    await expect(page.getByRole('heading', { level: 1, name: /admin login/i })).toBeVisible();
    await expect(page.getByPlaceholder('Admin password')).toBeVisible();
  });
});
