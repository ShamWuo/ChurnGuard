# Stripe Churn Deflection - App Description

This document describes the full application: purpose, features, architecture, data models, third-party integrations, development and deployment workflows, security considerations, observability, testing strategy, and recommended next steps for production hardening.

## 1. High-level purpose

Stripe Churn Deflection is a focused micro-SaaS built to reduce churn for subscription-based products by automating dunning (failed payment retries and reminders), offering recovery workflows, and providing an admin interface for management and recovery operations. It's intentionally minimal so it can be dropped into a small team or used as a starting point for custom billing automation.

Primary goals:
- Automate detection of failed invoices and manage retry/reminder flows (dunning).
- Allow admins to manually intervene, retry payments, and credit/recover revenue.
- Integrate with Stripe for billing, portals, and webhooks.
- Provide a small admin UI and API surface for management, auditing, and metrics.

## 2. What it does (Features)

- Stripe integration
  - Accepts Stripe webhooks for invoices, payments, subscription lifecycle events, and other relevant events.
  - Uses Stripe SDK to create Checkout sessions and interact with customers/subscriptions where needed.
- Dunning automation
  - Detect failed invoices and create `DunningCase` records to track recovery progress.
  - Schedule `RetryAttempt` jobs to reattempt charges at configurable intervals.
  - Send `DunningReminder` notifications (email, Slack configurable) to customers and team channels.
  - Record `RecoveryAttribution` when payments are recovered.
- Admin UI and API
  - Admin pages under `pages/admin/*` for billing, settings, templates, and status checks.
  - Secure admin endpoints guarded by `checkAdminAuth` and rate-limited login flow.
  - Admin actions: run a dunning run, retry attempts, export audits, view event logs, toggle safe mode.
- Auditing and logs
  - `AuditLog` model tracks admin actions with actor, action, and details.
  - `StripeEventLog` captures raw webhook payloads for forensic debugging.
- Seeding & demo mode
  - `scripts/seed-demo.js` creates demo data for local testing and walkthroughs.
- Cron & job runner
  - API route or scheduled cron runs process queued retry attempts and send reminders.
  - `CRON_SECRET` and `SAFE_MODE` used to protect and constrain destructive cron operations.

## 3. Supported workflows

- Normal billing flow: Stripe handles subscriptions and invoice payments. On failure, webhooks create or update `DunningCase` and schedule retry attempts.
- Retry + reminder flow: The cron process or manual run processes `RetryAttempt` entries, attempts charges (via Stripe API), updates status, and sends reminders if configured.
- Manual admin recovery: Admin can view `DunningCase` records, run retries, or mark as recovered/backfill.
- Export & audit: Admins can export audit logs and event logs for compliance.

## 4. Core data models (Prisma)

- `User` — customers in your system, linked to Stripe `stripeCustomerId`.
- `Subscription` — subscription records with `stripeSubscriptionId`, `status`, `currentPeriodEnd`, `cancelAtPeriodEnd`.
- `DunningCase` — one per failed invoice, stores `stripeInvoiceId`, customer, `amountDue`, `currency`, `status`, timestamps.
- `RetryAttempt` — scheduled attempts to retry a charge; `status`, `attemptNo`, `runAt`.
- `DunningReminder` — records of reminders sent per channel (email, slack).
- `RecoveryAttribution` — attribution for recovered payments (source: retry/backfill/manual).
- `Settings` — single-row config used to store dunning schedule and safe-mode toggles.
- `StripeEventLog` — raw webhook capture.
- `AuditLog` — admin actions and metadata.
- `CspReport` — CSP violation capture for admin review.

Note: The repository ships two Prisma schema files:
- `prisma/schema.prisma` (SQLite provider) used for frictionless local dev and automated tests.
- `prisma/schema.postgres.prisma` (Postgres provider) which uses real DB enums (recommended for production). The application uses `lib/enums` constants so code works with either backend.

## 5. Technology stack

- Framework: Next.js 14 (TypeScript) — UI + API routes.
- Language: TypeScript (Node.js).
- ORM: Prisma (v5.x) with `@prisma/client`.
- Database: SQLite (dev) and a Postgres path (production-ready) with explicit enum types.
- Job/Storage: Optional Redis (ioredis) for caching/locks (docker compose includes Redis for local dev).
- Billing: Stripe SDK + webhooks.
- Email: Optional Postmark/SMTP (nodemailer) for sending dunning emails.
- Logging/Errors: Sentry integration available; simple structured logging via `lib/logger`.
- Tests: Jest unit tests and Playwright for E2E tests.

## 6. Notable code locations

