DEPLOYMENT

Essential env vars
- DATABASE_URL (Postgres recommended)
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- STRIPE_PRICE_ID (or handle via UI)
- NEXT_PUBLIC_APP_URL
- ADMIN_SECRET
- CSRF_SECRET
- CRON_SECRET
- POSTMARK_SERVER_TOKEN or SMTP creds
- SENTRY_DSN (optional)

Recommended GitHub Actions snippet (migrations + build + e2e):

```yaml
name: prod-deploy
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2 # or setup node
      - name: Install
        run: npm ci
      - name: Prisma migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: npx prisma migrate deploy
      - name: Build
        run: npm run build
      - name: Playwright e2e (smoke)
        env:
          STRIPE_SECRET_KEY: ${{ secrets.STRIPE_SECRET_KEY }}
          STRIPE_WEBHOOK_SECRET: ${{ secrets.STRIPE_WEBHOOK_SECRET }}
          PLAYWRIGHT_RUN_BILLING: true
        run: npx playwright test --project=chromium --max-failures=1
      - name: Deploy
        run: echo "deploy step here"
```

Notes:
- Run e2e on ubuntu to avoid Windows/OneDrive issues.
- Keep test Stripe keys in a separate set of secrets and prefer test mode for CI.
- Ensure migration step is idempotent and included before the build in the pipeline.

