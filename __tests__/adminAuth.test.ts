import { createMocks } from 'node-mocks-http';
import jwt from 'jsonwebtoken';
import loginHandler from '../pages/api/admin/login';
import logoutHandler from '../pages/api/admin/logout';

describe('admin auth endpoints', () => {
  const OLD = process.env;
  beforeEach(() => { process.env = { ...OLD, ADMIN_SECRET: 's3cret', ADMIN_USER: 'admin', ADMIN_PASS: 'pass' }; });
  afterEach(() => { process.env = OLD; });

  test('login sets cookie', async () => {
    const { req, res } = createMocks({ method: 'POST', body: { username: 'admin', password: 'pass' } });
    await loginHandler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    const set = res._getHeaders()['set-cookie'] || res._getHeader('Set-Cookie');
    expect(set).toBeDefined();
    expect(String(set)).toMatch(/admin_token=/);
  });

  test('logout clears cookie', async () => {
    const token = jwt.sign({ admin: true }, 's3cret', { expiresIn: '2h' });
    const { req, res } = createMocks({ method: 'POST', headers: { cookie: `admin_token=${encodeURIComponent(token)}; csrf_token=abc`, 'x-csrf-token': 'abc' } });
  await logoutHandler(req as any, res as any);
    const set = res._getHeaders()['set-cookie'];
    expect(String(set)).toMatch(/Max-Age=0/);
  });
});
