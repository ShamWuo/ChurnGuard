CI notes for Prisma

- The existing `.github/workflows/ci.yml` already runs `npx prisma generate` and `npx prisma db push` which is sufficient for the SQLite-based CI flow.

- If you switch CI to use Postgres for running migrations/tests, update the workflow:
  - Start Postgres service (use `services:` in the workflow or run `docker compose up` in a step).
  - Set `PRISMA_DB_PROVIDER=postgresql` and `DATABASE_URL` to the test Postgres connection string.
  - Replace `npx prisma db push` with `npx prisma migrate deploy` when testing production migrations.
  - Ensure the workflow runs `npx prisma generate` before building.

Example snippet for a job using a Postgres service:

```yaml
services:
  postgres:
    image: postgres:15
    env:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: app
      POSTGRES_DB: app
    ports:
      - 5432:5432
    options: >-
      --health-cmd "pg_isready -U app" --health-interval 10s --health-timeout 5s --health-retries 5

steps:
  - name: Set DATABASE_URL
    run: echo "DATABASE_URL=postgresql://app:app@localhost:5432/app?schema=public" >> $GITHUB_ENV
  - name: Generate and migrate
    run: |
      npx prisma generate
      npx prisma migrate deploy
```

If you'd like, I can open a PR that updates the CI workflow to run a Postgres-based integration job and keep the existing SQLite path for faster PR checks.
