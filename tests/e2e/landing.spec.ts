import { test, expect } from '@playwright/test';
import { hasStripeSecrets } from './_helpers';

test('landing page renders CTA and form', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Stripe Churn Deflection/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Buy Subscription/i })).toBeVisible();
  if (hasStripeSecrets()) {
    await expect(page.getByPlaceholder('Stripe Customer ID (cus_...)')).toBeVisible();
  }
});
