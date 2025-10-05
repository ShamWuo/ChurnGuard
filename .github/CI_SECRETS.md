CI & Scheduled workflows - required secrets

Set these repository secrets (GitHub Settings > Secrets) for the workflows to function securely:

- SITE_URL: The publicly reachable URL of your site (e.g. https://app.example.com). Used by the scheduled purge job.
- ADMIN_SECRET: Admin secret used by internal admin endpoints. The scheduled job can use this to call `/api/admin/cron/purge-csp`.
- CRON_SECRET: Alternative token used by cron endpoints if you prefer a dedicated cron token instead of ADMIN_SECRET.
- DATABASE_URL (optional for production CI): Connection string for a managed Postgres DB when you want CI to use an external DB.
- STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET: For any CI jobs that test Stripe webhooks or billing flows.
- SENTRY_DSN: If you want CI/test runs to send events to Sentry (usually not recommended for CI).

Notes
- Avoid committing secrets. Use GitHub Secrets and restrict access to maintainers only.
- For local dev, use environment variables or a `.env.local` file (do NOT commit it).

PowerShell convenience (local dev)

If you're testing locally on Windows PowerShell and want a stable port for Playwright or smoke tests, run:

```powershell
$env:ADMIN_SECRET='secret123'; $env:CSRF_SECRET='csrf123'; $env:NEXT_TELEMETRY_DISABLED='1'; npm run dev -- -p 3100
```

This matches the example used by the project's Playwright/E2E instructions and keeps CI/locals consistent.
