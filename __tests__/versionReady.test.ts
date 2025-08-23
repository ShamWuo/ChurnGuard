import { createMocks } from 'node-mocks-http';
import version from '../pages/api/version';
import ready from '../pages/api/ready';

test('version returns version and commit', async () => {
  const { req, res } = createMocks({ method: 'GET' });
  await version(req as any, res as any);
  expect(res._getStatusCode()).toBe(200);
  const j = JSON.parse(res._getData());
  expect(j.version).toBeDefined();
  expect(j.commit).toBeDefined();
});

test('ready returns status', async () => {
  const { req, res } = createMocks({ method: 'GET' });
  await ready(req as any, res as any);
  const code = res._getStatusCode();
  expect([200, 503]).toContain(code);
  const j = JSON.parse(res._getData());
  expect(j.db).toBeDefined();
  expect(j.stripe).toBeDefined();
});
