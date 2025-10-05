import type { FullConfig } from '@playwright/test';

export default async function globalSetup(config: FullConfig) {
  // If E2E_SKIP_SERVER is set, tests should skip waiting for a local server
  // (useful when CI provides its own server). Otherwise wait for the server.
  if (process.env.E2E_SKIP_SERVER) return;
  // Default to 3100 in local dev runs where the helper/dev server binds to that port.
  const baseURL = process.env.E2E_BASE_URL || 'http://localhost:3100';
  const url = new URL('/api/health', baseURL).toString();
  const deadline = Date.now() + 60_000;
  let lastErr: any = null;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(url, { method: 'GET', cache: 'no-store' });
      if (res.ok) return;
      lastErr = new Error(`HTTP ${res.status}`);
    } catch (e: any) {
      lastErr = e;
    }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error(`Timed out waiting for server at ${url}: ${lastErr?.message || lastErr}`);
}
