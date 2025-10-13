import { handleStripeEvent } from '../pages/api/stripe/webhook';

jest.mock('../lib/prisma', () => ({
  __esModule: true,
  default: {
    stripeEventLog: { create: jest.fn() },
    recoveryAttribution: { create: jest.fn() },
  dunningCase: { updateMany: jest.fn() },
  auditLog: { create: jest.fn() },
  }
}));

import Stripe from 'stripe';

test('invoice.payment_succeeded records recovery attribution and updates dunningCase', async () => {
  const event = {
    type: 'invoice.payment_succeeded',
    data: { object: { id: 'inv_2', customer: 'cus_2', amount_paid: 5000, currency: 'usd' } }
  } as unknown as Stripe.Event;

  await handleStripeEvent(event);

  const pdb = require('../lib/prisma').default;
  expect(pdb.recoveryAttribution.create).toHaveBeenCalled();
  expect(pdb.dunningCase.updateMany).toHaveBeenCalled();
  expect(pdb.auditLog.create).toHaveBeenCalled();
});
