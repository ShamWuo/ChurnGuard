# ChurnGuard demo convenience script
# Usage: powershell -ExecutionPolicy Bypass -File scripts/start-demo.ps1

param(
    [switch]$Seed,
    [int]$Port = 3100,
    [string]$AdminSecret = "demo_admin_secret"
)

Write-Host "[ChurnGuard] Preparing demo environment..." -ForegroundColor Cyan

$env:ADMIN_SECRET = $AdminSecret
$env:CSRF_SECRET = "csrf123"
$env:SAFE_MODE = "true"
$env:NEXT_TELEMETRY_DISABLED = "1"
$env:PRISMA_CLIENT_ENGINE_TYPE = "library"

if ($Seed) {
  Write-Host "[ChurnGuard] Seeding demo data..." -ForegroundColor Yellow
  node scripts/seed-demo.js 2>$null
}

Write-Host "[ChurnGuard] Starting dev server on port $Port (SAFE_MODE=$env:SAFE_MODE)" -ForegroundColor Green
npm run dev -- -p $Port