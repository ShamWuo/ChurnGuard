import { defineConfig, devices } from '@playwright/test';

const skipServer = !!process.env.E2E_SKIP_SERVER;
const useDevServer = !!process.env.E2E_USE_DEV;

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
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
    },
  } : {
    // Expect server to already be built; prevents OneDrive EPERM unlink during test
    command: process.env.E2E_COMMAND || 'npm run start',
    url: process.env.E2E_BASE_URL || 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: Number(process.env.E2E_TIMEOUT_MS || 180_000),
  }),
  use: {
    baseURL: process.env.E2E_BASE_URL || (useDevServer ? 'http://localhost:3100' : 'http://localhost:3000'),
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    env: {
      ADMIN_SECRET: process.env.ADMIN_SECRET || 'test_admin_secret',
      CSRF_SECRET: process.env.CSRF_SECRET || 'test_csrf_secret',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
