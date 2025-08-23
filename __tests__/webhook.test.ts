import { handleStripeEvent } from '../pages/api/stripe/webhook';

// Mock prisma and stripe and email
jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    stripeEventLog: { create: jest.fn() },
    dunningCase: { findUnique: jest.fn(() => null), create: jest.fn(() => ({})), updateMany: jest.fn() },
    user: { findFirst: jest.fn(() => ({ email: 'user@example.com' })) },
  }
}));

jest.mock('../lib/email', () => ({
  sendMail: jest.fn(() => Promise.resolve({ mocked: true }))
}));

jest.mock('../lib/stripe', () => ({
  __esModule: true,
  stripe: {
    billingPortal: { sessions: { create: jest.fn(() => ({ url: 'https://portal.test' })) } }
  }
}));

import Stripe from 'stripe';

test('handleStripeEvent sends email on invoice.payment_failed', async () => {
  const event = {
    type: 'invoice.payment_failed',
    data: { object: { id: 'inv_1', customer: 'cus_test', amount_due: 1234, currency: 'usd' } }
  } as unknown as Stripe.Event;

  await handleStripeEvent(event);

  const { sendMail } = require('../lib/email');
  expect(sendMail).toHaveBeenCalled();
});
