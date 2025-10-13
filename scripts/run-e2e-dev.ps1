# Start Next dev in background, wait for /api/health, run Playwright tests, then kill dev server
param(
  [int]$Port = 3100
)

$env:NODE_ENV = 'development'
$env:NEXT_TELEMETRY_DISABLED = '1'
Write-Output "Starting Next dev on port $Port"
Write-Output "Spawning 'npx next dev -p $Port' via cmd.exe"
$startInfo = New-Object System.Diagnostics.ProcessStartInfo
# Use cmd.exe /c so Windows can resolve the npx command correctly
$startInfo.FileName = 'cmd.exe'
$startInfo.Arguments = "/c npx next dev -p $Port"
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true
$startInfo.UseShellExecute = $false
$startInfo.CreateNoWindow = $true
# Ensure the dev server starts from the repository root so npx and next resolve correctly
$startInfo.WorkingDirectory = (Get-Location).Path

$proc = New-Object System.Diagnostics.Process
$proc.StartInfo = $startInfo
try {
  $ok = $proc.Start()
  if (-not $ok) { throw "Failed to start process" }
  Start-Sleep -Milliseconds 200
  if ($proc.HasExited) {
    $stderr = $proc.StandardError.ReadToEnd();
    Write-Error "Dev server process exited early. Stderr:\n$stderr"
    exit 1
  }
} catch {
  Write-Error "Failed to start dev server process: $_"
  exit 1
}
Start-Sleep -Seconds 1

# Wait for /api/health
$base = "http://localhost:$Port"
$deadline = (Get-Date).AddSeconds(60)
while ((Get-Date) -lt $deadline) {
  try {
    $r = Invoke-WebRequest -Uri "$base/api/health" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    if ($r.StatusCode -eq 200) { Write-Output 'Server ready'; break }
  } catch {}
  Start-Sleep -Seconds 1
}

if ((Get-Date) -ge $deadline) {
  Write-Error "Timed out waiting for dev server"
  try { if ($proc -and -not $proc.HasExited) { $proc.Kill() } } catch {}
  exit 1
}

# Run Playwright tests (will reuse existing server via PLAYWRIGHT_SKIP_SERVER)
Write-Output 'Running Playwright tests...'
$env:E2E_SKIP_SERVER = '1'
# Tell Playwright which base URL to use so it targets our dev server on the chosen port
$env:E2E_BASE_URL = "http://localhost:$Port"
npm run e2e:run --silent
$exit = $LastExitCode
Write-Output "Playwright exit code: $exit"

# Kill dev server
  try { if ($proc -and -not $proc.HasExited) { $proc.Kill() } } catch {}
exit $exit
