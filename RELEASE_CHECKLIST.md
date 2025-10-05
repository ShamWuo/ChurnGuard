Release checklist — Productization (short)

Purpose
- Concrete steps to verify and ship the productization changes in branch `docs/e2e-ci-instructions`.

Pre-PR
- [ ] Make sure your working tree is clean and on branch `docs/e2e-ci-instructions`.
- [ ] Run the demo seed (idempotent):
  - Windows PowerShell:
    ```powershell
    cmd /c "set ADMIN_SECRET=secret123&& set CSRF_SECRET=csrf123&& set NEXT_TELEMETRY_DISABLED=1&& node scripts/seed-demo.js"
    ```
- [ ] Run TypeScript check and unit tests locally:
  ```powershell
  npx tsc --noEmit
  npm run test:recovered
  npm test
  ```

Dev server & smoke
- [ ] Start dev server with envs (PowerShell):
  ```powershell
  $env:ADMIN_SECRET='secret123'; $env:CSRF_SECRET='csrf123'; $env:NEXT_TELEMETRY_DISABLED='1'; npx next dev -p 3100
  ```
- [ ] In another terminal, run readiness probe:
  ```powershell
  node scripts/smoke-ready.js http://localhost:3100/api/ready 5000
  ```
  - Expect `SMOKE_OK` and a 200 JSON body from `/api/ready`.

Playwright E2E
- [ ] Reuse dev server to run E2E locally (optional):
  ```powershell
  $env:E2E_USE_DEV='1'; $env:E2E_BASE_URL='http://localhost:3100'; npx playwright test --reporter=list
  ```
  - Billing-related specs are guarded and will skip if `STRIPE_*` secrets are not present.

CI / PR
- [ ] Open a PR from `docs/e2e-ci-instructions` into your primary branch.
- [ ] Add repository secrets (if you want full Playwright billing tests):
  - `ADMIN_SECRET`, `CSRF_SECRET`, `DATABASE_URL` (required for server + unit tests)
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (only if you want billing e2e)
  - Optional SMTP/Sendgrid secrets for email flows in e2e
- [ ] Confirm GitHub Actions run completes: build, start server, smoke, tsc, jest; Playwright will run only when STRIPE_* are present.

Rollback / Safety
- [ ] If an unintended schema change lands, create a new migration and test against staging before promoting to production.
- [ ] To quickly revert: open a PR that reverts the branch merge and redeploy.

Notes
- The admin recovered revenue CSV download and HEAD behavior are implemented in `pages/api/admin/recovered.ts`.
- Webhook logic was consolidated into `pages/api/stripe/webhook.ts` — verify your Stripe webhook endpoint if deploying.

Contact
- If CI fails, copy the failing job logs and paste them in the PR for triage.
