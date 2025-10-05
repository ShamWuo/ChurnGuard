Run locally with Docker (production-like)

Prereqs: Docker & docker-compose installed

1) Build and start services:

```bash
docker-compose up --build
```

2) Wait for Postgres to initialize, then apply migrations and generate prisma client if needed:

```bash
# from host or inside the web container
npx prisma migrate deploy
npx prisma generate
```

3) Open http://localhost:3100

Notes:
- If you keep DB on the host at 5432, docker-compose maps the container port to host 5432.
- Use managed Postgres in production and set DATABASE_URL accordingly.
- The Dockerfile attempts to `npx prisma generate` during build when a schema is present. If that fails on Windows/OneDrive, run `npx prisma generate` locally or in the container after startup.
