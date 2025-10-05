@echo off
set ADMIN_SECRET=secret123
set CSRF_SECRET=csrf123
set NEXT_TELEMETRY_DISABLED=1
npm run dev -- -p 3100
