import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/analytics/metrics';

describe('analytics metrics', () => {
  it('returns bucketed metrics', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { bucket: 'day' } });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    const j = JSON.parse(res._getData());
    expect(j).toHaveProperty('recoveredRevenue');
    expect(j).toHaveProperty('count');
    expect(j).toHaveProperty('perBucket');
    expect(j).toHaveProperty('bucket', 'day');
  });

  it('can return CSV', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { bucket: 'day', format: 'csv' } });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    const text = res._getData() as string;
    expect(text.split('\n')[0]).toContain('bucket,amount_cents');
  });
});
