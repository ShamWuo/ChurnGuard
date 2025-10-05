# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]
- Productization: admin safety, export, demo seed, CI, e2e guards for Stripe.
- Docker: production Dockerfile hardened and smoke workflow added.
- Docs: `PRODUCTION_CHECKLIST.md`, `CI_SECRETS.md` updates, README improvements.

## [1.0.1] - 2025-10-05
### Fixed
- Test stability: provide default `DATABASE_URL` in test environment to prevent Prisma initialization errors causing analytics & audit tests to fail.
### Internal
- Minor build verification and release automation prep.

## [1.0.0] - 2025-10-04
### Added
- Initial public release under new name ChurnGuard.
- Automated dunning processor (retry attempts, reminders, safe mode).
- Stripe webhook handlers (invoice + subscription lifecycle).
- Admin console (auth, CSRF, rate limiting, audit log export, health dashboards).
- Recovery attribution & analytics endpoints.
- Prisma dual-schema strategy (SQLite dev, Postgres enums for prod).
- Seed/demo script & backfill recovery script.
- CI workflows (unit + Playwright E2E, optional Docker smoke build).
- Postgres migration documentation and environment template.

### Changed
- Project renamed from "Stripe Churn Deflection" to "ChurnGuard" for branding clarity.

### Security / Hardening
- Safe mode flag to prevent side effects in first deploys.
- HMAC cron protection & signed Stripe webhook verification (when secret set).

### Notes
- This baseline packs core recovery logic; future roadmap: richer analytics, offer management, multi-channel escalation, pluggable notification drivers.


