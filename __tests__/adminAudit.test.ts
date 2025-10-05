import { jest } from '@jest/globals';
import { createMocks } from 'node-mocks-http';
import jwt from 'jsonwebtoken';
import deleteHandler from '../pages/api/admin/delete-user';
import prisma from '../lib/prisma';

describe('admin delete audit', () => {
  const OLD = process.env;
  beforeEach(() => { process.env = { ...OLD, ADMIN_SECRET: 's3cret', ENABLE_DESTRUCTIVE_DELETES: '1' }; });
  afterEach(() => { process.env = OLD; jest.resetAllMocks(); });

  test('creates audit log on destructive delete', async () => {
    // Mock prisma methods used by the handler
    const mockAudit = jest.spyOn(prisma.auditLog, 'create').mockResolvedValue({ id: 1 } as any);
  jest.spyOn(prisma.cspReport, 'count').mockResolvedValue(0 as any);
    jest.spyOn(prisma.subscription, 'count').mockResolvedValue(0 as any);
    jest.spyOn(prisma.cspReport, 'updateMany').mockResolvedValue({ count: 0 } as any);
    jest.spyOn(prisma.subscription, 'updateMany').mockResolvedValue({ count: 0 } as any);
    jest.spyOn(prisma.user, 'update').mockResolvedValue({ id: 123 } as any);
  jest.spyOn(prisma.user, 'findUnique').mockResolvedValue({ id: 123, email: 'user@example.com' } as any);

  const token = jwt.sign({ admin: true, sub: 'test-admin' }, process.env.ADMIN_SECRET as string, { expiresIn: '2h' });
  const { req, res } = createMocks({ method: 'POST', body: { email: 'user@example.com', dry: false }, headers: { 'content-type': 'application/json', cookie: `admin_token=${encodeURIComponent(token)}`, 'x-forwarded-for': '127.0.0.1' } });
    // mock jwt verification inside handler by setting ADMIN_SECRET environment and relying on handler extraction
    await deleteHandler(req as any, res as any);

  expect(mockAudit).toHaveBeenCalled();
  const calledWith: any = mockAudit.mock.calls[0][0];
  // prisma.create is often called with { data: { ... } } — accept either shape
  const payload: any = calledWith && calledWith.data ? calledWith.data : calledWith;
  expect(payload).toHaveProperty('action', 'delete_user');
  expect(payload).toHaveProperty('actor');
  expect(payload).toHaveProperty('details');
  });
});
