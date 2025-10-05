PR title

product/ci: productize repo — demo seed, CI/e2e, smoke, recovered-revenue API + admin UI, docs

Description

Summary
- Productization changes to prepare the app for selling: add idempotent demo seed, a smoke readiness probe, a CI workflow that builds + smoke-checks + runs unit tests (and Playwright e2e when Stripe secrets are present), admin safety guards, recovered-revenue API + UI card, e2e guards for missing Stripe secrets, and helpful docs for CI/production.

Key changes
- `pages/api/admin/recovered.ts` — new admin-only recovered-revenue aggregation + CSV/HEAD support.
- `pages/admin.tsx` — admin UI: added recovered card + sparkline + CSV link.
- `__tests__/recovered.test.ts` — unit tests for recovered endpoint.
- `scripts/smoke-ready.js` — lightweight readiness probe (prints SMOKE_OK/SMOKE_FAIL).
- `.github/workflows/ci.yml` — CI: build, start server, smoke-check, tsc, jest, Playwright conditional.
- `playwright.config.ts`, `tests/e2e/*` — e2e guards for missing Stripe keys.
- `pages/api/stripe/webhook.ts` — cleaned webhook handler.
- Minor TS/test fixes across repo.

Reviewer checklist
- [ ] Run demo seed:
  ```powershell
  cmd /c "set ADMIN_SECRET=secret123&& set CSRF_SECRET=csrf123&& set NEXT_TELEMETRY_DISABLED=1&& node scripts/seed-demo.js"
  ```
- [ ] Start dev server and smoke-check readiness:
  ```powershell
  $env:ADMIN_SECRET='secret123'; $env:CSRF_SECRET='csrf123'; $env:NEXT_TELEMETRY_DISABLED='1'; npx next dev -p 3100
  node scripts/smoke-ready.js http://localhost:3100/api/ready 5000
  ```
- [ ] Run typecheck and tests:
  ```powershell
  npx tsc --noEmit
  npm run test:recovered
  npm test
  ```
- [ ] (Optional) Run Playwright e2e:
  ```powershell
  $env:E2E_USE_DEV='1'; $env:E2E_BASE_URL='http://localhost:3100'; npx playwright test --reporter=list
  ```

CI notes
- Provide `ADMIN_SECRET`, `CSRF_SECRET`, and `DATABASE_URL` as GitHub secrets for CI to run.
- Provide `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` if you want Playwright billing flows exercised by CI.

Screenshots / Demos
- Admin panel now shows a recovered revenue card with total recovered, per-bucket sparkline and CSV download link.

Release checklist
- See `RELEASE_CHECKLIST.md` in repo for detailed steps.

If you'd like I can open a draft PR for you (I can create the branch/PR here if you want), or run any remaining tasks (CI tweaks, docs polish).
