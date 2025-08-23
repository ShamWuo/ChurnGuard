import handler from '../pages/api/checkout/create-session';
import { createMocks } from 'node-mocks-http';

jest.mock('../lib/stripe', () => ({
  __esModule: true,
  stripe: { checkout: { sessions: { create: jest.fn(() => ({ url: 'https://checkout.test' })) } } }
}));

test('create-session returns url', async () => {
  const { req, res } = createMocks({ method: 'POST', body: { priceId: 'price_test' } });
  await handler(req as any, res as any);
  expect(res._getStatusCode()).toBe(200);
  const data = JSON.parse(res._getData());
  expect(data.url).toBe('https://checkout.test');
});
