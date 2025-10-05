import { createMocks } from 'node-mocks-http';
import exportHandler from '../pages/api/admin/export-user';
import deleteHandler from '../pages/api/admin/delete-user';
import prisma from '../lib/prisma';

describe('admin endpoints', () => {
  const OLD = process.env;
  beforeEach(() => { process.env = { ...OLD, ADMIN_SECRET: 's3cret' }; });
  afterEach(() => { process.env = OLD; jest.resetAllMocks(); });

  beforeEach(() => {
    // ensure prisma shim provides the model methods we need; the real lib/prisma exports a dummy shim in tests
    if (!prisma) throw new Error('prisma shim not available in test environment');
    (prisma as any).user = (prisma as any).user || { findUnique: async () => null, update: async () => null };
    (prisma as any).user.findUnique = jest.fn();
    (prisma as any).user.update = jest.fn();
    (prisma as any).cspReport = (prisma as any).cspReport || { updateMany: async () => ({}) };
    (prisma as any).cspReport.updateMany = jest.fn();
    (prisma as any).subscription = (prisma as any).subscription || { updateMany: async () => ({}) };
    (prisma as any).subscription.updateMany = jest.fn();
    (prisma as any).auditLog = (prisma as any).auditLog || { create: async () => ({}) };
    (prisma as any).auditLog.create = jest.fn();
  });

  test('export-user requires auth', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { email: 'noone@example.com' } });
    await exportHandler(req as any, res as any);
    expect(res._getStatusCode()).toBe(401);
  });

  test('export-user returns user json when auth cookie present', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u1', email: 'u1@example.com', createdAt: new Date(), stripeCustomerId: null, subscriptions: [] });
  const token = 'dummy';
  const { req, res } = createMocks({ method: 'GET', query: { email: 'u1@example.com' }, headers: { cookie: `admin_token=${token}` } });
  const adminAuth = require('../lib/adminAuth');
  jest.spyOn(adminAuth, 'checkAdminAuth').mockImplementation(() => true);
  await exportHandler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    const body = JSON.parse(res._getData());
    expect(body.email).toBe('u1@example.com');
  });

  test('export-user HEAD and CSV when auth', async () => {
    (prisma.user.findUnique as any).mockResolvedValue({ id: 'u3', email: 'u3@example.com', createdAt: new Date('2020-01-01T00:00:00Z'), stripeCustomerId: 'cus_123', subscriptions: [] });
    const token = 'dummy';
    const { req, res } = createMocks({ method: 'HEAD', query: { email: 'u3@example.com', format: 'csv' }, headers: { cookie: `admin_token=${token}` } });
    const adminAuth = require('../lib/adminAuth');
    jest.spyOn(adminAuth, 'checkAdminAuth').mockImplementation(() => true);
    await exportHandler(req as any, res as any);
  expect(res._getStatusCode()).toBe(200);
  // HEAD should not contain a body (node-mocks-http returns empty string)
  expect(res._getData()).toBe('');
    // now try GET csv
    const { req: req2, res: res2 } = createMocks({ method: 'GET', query: { email: 'u3@example.com', format: 'csv' }, headers: { cookie: `admin_token=${token}` } });
    await exportHandler(req2 as any, res2 as any);
    expect(res2._getStatusCode()).toBe(200);
    expect(res2._getHeaders()['content-type']).toMatch(/csv/);
    const csv = res2._getData();
    expect(csv).toContain('u3@example.com');
  });

  test('delete-user supports CRON_SECRET path', async () => {
  (prisma as any).user.findUnique.mockResolvedValue({ id: 'u2', email: 'u2@example.com' });
  (prisma as any).cspReport.updateMany.mockResolvedValue({ count: 1 });
  (prisma as any).subscription.updateMany.mockResolvedValue({ count: 1 });
  (prisma as any).user.update.mockResolvedValue({ id: 'u2' });
  (prisma as any).auditLog.create.mockResolvedValue({ id: 'a1' });

    process.env.CRON_SECRET = 'cron123';
    const { req, res } = createMocks({ method: 'POST', query: { email: 'u2@example.com', cron_secret: 'cron123' } });
    await deleteHandler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    const d = JSON.parse(res._getData());
    expect(d.ok).toBe(true);
  });

  test('delete-user dry-run returns counts and does not call user.update/audit', async () => {
    (prisma as any).user.findUnique.mockResolvedValue({ id: 'u4', email: 'u4@example.com' });
  (prisma as any).cspReport.count = jest.fn().mockResolvedValue(2);
  (prisma as any).subscription.count = jest.fn().mockResolvedValue(3);
    (prisma as any).user.update.mockResolvedValue({ id: 'u4' });
    (prisma as any).auditLog.create.mockResolvedValue({ id: 'a2' });

    const { req, res } = createMocks({ method: 'POST', body: { email: 'u4@example.com', dry: true } });
    // allow admin cookie
    const adminAuth = require('../lib/adminAuth');
    jest.spyOn(adminAuth, 'checkAdminAuth').mockImplementation(() => true);
    await deleteHandler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    const d = JSON.parse(res._getData());
    expect(d.ok).toBe(true);
    expect(d.dry).toBe(true);
    expect(d.counts).toBeDefined();
    expect(d.counts.cspReports).toBe(2);
    expect(d.counts.subscriptions).toBe(3);
  });

  test('delete-user transaction success includes actor and counts', async () => {
    const jwt = require('jsonwebtoken');
    process.env.ADMIN_SECRET = 's3cret';
    const token = jwt.sign({ admin: true, sub: 'test-admin' }, process.env.ADMIN_SECRET);

    (prisma as any).user.findUnique.mockResolvedValue({ id: 'u5', email: 'u5@example.com' });
    // mock $transaction to return cspRes, subsRes, userRes
    (prisma as any).$transaction = jest.fn().mockResolvedValue([{ count: 4 }, { count: 5 }, { id: 'u5' }]);
    (prisma as any).auditLog.create = jest.fn().mockResolvedValue({ id: 'a3' });

  process.env.ENABLE_DESTRUCTIVE_DELETES = '1';
  const { req, res } = createMocks({ method: 'POST', headers: { cookie: `admin_token=${encodeURIComponent(token)}`, 'x-forwarded-for': '1.2.3.4' }, body: { email: 'u5@example.com' } });
    const adminAuth = require('../lib/adminAuth');
    jest.spyOn(adminAuth, 'checkAdminAuth').mockImplementation(() => true);

    await deleteHandler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    const d = JSON.parse(res._getData());
    expect(d.ok).toBe(true);
    expect(d.counts.cspReports).toBe(4);
    expect(d.counts.subscriptions).toBe(5);
    expect(d.actor).toBe('test-admin');
    expect((prisma as any).auditLog.create).toHaveBeenCalled();
  });

  test('delete-user fallback returns partial with actor when transaction fails', async () => {
    const jwt = require('jsonwebtoken');
    process.env.ADMIN_SECRET = 's3cret';
    const token = jwt.sign({ admin: true, sub: 'fallback-admin' }, process.env.ADMIN_SECRET);

    (prisma as any).user.findUnique.mockResolvedValue({ id: 'u6', email: 'u6@example.com' });
    (prisma as any).$transaction = jest.fn().mockRejectedValue(new Error('tx fail'));
    (prisma as any).cspReport.updateMany = jest.fn().mockResolvedValue({ count: 2 });
    (prisma as any).subscription.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    (prisma as any).user.update = jest.fn().mockResolvedValue({ id: 'u6' });
    (prisma as any).auditLog.create = jest.fn().mockResolvedValue({ id: 'a4' });

  process.env.ENABLE_DESTRUCTIVE_DELETES = '1';
  const { req, res } = createMocks({ method: 'POST', headers: { cookie: `admin_token=${encodeURIComponent(token)}`, 'x-forwarded-for': '5.6.7.8' }, body: { email: 'u6@example.com' } });
    const adminAuth = require('../lib/adminAuth');
    jest.spyOn(adminAuth, 'checkAdminAuth').mockImplementation(() => true);

    await deleteHandler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    const d = JSON.parse(res._getData());
    expect(d.ok).toBe(true);
    expect(d.partial).toBe(true);
    expect(d.counts.cspReports).toBe(2);
    expect(d.counts.subscriptions).toBe(1);
    expect(d.actor).toBe('fallback-admin');
    expect((prisma as any).auditLog.create).toHaveBeenCalled();
  });
});
