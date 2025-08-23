import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/health';

test('health returns ok', async () => {
  const { req, res } = createMocks({ method: 'GET' });
  await handler(req as any, res as any);
  expect(res._getStatusCode()).toBe(200);
  const j = JSON.parse(res._getData());
  expect(j.ok).toBe(true);
});
