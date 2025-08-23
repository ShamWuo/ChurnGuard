import { failedPaymentEmail, reminderEmail } from '../lib/emailTemplates';

test('failedPaymentEmail renders with portal link', () => {
  const out = failedPaymentEmail({ invoiceId: 'inv_123', amount: 2500, currency: 'USD', billingPortalUrl: 'https://portal.test' });
  expect(out.subject).toMatch(/25.00/);
  expect(out.html).toContain('portal.test');
});

test('reminderEmail renders attempt no', () => {
  const out = reminderEmail({ invoiceId: 'inv_1', attemptNo: 2, amount: 1000, currency: 'USD', billingPortalUrl: 'https://portal.test' });
  expect(out.html).toContain('Attempt: 2');
});
