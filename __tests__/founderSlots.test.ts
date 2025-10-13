import markFounder from '../pages/api/admin/mark-founder';
import founderSlots from '../pages/api/promo/founder-slots';

// Simple mock for Next.js req/res objects
function mockReq(body?: any, headers?: any) {
  return { method: 'POST', body, headers } as any;
}
function mockRes() {
  const res: any = {};
  res.status = (s: number) => { res._status = s; return res; };
  res.json = (d: any) => { res._json = d; return res; };
  res.end = (d?: any) => { res._end = d; return res; };
  return res;
}

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    auditLog: { create: jest.fn(), count: jest.fn(() => 0) }
  }
}));

test('mark-founder creates audit and founder-slots reports usage', async () => {
  const prisma = require('../lib/prisma').default;
  prisma.auditLog.create.mockImplementation(async () => ({ id: 1 }));
  prisma.auditLog.count.mockImplementation(async () => 1);

  const req = mockReq({ invoiceId: 'inv_test', customerId: 'cus_test' });
  const res = mockRes();
  await markFounder(req, res);
  expect(res._json && res._json.ok).toBe(true);

  // now query founder-slots
  const res2 = mockRes();
  await founderSlots({} as any, res2 as any);
  expect(res2._json).toEqual({ total: 50, used: 1, remaining: 49 });
});
