import { test, expect } from '@playwright/test';
import { skipIfNoStripe } from './_helpers';

test('billing flow (gated)', async ({ page }, testInfo) => {
  skipIfNoStripe(testInfo);

  await page.goto('/pricing');
  // Verify pricing page shows checkout button
  const checkout = page.getByRole('button', { name: /checkout|buy/i });
  await expect(checkout).toBeVisible();
  // We don't click through to Stripe in CI unless real test keys are provided.
  console.log('Billing e2e scaffold executed (skipped clicking Stripe)');
});
