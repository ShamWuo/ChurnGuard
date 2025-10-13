# Stripe Setup

Follow these steps to enable checkout and the billing portal:

1) Create a Product and Prices in Stripe
- Dashboard → Products → New product → Add a recurring price (e.g., monthly)
- Copy the Price ID (price_...)

2) Set environment variables
- STRIPE_SECRET_KEY=sk_test_...
- STRIPE_WEBHOOK_SECRET=whsec_... (if using webhooks)
- STRIPE_PRICE_ID=price_...

3) Local dev
- Windows PowerShell:
  - npm run dev:win
- macOS/Linux:
  - ADMIN_SECRET=secret123 CSRF_SECRET=csrf123 NEXT_TELEMETRY_DISABLED=1 npm run dev

4) Webhooks (optional for local)
- stripe listen --forward-to localhost:3000/api/stripe/webhook

5) Verify
- Visit /pricing → Checkout button enabled
- Visit /admin → Stripe badge green
