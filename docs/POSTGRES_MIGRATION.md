# Postgres migration (with real enums)

This repo ships with SQLite for frictionless local dev, plus a Postgres schema (`prisma/schema.postgres.prisma`) that defines real database enums for production.

Follow these steps on Windows (PowerShell) to run Postgres locally and migrate:

## 1) Start Postgres and Redis with Docker

```powershell
# Requires Docker Desktop installed and running
docker compose -f .\docker-compose.yml up -d db redis
```

- Postgres runs at `localhost:5432` with user `postgres`, password `postgres`, database `micro_saas`.

## 2) Point your environment to Postgres

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/micro_saas?schema=public"
```

Optionally, save this in `.env.local` (see `.env.example`).

## 3) Switch Prisma to Postgres schema and migrate

Option A (temporary, local-only) — use the Postgres schema file:

```powershell
# Generate client from the Postgres schema and apply migrations
npx prisma generate --schema=prisma/schema.postgres.prisma
npx prisma migrate dev --name init_enums --schema=prisma/schema.postgres.prisma
```

Option B (project-wide) — replace the contents of `prisma/schema.prisma` with the Postgres provider and enums from `prisma/schema.postgres.prisma`. Commit the change, then:

```powershell
npx prisma generate
npx prisma migrate dev --name init_enums
```

## 4) Run the app/tests against Postgres

```powershell
npm run dev
# or
npm test
```

If the client was generated against the Postgres schema, the app will read/write the enum columns directly.

## 5) CI and Production

- In CI, set `DATABASE_URL` to a Postgres connection string so `prisma migrate deploy` runs.
- In production, deploy with `DATABASE_URL` set. The app will use Postgres enums.

## Rollback to SQLite (local convenience)

- Unset `DATABASE_URL` or set it to `file:./dev.db`.
- Re-generate the Prisma client with the default `prisma/schema.prisma`:

```powershell
npx prisma generate --schema=prisma/schema.prisma
npx prisma db push --schema=prisma/schema.prisma
```

Note: The application uses `lib/enums` constants so code stays consistent across providers. Real DB enums are activated when you migrate with Postgres.
