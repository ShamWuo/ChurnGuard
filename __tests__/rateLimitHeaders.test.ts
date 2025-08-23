import { createMocks } from 'node-mocks-http';
import handler from '../pages/api/checkout/create-session';

describe('rate limit headers', () => {
  const OLD = process.env;
  beforeEach(() => { process.env = { ...OLD, STRIPE_PRICE_ID: 'price_test' }; });
  afterEach(() => { process.env = OLD; });

  it('sets rate limit headers on 429', async () => {
    // exhaust tokens quickly
    for (let i = 0; i < 12; i++) {
      const { req, res } = createMocks({ method: 'POST', headers: { 'x-forwarded-for': '1.1.1.1' } });
      await handler(req as any, res as any);
      if (res._getStatusCode() === 429) {
        const h = res._getHeaders();
        expect(h['ratelimit-limit']).toBeDefined();
        expect(h['ratelimit-remaining']).toBeDefined();
        expect(h['ratelimit-reset']).toBeDefined();
        return;
      }
    }
    throw new Error('Did not hit 429');
  });
});
