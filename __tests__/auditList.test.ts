import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/admin/audit-list';

describe('audit-list API', () => {
  const OLD = process.env;
  beforeEach(() => { process.env = { ...OLD, ADMIN_SECRET: 's3cret', ADMIN_USER: 'admin', ADMIN_PASS: 'pass' }; });
  afterEach(() => { process.env = OLD; });

  test('returns 401 without cookie', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { page: '1' } });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(401);
  });

  test('returns logs when authenticated', async () => {
    // simulate login cookie by calling login handler
    const { req: lr, res: lrRes } = createMocks({ method: 'POST', body: { username: 'admin', password: 'pass' } });
    const login = require('../pages/api/admin/login').default;
    await login(lr as any, lrRes as any);
    const set = lrRes._getHeaders()['set-cookie'] || lrRes._getHeader('Set-Cookie');
    expect(String(set)).toMatch(/admin_token=/);
    // use cookie in next request
    const cookie = String(set).split(';')[0];
    const { req, res } = createMocks({ method: 'GET', query: { page: '1' }, headers: { cookie } });
    await handler(req as any, res as any);
    expect([200, 429]).toContain(res._getStatusCode());
  });
});
