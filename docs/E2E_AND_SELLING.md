E2E & Selling notes

Run e2e locally (dev server)
- Windows PowerShell (recommended):
  - Use the included helper to start dev server and run Playwright in one step:

    powershell -NoProfile -ExecutionPolicy Bypass -File ./scripts/run-e2e-dev.ps1

- Or start dev server and run Playwright separately:

  npm run dev
  npx playwright test --config=playwright.config.ts

CI guidance
- Use Linux runners for Playwright to avoid Windows/OneDrive symlink issues.
- Set these secrets in CI for billing tests:
  - STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_ID
  - PLAYWRIGHT_RUN_BILLING=true

Windows/OneDrive notes
- OneDrive sometimes sets files as reparse points, which can trigger readlink/readfile EINVAL errors.
- If you see edge-runtime or .next readlink errors, run working copy outside OneDrive or on a Linux CI runner.

Selling & Pricing suggestions
- Suggested initial pricing:
  - Starter: $12/mo — for up to 1 team member and basic analytics
  - Growth: $49/mo — includes audits, dunning automation, and priority email support
  - Founder slots: 50 free founder signups (manual marking via admin) or as a lifetime plan for $399

- Positioning:
  - "Stripe-friendly micro-SaaS for product teams needing lightweight, auditable billing and CSP monitoring."
  - Emphasize quick onboarding (seed demo) and admin safety features (Safe Mode, audit logs).

Docs to update before shipping
- Update `public/robots.txt`, `public/sitemap.xml`, and `public/.well-known/security.txt` with your domain.
- Add a short `DEPLOYMENT.md` describing env vars and recommended Postgres settings.

