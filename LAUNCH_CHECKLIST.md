# Launch checklist (technical)

Pre-launch
- [ ] Ensure `DATABASE_URL` points to a managed Postgres instance.
- [ ] Ensure `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_ID` are set in production secrets.
- [ ] Confirm `SENTRY_DSN` and email SMTP/Postmark settings for support and dunning emails.
- [ ] Configure environment: `SAFE_MODE=false` for production run.
- [ ] Review CSP, HSTS, cookies, and security headers.
- [ ] Run `npx prisma migrate deploy` and confirm migrations applied.

Launch day
- [ ] Run release-check workflow (manual) and confirm all smoke tests pass.
- [ ] Verify readiness probe `/api/ready` returns 200 behind your load balancer.
- [ ] Configure cron job for daily purge of old data and nightly dunning runs.
- [ ] Monitor Sentry and set up alerts for high-severity errors.

Post-launch
- [ ] Review dunning success rate and tweak retry windows.
- [ ] Send the first recovery report to customers (metrics: recovered revenue, success rate).
- [ ] Iterate on pricing and trial conversions.
