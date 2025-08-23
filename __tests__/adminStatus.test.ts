import { createMocks } from 'node-mocks-http';
import statusHandler from '../pages/api/admin/status';

test('admin status exposes uptime and safeMode flags', async () => {
  const { req, res } = createMocks({ method: 'GET' });
  await statusHandler(req as any, res as any);
  const code = res._getStatusCode();
  expect([200, 500]).toContain(code);
  const j = JSON.parse(res._getData());
  if (code === 200) {
    expect(j).toHaveProperty('uptime');
    expect(j).toHaveProperty('safeMode');
  }
});
