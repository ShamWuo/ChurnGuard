import { test, expect } from '@playwright/test';

test('middleware sets core security headers on pages', async ({ request }) => {
  const res = await request.get('/');
  expect(res.ok()).toBeTruthy();
  const h = res.headers();
  expect(h['content-security-policy']).toBeTruthy();
  expect(h['strict-transport-security']).toBeTruthy();
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-frame-options']).toBeTruthy();
  expect(h['x-request-id']).toBeTruthy();
});

test('middleware sets headers on APIs as well', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.ok()).toBeTruthy();
  const h = res.headers();
  expect(h['content-security-policy']).toBeTruthy();
  expect(h['strict-transport-security']).toBeTruthy();
  expect(h['x-content-type-options']).toBe('nosniff');
  expect(h['x-frame-options']).toBeTruthy();
  expect(h['x-request-id']).toBeTruthy();
});
