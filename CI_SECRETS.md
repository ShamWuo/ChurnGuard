    CI / QA secrets checklist

This repository's CI and staging flows require a small set of repository secrets so that tests and demo/staging deployments run reliably.

Required secrets (add these under Settings → Secrets → Actions):

- ADMIN_SECRET: the secret used to sign admin JWTs for e2e and dev demo seeds.
- CSRF_SECRET: the CSRF secret for admin endpoints.
- CRON_SECRET: used to authorize cron-style admin endpoints (delete-user, etc.).
- DATABASE_URL: production/test database connection string (used by CI if running migrations).
- VERCEL_TOKEN (optional): token for deploying to Vercel from Actions.
- STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET (optional): needed for end-to-end billing tests; not required for most e2e smoke tests.

Notes:
- The Playwright CI workflow computes a `PLAYWRIGHT_RUN_BILLING` flag at runtime and exposes it to tests when both Stripe secrets are present; billing-related assertions are skipped when this flag is false.

Recommended minimal setup for running the Playwright workflow in Actions:

1. Create the secrets above in the repository settings.
2. Ensure the workflow runner can install node and run `npx prisma generate` (the repo uses Prisma).
3. If using a hosted DB for CI, set `DATABASE_URL` accordingly; otherwise CI will use SQLite in-memory/local which may need additional adjustments.

If you want me to produce a one-click staging deploy (Vercel) workflow, add `VERCEL_TOKEN` and `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID` and I will wire the deploy step.
