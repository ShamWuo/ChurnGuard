Selling checklist — make this product sellable and worth customers' money

Goal
- Make this app a shippable micro-SaaS product that customers will pay for: secure, reliable, easy onboarding, clear value (reduce churn / manage dunning), and operationally maintainable.

Quick start (developer)

- Local dev (Windows PowerShell):

```powershell
# optional: move repo outside OneDrive to avoid Prisma EPERM issues
$env:ADMIN_SECRET='secret123'; $env:CSRF_SECRET='csrf123'; $env:NEXT_TELEMETRY_DISABLED='1'; npm run dev:3100
```

- Build + run (production-like):

```powershell
npm run build
# Start with PORT=3100
$env:PORT='3100'; npm run start
```

- Generate Prisma client (required for real DB):

```powershell
# If you get EPERM errors on Windows/OneDrive, run this in WSL or move repo outside OneDrive
npx prisma generate
npx prisma migrate deploy
```

Why move off OneDrive
- OneDrive commonly locks files during Prisma's native engine generation and causes EPERM rename errors on Windows. Either run `npx prisma generate` from WSL, or clone the repo to a non-OneDrive folder.

Minimum viable product (what to ship)
- Core value: CSP reporting + admin UI for viewing/triaging violations, retention controls, audit logs, and actionable guidance (who/what/when).
- Billing: Stripe subscription plans with a free trial and metered tiers (events/month, seats, or retention days).
- Onboarding: simple onboarding flow (connect Stripe, create initial offer, enable subscription), email verification, and a clear admin dashboard with key metrics.
- Reliability: background CRON for purge/retention, health/readiness checks, and error reporting (Sentry).

Prioritized productization checklist (first 10 tasks)
1. Ensure real DB client works locally (PRISMA_GENERATE on non-OneDrive or WSL). Add a dev note in README.
2. Add Stripe onboarding flow and a clear checkout UI + access control for customers.
3. Add feature flags and an admin billing page that shows plan limits, usage, and next billing date.
4. Harden authentication: rotateable admin secrets, invite-only admin users, two-factor for single-tenant customer admin (optional later).
5. Add telemetry: Sentry + basic Prometheus metrics or hosted observability (Datadog) for billing/uptime/latency.
6. Add CI (GitHub Actions) that runs tests, builds, and runs skinny e2e smoke tests on every PR.
7. Add a nightly job (GitHub Actions scheduled) to call `/api/cron/purge-csp` to enforce retention.
8. Add export and data portability (CSV, JSON) and a customer-facing data deletion request endpoint (GDPR/CCPA compliance).
9. UX polish: CSV export, inline JSON viewer, copy raw, and fast filters on admin pages.
10. Pricing strategy & billing: define tiers, trial length, promo/discount codes, dunning emails for failed payments.

Security and compliance minimums
- Enforce HTTPS everywhere (Vercel/Cloudflare by default).
- CSP + per-request nonce (already present), HSTS, and secure cookies (HttpOnly, Secure, SameSite=Strict for admin_token).
- Rate-limit admin endpoints and add exponential backoff on auth attempts.
- Data retention policy and deletion flows; soft-delete with purge job (done) and customer data export.
- Add logs retention & audit logs for compliance (AuditLog model exists).

Operational/Devops
- Deploy: Vercel is fastest for Next; Docker-compose or Kubernetes for control (include Dockerfile + docker-compose.yml later).
- Database: managed Postgres in production (migrate from SQLite). Use Prisma with a proper connection string and migrations.
- Secrets: store ADMIN_SECRET, CSRF_SECRET, STRIPE keys, and DB URL in environment variables / secret manager.
- Add health/readiness endpoints (done) and a simple uptime alerting policy.

Monetization & GTM ideas
- Offer 14-day free trial, then paid tiers.
- Pricing model: per-active-customer per-month or per-event (CSP reports processed) + seat-based admin pricing.
- Provide a plug-and-play Stripe integration guide and a Shopify-like onboarding for non-technical users.
- Market to small SaaS companies worried about churn and invoices (dunning). Offer one-click Stripe integration and risk analysis.

