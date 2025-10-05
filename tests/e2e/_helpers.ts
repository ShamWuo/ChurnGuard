export function hasStripeSecrets() {
  return !!(process.env.STRIPE_SECRET_KEY || process.env.STRIPE_WEBHOOK_SECRET || process.env.PLAYWRIGHT_RUN_BILLING === 'true');
}

export function skipIfNoStripe(testInfo: any) {
  if (!hasStripeSecrets()) {
    testInfo.skip('No Stripe secrets configured');
  }
}

export const PLAYWRIGHT_RUN_BILLING = process.env.PLAYWRIGHT_RUN_BILLING === 'true';
