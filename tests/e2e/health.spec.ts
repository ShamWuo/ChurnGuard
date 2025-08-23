import { test, expect } from '@playwright/test';

test('health endpoint ok', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.ok()).toBeTruthy();
  const json = await res.json();
  expect(json).toHaveProperty('ok', true);
});

test('ready endpoint has flags', async ({ request }) => {
  const res = await request.get('/api/ready');
  // Ready may be 503 in dev if env vars are missing; still assert JSON shape
  expect([200, 503]).toContain(res.status());
  const json = await res.json();
  expect(json).toHaveProperty('ok');
  expect(json).toHaveProperty('db');
  expect(json).toHaveProperty('stripe');
});
