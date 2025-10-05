#!/usr/bin/env bash
set -euo pipefail
URL=${1:-http://localhost:3000}
echo "Checking $URL/api/ready"
if curl -sS -f "$URL/api/ready" >/dev/null; then
  echo "ready"
  curl -sS "$URL/api/health"
  curl -sS "$URL/api/version"
  exit 0
else
  echo "not ready"
  exit 2
fi
