# PowerShell helper: start Next.js dev with required env vars on Windows
# Usage: .\scripts\start-dev-win.ps1 -Port 3100 -AdminSecret secret123
param(
    [int]$Port = 3100,
    [string]$AdminSecret = 'secret123',
    [string]$CsrfSecret = 'csrf123'
)

Write-Output "Setting env vars and starting Next dev on port $Port"
$Env:ADMIN_SECRET = $AdminSecret
$Env:CSRF_SECRET = $CsrfSecret
$Env:NEXT_TELEMETRY_DISABLED = '1'

# Forward additional args to npm run dev
npx next dev -p $Port
