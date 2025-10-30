Prisma in CI and Windows OneDrive

Problems you may see
- On Windows with OneDrive the Prisma native engine can fail to generate with EPERM rename errors. This impacts `npx prisma generate` and can break local dev or CI builds when code lives in a synced folder.
- CI runners may require system libraries and an appropriate environment (glibc, libssl, libpq headers) to build native Prisma engines.

Recommendations
1. Don't develop from a OneDrive-synced folder.
   - Clone the repository to a local folder outside OneDrive. Example: `C:\repos\Dunnr`.
   - Or use WSL and keep the project inside the Linux filesystem (`/home/<user>/projects/Dunnr`).

2. Ensure CI installs system dependencies before running `npx prisma generate`.
   - On Ubuntu runners: install `build-essential`, `libssl-dev`, and `libpq-dev` (if using Postgres).
   - The example CI workflow (`.github/workflows/ci.yml`) installs these packages before calling `npx prisma generate`.

3. Use a Postgres test DB in CI (recommended) instead of SQLite dev DB.
   - The CI workflow starts a Postgres service and sets `DATABASE_URL` to the container.
   - Use `npx prisma migrate deploy` in CI to apply migrations. If migrations are not available, `npx prisma db push` is a fallback.

4. If your CI environment still cannot produce Prisma native engines, consider one of:
   - Use a Docker-based build step that runs `npx prisma generate` in a container image known to work with Prisma.
   - Use the binaryTargets option in `schema.prisma` to target the runner (e.g., `binaryTargets = [
