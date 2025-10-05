## ChurnGuard Demo Checklist — live walkthrough

1) Start ChurnGuard in dev mode on port 3100 (PowerShell):

```powershell
$env:ADMIN_SECRET='demo_admin_secret'; $env:CSRF_SECRET='demo_csrf'; $env:NEXT_TELEMETRY_DISABLED='1'; npm run dev -- -p 3100
```

2) Open demo pages:
- Admin UI: http://localhost:3100/admin-login (use `demo_admin_secret` or ADMIN_USER/ADMIN_PASS if set)
- Public site / checkout: http://localhost:3100

3) Run the smoke tests (optional) to show the app works end-to-end:

```powershell
#$env:E2E_BASE_URL='http://localhost:3100'; $env:E2E_COMMAND='npm run dev -- -p 3100'; npm run e2e:run
```

4) Demo flow ideas:
- Show Audit Log and export CSV.
- Forward a real failed invoice webhook via `stripe listen` and show dunning case creation.
- Run dunning dry-run in Safe Mode.
- Show recovery attribution after a simulated payment success webhook.

Notes:
- Run outside OneDrive (or WSL) if you see Prisma EPERM rename issues.
- `SAFE_MODE=true` prevents outbound email/charges.
- See `DEMO_QUICKSTART.md` for a scripted flow.