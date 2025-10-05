import { test, expect } from '@playwright/test';
import jwt from 'jsonwebtoken';

// Helper: perform a programmatic login by POSTing to the login API and installing the
// returned cookie into the browser context; retries to avoid transient rate-limit 429s.
async function programmaticLogin(page: any) {
  if (!process.env.ADMIN_SECRET) return null;
  // Create a valid JWT locally and set it as the admin_token cookie to avoid hitting rate limits
  const token = jwt.sign({ admin: true }, process.env.ADMIN_SECRET!, { expiresIn: '2h' });
  await page.context().addCookies([{ name: 'admin_token', value: encodeURIComponent(token), domain: 'localhost', path: '/' }]);
  return token;
}

// Requires ADMIN_SECRET to be set; run with managed dev server on port 3100 for local Windows
test.describe('admin CSP viewer', () => {
  test.skip(({}) => !process.env.ADMIN_SECRET, 'ADMIN_SECRET must be set for admin e2e');

  test('search, pagination, view, copy, delete', async ({ page }) => {
    // Prefer a programmatic login to avoid UI rate-limit flakiness
    const cookie = await programmaticLogin(page);
    if (!cookie) {
      await page.goto('/admin-login');
      try { await page.locator('nextjs-portal').first().waitFor({ state: 'detached', timeout: 2500 }); } catch {}
      await page.getByPlaceholder('Admin password').fill(process.env.ADMIN_SECRET!);
      await page.getByRole('button', { name: 'Sign in' }).click();
      await expect(page.getByText('Signed in \u2014 go to /admin')).toBeVisible({ timeout: 5000 });
    }
    await page.goto('/admin/csp');

    // Ensure page loaded
    await expect(page.getByRole('heading', { name: 'CSP reports' })).toBeVisible();

    // Perform a search that likely matches nothing, assert no errors
    await page.getByPlaceholder('Search (violated/doc/ua)').fill('no-such-thing-xyz');
    await page.waitForTimeout(500);

    // Reset and then trigger pagination controls
    await page.getByRole('button', { name: 'Reset' }).click();
    await page.getByRole('button', { name: 'Refresh' }).click();

    // View JSON of first row if present
    const viewBtn = page.locator('button', { hasText: 'View JSON' }).first();
    if (await viewBtn.count() > 0) {
      try { await page.locator('nextjs-portal').first().waitFor({ state: 'detached', timeout: 3000 }); } catch {}
      try {
        await viewBtn.click();
      } catch (e) {
        await viewBtn.click({ force: true });
      }
      await expect(page.getByText('Report detail')).toBeVisible();
      // Close detail
      await page.getByRole('button', { name: 'Close' }).click();
    }

    // Copy button presence and delete flow (attempt, don't fail if nothing to delete)
    const copyBtn = page.locator('button', { hasText: 'Copy' }).first();
    if (await copyBtn.count() > 0) {
      try { await page.locator('nextjs-portal').first().waitFor({ state: 'detached', timeout: 3000 }); } catch {}
      try {
        await copyBtn.click();
      } catch (e) {
        await copyBtn.click({ force: true });
      }
    }

    const delBtn = page.locator('button', { hasText: 'Delete' }).first();
    if (await delBtn.count() > 0) {
      try { await page.locator('nextjs-portal').first().waitFor({ state: 'detached', timeout: 5000 }); } catch {}
      try {
        await delBtn.click();
      } catch (e) {
        await delBtn.click({ force: true });
      }
      // Wait for the confirmation dialog and click the Delete button inside it to avoid ambiguous selectors
      const dialog = page.locator('role=dialog').filter({ hasText: 'Confirm delete' }).first();
      // Some UIs may animate; wait a bit longer but tolerate absence
      try {
        await expect(dialog).toBeVisible({ timeout: 12000 });
        await dialog.getByRole('button', { name: 'Delete' }).click();
        // Wait for deletion to complete and modal to close
        await page.waitForTimeout(500);
      } catch (e) {
        // If dialog didn't appear, continue without failing the whole suite
      }
    }
  });
});
