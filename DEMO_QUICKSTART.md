# ChurnGuard Demo Quickstart

Run a self-contained demo of ChurnGuard with seeded data and safe mode enabled.

## One-liner (PowerShell)
```powershell
Copy-Item .env.example .env.demo -Force; $env:ADMIN_SECRET='demo_admin_secret'; $env:CSRF_SECRET='demo_csrf'; $env:SAFE_MODE='true'; node scripts/seed-demo.js; npm run dev -- -p 3100
```

Then open:
- Admin: http://localhost:3100/admin-login  (use ADMIN_SECRET or configured ADMIN_USER/ADMIN_PASS)
- Public: http://localhost:3100

## Step-by-step
1. Copy env template
```powershell
Copy-Item .env.example .env.demo -Force
```
2. Set demo env vars (ephemeral in this shell)
```powershell
$env:ADMIN_SECRET='demo_admin_secret'
$env:CSRF_SECRET='demo_csrf'
$env:SAFE_MODE='true'
```
3. Seed demo data
```powershell
node scripts/seed-demo.js
```
4. Start server
```powershell
npm run dev -- -p 3100
```
5. (Optional) Forward Stripe webhooks
```powershell
stripe listen --forward-to localhost:3100/api/stripe/webhook
```

## Clean exit
Stop the server (Ctrl+C). No persistent external state unless you pointed `DATABASE_URL` at Postgres.

## Next
Switch to Postgres for parity: see `docs/POSTGRES_MIGRATION.md`.
