# Stripe Churn Deflection

Reduce involuntary churn for Stripe‑based products. This app handles failed payments (dunning), offers a self‑serve billing portal, exposes a checkout endpoint, and ships with admin auth, audit logs, health/readiness endpoints, and a small test suite.

## What’s inside
- Next.js 14 + TypeScript
- Stripe webhooks (invoice.* events), Checkout and Billing Portal endpoints
- Admin dashboard with secure cookie auth (JWT), CSRF for POST, rate limiting
- Audit log model and APIs (list, CSV export, retention)
- Dunning processor with dry‑run and Safe Mode
- Health `/api/health`, Readiness `/api/ready`, Version `/api/version`
- Prisma ORM (SQLite for dev, Postgres recommended in prod)
- CI workflow + Jest tests

## Setup (Windows PowerShell)
1) Copy env vars
	- Copy `.env.example` to `.env.local` and fill values.

2) Install deps
```
npm install
```

3) Init database
```
npx prisma generate
npx prisma db push
```

4) Run dev server
```
npm run dev
```

5) Stripe webhook (optional, for local testing)
	- In another terminal:
```
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

6) Try it
	- Open http://localhost:3000
	- Click the Buy button (requires `STRIPE_PRICE_ID`)
	- Or enter a Stripe customer ID (cus_...) and open the billing portal
	- Admin: visit http://localhost:3000/admin-login, log in using `ADMIN_USER`/`ADMIN_PASS` (or legacy `ADMIN_SECRET`), then go to `/admin`

Admin security notes:
- Admin APIs require an HttpOnly cookie `admin_token` (JWT signed with `ADMIN_SECRET`).
- CSRF is enforced on admin POST endpoints; the admin UI fetches a token from `/api/admin/csrf` and sends it in `x-csrf-token`.
- Rate limiting protects admin endpoints; adjust in `lib/rateLimit.ts` if needed.

Readiness and health:
- `/api/health` returns `{ ok: true }`.
- `/api/ready` checks DB connectivity, Stripe key presence, SMTP config; returns 200 when ready, 503 otherwise.
- `/api/version` returns `{ version, commit }` for release diagnostics.

Dunning:
- The processor lives at `/api/cron/dunning` and is callable securely with `CRON_SECRET`.
- Safe Mode: set `SAFE_MODE=true` to prevent any emails/charges during testing.
- You can also trigger a run from the admin UI and choose Dry Run.

 - Analytics API supports CSV: `/api/analytics/metrics?format=csv` and HEAD requests for cache validation.
 - Update `public/robots.txt`, `public/sitemap.xml`, and `public/.well-known/security.txt` with your real domain and contacts.

## Notes
- Map your real users to `User.stripeCustomerId` for production
- Secure the cron route (HMAC via `CRON_SECRET`) and configure email/Slack for dunning
- Extend webhook handling to create recovery offers and measure recovered revenue

## Admin login

Use `/admin-login` to set the `admin_token` cookie. It accepts `ADMIN_USER`/`ADMIN_PASS` (recommended) or, if not set, a legacy flow where `ADMIN_SECRET` is the password. The cookie lasts 2 hours and is HttpOnly with SameSite=Lax.

## Environment variables

See `.env.example` for all variables, including admin auth, CSRF, Stripe, SMTP/Postmark, Slack, and cron. Optional: set `REDIS_URL` (e.g., redis://localhost:6379) to enable distributed rate limiting/caching for analytics and admin endpoints. For production, set at minimum:

- `DATABASE_URL` (Postgres recommended)
- `ADMIN_SECRET`, `ADMIN_USER`, `ADMIN_PASS`, `CSRF_SECRET`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`
- Email settings (SMTP or Postmark) if you want to send real dunning emails

## CI & tests

## CI & tests

This repo includes a small test suite and a template precompile step.

Local commands:

```powershell
npm install
npm run precompile-templates
npm test
```

On CI we run unit tests and Playwright e2e.
### End-to-end tests (Playwright)

Local run (stable on Windows OneDrive: run against dev server on port 3100):

```powershell
$env:ADMIN_SECRET='secret123'; $env:CSRF_SECRET='csrf123'; $env:NEXT_TELEMETRY_DISABLED='1'; npm run dev -- -p 3100
# new terminal
$env:E2E_BASE_URL='http://localhost:3100'; $env:E2E_COMMAND='npm run dev -- -p 3100'; npm run e2e:run
```

Headed mode:

```powershell
$env:ADMIN_SECRET='test_admin_secret'
$env:E2E_COMMAND='npm run e2e:start'
npm run e2e:headed
```

Notes:
- `ADMIN_SECRET` enables the admin login e2e via the legacy password flow.
- On Windows/OneDrive, `rimraf`/unlink can fail during builds. Use the split/start-only flow or run against `npm run dev` on a fixed port (e.g., 3100) as above.
- In CI we build, then Playwright starts with `npm run start`.

### CSP hardening
- In production, style inline is disabled (`style-src 'self'`). Scripts use a per-request nonce set by middleware and applied in `_document.tsx`. Remove any inline script usage or add proper nonces.


Environment variables are listed in `.env.example`. Important: set `STRIPE_PRICE_ID` to your created price id (for Checkout) and `STRIPE_WEBHOOK_SECRET` for webhook verification.

## Production notes: Postgres & migrations

This project uses Prisma. For production you should run Postgres and apply migrations.

Recommended steps:

1. Create a Postgres database and set `DATABASE_URL=postgresql://USER:PASS@HOST:5432/dbname`.
2. Update `prisma/schema.prisma` if needed and generate the client.
3. Run:

```powershell
npx prisma generate
npx prisma migrate dev --name init
```

4. Deploy migrations to production with `npx prisma migrate deploy` and ensure `DATABASE_URL` is set in your production env (Vercel, etc.).

Deployment tips:
- Protect webhooks and cron. For Stripe, set `STRIPE_WEBHOOK_SECRET` and use the Stripe CLI to test locally.
- Use `/api/ready` in your platform health checks.
- Consider setting `SAFE_MODE=true` for the initial production deploy, then disable it when you’re confident.

If you want, I can help wire a Postgres database service and a minimal Vercel config.

## Docker

Build and run locally:

```powershell
docker build -t stripe-churn .
docker run --rm -p 3000:3000 --env-file .env.local stripe-churn
```

## Postgres & Redis (optional)

Spin up Postgres and Redis locally with docker-compose:

```powershell
docker compose up -d db redis
# Then set DATABASE_URL=postgresql://app:app@localhost:5432/app
# And optionally set REDIS_URL=redis://localhost:6379
npx prisma generate
npx prisma migrate dev --name init
```

## Backfill recovered revenue (optional)

Fetch paid invoices from Stripe and create RecoveryAttribution rows (dry-run by default):

```powershell
set STRIPE_SECRET_KEY=sk_test_...
npm run backfill:recovery
# To write changes:
set BACKFILL_DRY_RUN=false
npm run backfill:recovery
# Filter by date:
set BACKFILL_SINCE=2024-01-01
npm run backfill:recovery
```

