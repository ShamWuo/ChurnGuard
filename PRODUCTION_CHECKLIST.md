Production checklist (minimal)

1. Secrets & configuration
   - Add repository or platform secrets: DATABASE_URL, ADMIN_SECRET, CSRF_SECRET, CRON_SECRET, STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, POSTMARK_SERVER_TOKEN (or SMTP creds), SENTRY_DSN (optional).
   - Set `NODE_ENV=production` and `SAFE_MODE=false` once ready.

2. Database & migrations
   - Use Postgres in production.
   - Run: `npx prisma migrate deploy` as part of CI/CD.
   - Ensure `npx prisma generate` runs during build.

3. Build & runtime
   - Build with `npm run build` in CI.
   - Start with `npm run start`. The Dockerfile exposes port 3000.
   - Ensure `PORT` env matches your host (default 3000).

4. Observability
   - Configure Sentry (`SENTRY_DSN`) and logging endpoint.
   - Configure email alerts or Slack for critical errors.

5. Security
   - Use HTTPS and HSTS at the platform level.
   - Configure `COOKIE_DOMAIN` and secure cookie settings in production.
   - Add `STRIPE_WEBHOOK_SECRET` to verify webhooks.

6. Safe deployment
   - Start in SAFE_MODE=true for the first deploy if you want to prevent live charges/emails.
   - Run smoke tests and Playwright e2e in a staging environment with Stripe test keys.

7. Backup & retention
   - Configure DB backups and retention policy.
   - Document data retention and audit export process.

8. Monitoring
   - Add healthcheck to platform: `/api/ready`.
   - Run periodic audit exports and review retention.

If you want, I can add a GitHub Actions deploy job for your target (Vercel/GCP/Azure) and a `docker-compose.prod.yml` for local production testing.
