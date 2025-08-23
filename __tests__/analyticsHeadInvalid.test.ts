import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/analytics/metrics';

describe('analytics HEAD and invalid range', () => {
  it('HEAD returns 200 with headers', async () => {
    const { req, res } = createMocks({ method: 'HEAD', query: { bucket: 'day' } });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(200);
    const h = res._getHeaders();
    expect(h['etag']).toBeDefined();
    expect(h['cache-control']).toBeDefined();
  });

  it('returns 400 for invalid range', async () => {
    const { req, res } = createMocks({ method: 'GET', query: { start: '2025-01-02T00:00:00Z', end: '2025-01-01T00:00:00Z' } });
    await handler(req as any, res as any);
    expect(res._getStatusCode()).toBe(400);
  });
});
