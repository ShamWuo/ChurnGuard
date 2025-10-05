import { defineConfig, devices } from '@playwright/test';

const skipServer = !!process.env.E2E_SKIP_SERVER;
// On Windows/OneDrive the Next dev server can hit readlink EPERM/EINVAL; prefer production start locally on Windows
const isWindows = process.platform === 'win32';
// For CI runs we rely on E2E_USE_DEV; locally prefer dev server except on Windows where
// production-start may be more reliable. Keep behavior simple and explicit via env vars.
const useDevServer = process.env.CI ? !!process.env.E2E_USE_DEV : (!isWindows && true);

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // Be slightly more forgiving on Windows runners: give one retry locally on Windows
  retries: process.env.CI ? 2 : (isWindows ? 1 : 0),
  // Limit workers on Windows to reduce flakiness; CI uses multiple workers.
  workers: process.env.CI ? 2 : (isWindows ? 1 : undefined),
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  webServer: skipServer ? undefined : (useDevServer ? {
    command: 'npm run dev:3100',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: Number(process.env.E2E_TIMEOUT_MS || 180_000),
    env: {
      ADMIN_SECRET: process.env.ADMIN_SECRET || 'test_admin_secret',
      CSRF_SECRET: process.env.CSRF_SECRET || 'test_csrf_secret',
      NEXT_TELEMETRY_DISABLED: '1',
  E2E_BASE_URL: 'http://localhost:3100',
    },
  } : {
    // Build then start a production server (useful on Windows/OneDrive where dev server can fail)
    command: process.env.E2E_COMMAND || 'npm run e2e:start',
    url: process.env.E2E_BASE_URL || 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: Number(process.env.E2E_TIMEOUT_MS || 180_000),
  }),
  use: {
    baseURL: process.env.E2E_BASE_URL || (useDevServer ? 'http://localhost:3100' : 'http://localhost:3000'),
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  // env is not a valid property on 'use' according to Playwright types; rely on process.env instead
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
