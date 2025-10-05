Privacy & GDPR notes

This project includes admin-facing features that access user emails and Stripe customer IDs. For a production release:

- Add a clear privacy policy page describing what data is collected, how long it is retained, and how customers can request deletion.
- Implement a deletion endpoint (`POST /api/admin/delete-user`) which performs soft-delete and triggers a purge job to remove personal data after retention.
- Provide customers with data export (CSV/JSON) on request. The `pages/api/admin/export` endpoint is a minimal example.
- Ensure logs, backups, and audit logs that contain personal data have a retention policy and are stored encrypted.
- Document data processing and subprocessors (Stripe, Postmark, Sentry).
