Playwright E2E and CI

This project includes Playwright end-to-end tests and a GitHub Actions job to run them on ubuntu-latest.

Key points

- Local dev (Windows): some Playwright tests can be flaky on Windows/OneDrive. Use the helper scripts in `scripts/` to run dev server + e2e locally.
- CI (recommended): run Playwright on `ubuntu-latest` using the provided workflow `.github/workflows/playwright-e2e.yml`.

Required repository secrets for CI (set in repo Settings > Secrets):
- ADMIN_SECRET
- CSRF_SECRET
- DATABASE_URL (database for Prisma production start)

Optional secrets to enable billing e2e tests:
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- PLAYWRIGHT_RUN_BILLING (set to '1' to enable billing tests)

Debugging flags

- E2E_USE_DEV=1: tell Playwright to start a Next dev server for tests.
- E2E_BASE_URL: override the base URL Playwright uses for API requests (defaults to http://localhost:3100 for dev, http://localhost:3000 for prod).

Windows notes

- On Windows + OneDrive the Next dev server may fail to start due to symlink/readlink behavior. CI on linux is the most reliable target.
- If you must run Playwright locally on Windows, run tests with single worker: `npx playwright test -j1`.

CI workflow

- The GitHub Actions workflow builds the app and starts it with `npm start`, waits for `/api/health`, and runs `npx playwright test`.
- The workflow uploads the Playwright HTML report artifact on completion.

