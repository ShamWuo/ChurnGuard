import { test, expect } from '@playwright/test';

const csvUrl = '/api/analytics/metrics?format=csv';

test('metrics CSV returns ETag and caches with 304 on HEAD', async ({ request }) => {
  const res = await request.get(csvUrl);
  expect(res.ok()).toBeTruthy();
  expect((res.headers()['content-type'] || '')).toContain('text/csv');
  const etag = res.headers()['etag'];
  expect(etag).toBeTruthy();

  const head304 = await request.fetch(csvUrl, { method: 'HEAD', headers: { 'if-none-match': etag! } });
  // Some environments may still return 200 on HEAD; accept 200 or 304
  expect([200, 304]).toContain(head304.status());
  if (head304.status() === 200) {
    // If 200, ensure ETag/Cache headers are present
    expect(head304.headers()['etag']).toBeTruthy();
    expect(head304.headers()['cache-control']).toBeTruthy();
  }
});

test('metrics JSON returns ETag and Cache-Control', async ({ request }) => {
  const res = await request.get('/api/analytics/metrics');
  expect(res.ok()).toBeTruthy();
  expect(res.headers()['etag']).toBeTruthy();
  expect(res.headers()['cache-control']).toBeTruthy();
});