- `pages/api/stripe/webhook.ts` — Stripe webhook receiver.
- `pages/api/cron/*` — cron endpoints to run retries and reminder flows.
- `pages/admin/*` — admin UI and API for management tasks.
- `lib/enums.ts` — application-level typed constants used across the codebase (keeps code provider-agnostic).
- `lib/prisma.ts` — robust Prisma client initialization with library engineType for Windows/OneDrive compatibility.
- `scripts/seed-demo.js` — seeds demo data for local development.
- `prisma/schema.postgres.prisma` — Postgres schema with enums for production usage.

## 7. Configuration & environment variables

Key env vars (see `.env.example`):
- `DATABASE_URL` — file or Postgres connection string.
- `ADMIN_SECRET` / `ADMIN_USER` + `ADMIN_PASS` — admin authentication.
- `CSRF_SECRET` — CSRF protection.
- `STRIPE_SECRET_KEY` — Stripe secret key.
- `STRIPE_WEBHOOK_SECRET` — Stripe webhook signing secret.
- `POSTMARK_SERVER_TOKEN` or SMTP settings — email delivery.
- `REDIS_URL` — optional Redis for caching/locks.
- `SENTRY_DSN` — optional Sentry DSN for error reporting.
- `CRON_SECRET` — secret to secure cron endpoints.

## 8. Development workflow

- Local dev (fast path): Uses SQLite and the included `prisma/schema.prisma`. Typical commands:

```powershell
npm install
# generate prisma client (default schema)
npx prisma generate
# push SQLite schema to local DB (dev.db)
npx prisma db push
# seed demo data (optional)
node scripts/seed-demo.js
# start dev server
npm run dev
```

- Postgres local dev (optional, recommended for staging/prod parity):
  - Start Postgres/Redis via Docker Compose (`docker-compose.yml` or `docker-compose.dev.yml`).
  - Set `DATABASE_URL` to the Postgres connection.
  - Generate client against `prisma/schema.postgres.prisma` and run migrations.

## 9. CI and E2E

- CI has Jest unit tests and Playwright E2E. The workflows conditionally choose whether to run `prisma migrate deploy` (when `DATABASE_URL` is set to Postgres) or `prisma db push` for SQLite.
- Use `npm run ci` to run precompile + tests in CI-like mode.

## 10. Security considerations

- Admin endpoints are protected by `checkAdminAuth` — double-check all admin routes if you plan to expose the admin UI publicly.
- Stripe webhooks should be validated using `STRIPE_WEBHOOK_SECRET` to ensure authenticity.
- Secrets should be stored in environment variables / secret manager; `.env.example` is only a template.
- Sentry should be configured in production to capture errors and traces.
- `SAFE_MODE` and `CRON_SECRET` help prevent accidental destructive runs in production.

## 11. Observability & logging

- Sentry integration (`lib/sentry.ts`) is present for error capture.
- `StripeEventLog` stored raw webhooks for debugging.
- `AuditLog` stores admin actions for compliance.
- `logger.ts` centralizes logs; find/replace `console.error` with Sentry capture for critical paths if desired.

## 12. Edge cases & limitations

- Local dev uses SQLite so minor behavior differences vs Postgres (foreign key behavior, enum types). The repo provides `prisma/schema.postgres.prisma` for full parity.
- The project assumes Stripe handles PCI-sensitive flows (customer/payment info) — the server never stores card numbers.
- Rate limiting for public endpoints is present but adjust thresholds to match real traffic.

## 13. Next recommended steps for production hardening

1. Enable Postgres in staging/production and run migrations using `prisma migrate deploy`.
2. Ensure webhook signing validation with `STRIPE_WEBHOOK_SECRET` and monitor webhook failures.
3. Configure Sentry and ensure `SENTRY_DSN` is set in production.
4. Move secrets into a managed secrets store (Vault, AWS Secrets Manager, Azure Key Vault) and avoid plaintext .env in repos.
5. Add health checks, Prometheus metrics, and alerting for queue/backlog growth and webhook failures.
6. Consider making the cron runner a separate process / serverless job for scalability.
7. Audit admin endpoints and consider 2FA or IP allowlisting for admin access.

## 14. Where to start next

- For onboarding a developer: run `npm ci`, `npx prisma generate`, `node scripts/seed-demo.js` and `npm run dev:win`.
- For testing Postgres locally: follow `docs/POSTGRES_MIGRATION.md`.

---

This file is intended as a living document. If you want, I can expand any section with copy-pasteable runbooks, a diagram of the architecture, or a shorter executive summary suitable for product or sales pages.
