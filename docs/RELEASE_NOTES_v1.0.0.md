## ChurnGuard v1.0.0 Release Notes

Release date: 2025-10-04

### Overview
ChurnGuard (initial public release) delivers an operationally focused churn deflection layer for Stripe-based SaaS products: automated dunning, recovery attribution, and an admin console with observability and safety features.

### Feature Highlights
- Stripe invoice & subscription webhook processing
- Dunning engine (retry scheduling with exponential backoff + reminders)
- Safe Mode & dry-run support
- Recovery attribution (source tagging: retry/backfill/manual)
- Admin console: audit export, settings, dunning runs, CSP reports, health/ready/version endpoints
- Analytics endpoint with ETag + CSV support
- Email + (optional) Slack reminder channels
- Prisma dual schema (SQLite dev / Postgres enums for production)
- Seed + recovery backfill scripts
- CI (Jest + Playwright; conditional Postgres migration)

### Breaking Changes
None relative to the pre-release internal version aside from the package/repo rename to `ChurnGuard`.

### Upgrade Notes
If you used the pre-release name:
1. Update any Docker image references: `stripe-churn` -> `churnguard`.
2. Replace old GitHub workflow badge URLs with `ShamWuo/ChurnGuard`.
3. If you pinned the package name internally, update to `churnguard`.

### Environment Recap
Required for production:
- DATABASE_URL (Postgres)
- STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET
- ADMIN_USER / ADMIN_PASS / CSRF_SECRET (or ADMIN_SECRET legacy fallback)
- CRON_SECRET

Optional:
- REDIS_URL, POSTMARK_SERVER_TOKEN or SMTP_*, SENTRY_DSN, SLACK_WEBHOOK_URL

### Roadmap (Proposed)
- Offer / incentive workflows (discount & win-back sequences)
- Multi-channel escalation policies (email, Slack, SMS)
- Rich retention dashboards (cohort churn, recovery velocity)
- Pluggable notification & metrics adapters
- Tenant / multi-product support

### Acknowledgements
Thanks to early testers and internal usage scenarios that shaped hardening steps (safe mode, auth, CSRF, rate limiting, OneDrive-friendly Prisma setup).

---
MIT Licensed. See `LICENSE` for details.
