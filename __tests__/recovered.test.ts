import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/admin/recovered';
import prisma from '../lib/prisma';

describe('admin recovered endpoint', () => {
  const OLD = process.env;
  beforeEach(() => { process.env = { ...OLD, ADMIN_SECRET: 's3cret' }; });
  afterEach(() => { process.env = OLD; jest.resetAllMocks(); });

  beforeEach(() => {
    if (!prisma) throw new Error('prisma shim not available in test environment');
    (prisma as any).recoveryAttribution = (prisma as any).recoveryAttribution || { findMany: async () => [] };
    (prisma as any).recoveryAttribution.findMany = jest.fn();
  });

  test('requires admin auth', async () => {
    const { req, res } = createMocks({ method: 'GET' });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(401);
  });

  test('returns JSON metrics when auth', async () => {
    const now = new Date('2025-08-01T00:00:00Z');
    const rows = [
      { id: 'r1', amountRecovered: 1500, createdAt: new Date('2025-07-31T00:00:00Z') },
      { id: 'r2', amountRecovered: 3500, createdAt: new Date('2025-08-01T00:00:00Z') },
    ];
    (prisma as any).recoveryAttribution.findMany.mockResolvedValue(rows);
    const token = 'dummy';
    const { req, res } = createMocks({ method: 'GET', query: { start: '2025-07-30', end: '2025-08-02' }, headers: { cookie: `admin_token=${token}` } });
    const adminAuth = require('../lib/adminAuth');
    jest.spyOn(adminAuth, 'checkAdminAuth').mockImplementation(() => true);

    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.recoveredRevenue).toBe(5000);
    expect(body.count).toBe(2);
    expect(body.perBucket).toBeDefined();
  });

  test('HEAD and CSV support when auth', async () => {
    const rows = [{ id: 'r3', amountRecovered: 2000, createdAt: new Date('2025-08-01T00:00:00Z') }];
    (prisma as any).recoveryAttribution.findMany.mockResolvedValue(rows);
    const token = 'dummy';
    const adminAuth = require('../lib/adminAuth');
    jest.spyOn(adminAuth, 'checkAdminAuth').mockImplementation(() => true);

    const { req, res } = createMocks({ method: 'HEAD', query: { format: 'csv' }, headers: { cookie: `admin_token=${token}` } });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    expect(res._getData()).toBe('');

    const { req: req2, res: res2 } = createMocks({ method: 'GET', query: { format: 'csv' }, headers: { cookie: `admin_token=${token}` } });
    await handler(req2 as any, res2 as any);
    expect(res2._getStatusCode()).toBe(200);
    expect(res2._getHeaders()['content-type']).toMatch(/csv/);
    const csv = res2._getData();
    expect(csv).toContain('bucket');
  });
});
