### What

Adds docs and CI/e2e readiness for demo and selling.

This PR includes:
- idempotent demo seed script
- Windows-friendly dev commands and README notes
- Playwright e2e workflow and local run instructions
- small e2e flakiness fixes (portal click fallbacks)
- CHANGELOG and SELLING notes

### Why

Make it easy to run the app locally for demos and to run automated e2e checks in CI.

### How to verify locally

1. Install dependencies: `npm ci`
2. Generate Prisma client & apply migrations: `npx prisma generate && npx prisma migrate dev --name init --skip-seed`
3. Seed and start dev on port 3100 (Windows cmd):

```powershell
cmd /c "set ADMIN_SECRET=secret123&& set CSRF_SECRET=csrf123&& set NEXT_TELEMETRY_DISABLED=1&& npm run demo"
```

4. Run Playwright e2e pointing at the running server:

```powershell
cmd /c "set E2E_USE_DEV=1&& set E2E_BASE_URL=http://localhost:3100&& set ADMIN_SECRET=secret123&& set CSRF_SECRET=csrf123&& set CRON_SECRET=cronsecret123&& npm run e2e:run"
```

### Notes

- Add CI secrets (see CI_SECRETS.md) before running Playwright workflow in Actions.