First 3 steps to ship (30-day plan)
1. Make DB reliable locally & CI: ensure `prisma generate` runs in CI; move to Postgres for CI and prod.
2. Build Stripe onboarding + trial + upgrade/downgrade flow; wire billing webhooks and test dunning scenarios.
3. Polish admin UX & audit log export; add privacy/data deletion endpoints and schedule nightly purge.

How I can help next
- I can start any task above. Pick one:
  - Run local smoke-check (/api/ready) and then run Playwright e2e.
  - Add Dockerfile + docker-compose for local prod-like run.
  - Add a simple GitHub Actions CI workflow to run tests and a nightly cron to call `/api/cron/purge-csp`.

Notes
- I added a runtime-friendly prisma shim which keeps dev moving if you can't run `prisma generate` on OneDrive; for production you must generate the client and use a robust DB (Postgres).

CI and local dev notes
- There's a GitHub Actions workflow at `.github/workflows/ci.yml` which runs a Postgres service, generates the Prisma client, runs migrations (or db push), unit tests, and a Playwright smoke test (tests tagged `@smoke`).
- A scheduled workflow `.github/workflows/scheduled-purge.yml` will call your purge endpoint daily; set these repository secrets before enabling it:
  - `SITE_URL` (e.g. https://example.com)
  - `ADMIN_SECRET` (used for internal admin endpoints) OR `PURGE_URL` + `CRON_SECRET` if you prefer a separate cron token
- On Windows, avoid running `npx prisma generate` inside a OneDrive folder. Two options:
  1. Clone the repo to a non-OneDrive folder and run `npx prisma generate` there.
  2. Use WSL and run `npx prisma generate` from a Linux filesystem.

Secrets & production checklist (short)
- Do not rely on `ADMIN_SECRET` in plain text for production. Use a secret manager and rotate regularly.
- Add `DATABASE_URL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `SENTRY_DSN`, and `CRON_SECRET` to your deployment environment or secret store.
- Confirm `npx prisma generate` completes in your CI environment; if your CI cannot run the native engine, commit a generated client during the build step or use a containerized build that supports Prisma native generation.

Destructive delete safety
------------------------

This repo now includes a gated admin destructive-delete flow. Notes for operators and buyers:

- A dry-run is available: POST /api/admin/delete-user with { dry: true } returns counts (non-mutating). Use this to preview the impact.
- Destructive deletes are gated by the environment variable ENABLE_DESTRUCTIVE_DELETES. Keep this unset in demo or staging environments.
- Admin UI requires typing the exact email address to confirm deletion.
- Audit logs are created (best-effort) and include the actor extracted from the admin JWT; ensure ADMIN_SECRET is configured for proper audit attribution.

Before handing to a buyer or running destructive flows in CI, validate end-to-end with Playwright using the provided e2e test: tests/e2e/admin-user.spec.ts. Start the dev server with ADMIN_SECRET set and run Playwright.

How to run CI & E2E locally
---------------------------

- Start the dev server on port 3100 with the required secrets (PowerShell):

```powershell
# from project root
$env:ADMIN_SECRET='secret123'; $env:CSRF_SECRET='csrf123'; npm run dev -- -p 3100
```

- Or use cmd syntax which avoids PowerShell quoting issues:

```powershell
cmd /c "set ADMIN_SECRET=secret123&& set CSRF_SECRET=csrf123&& npm run dev -- -p 3100"
```

- Run Playwright tests against the dev server:

```powershell
cmd /c "set E2E_USE_DEV=1&& set ADMIN_SECRET=secret123&& set CSRF_SECRET=csrf123&& set E2E_BASE_URL=http://localhost:3100&& npx playwright test tests/e2e/admin-user.spec.ts --reporter=list"
```

- To run the CI workflow locally you can inspect `.github/workflows/playwright-e2e.yml` and ensure the repo secrets are set in GitHub (ADMIN_SECRET, CRON_SECRET, DATABASE_URL). The workflow will start a Postgres service, run `npx prisma generate`, start the dev server, wait for `/api/ready`, then run Playwright.

These steps were used during QA and validated on Windows (using the cmd helper to avoid PowerShell quoting issues).

