import { PrismaClient } from '@prisma/client';
import { DunningStatus, RetryAttemptStatus, DunningChannel, RecoverySource, SubscriptionStatus } from './enums';

export async function seedDemo(prisma = new PrismaClient()) {
  await prisma.settings.upsert({
    where: { id: 1 },
    update: { dunningBaseHours: 24, dunningMaxAttempts: 4 },
    create: { id: 1, dunningBaseHours: 24, dunningMaxAttempts: 4, safeMode: true },
  });

  
  await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      stripeCustomerId: 'cus_demo_alice',
  subscriptions: { create: [{ stripeSubscriptionId: 'sub_demo_alice_1', status: SubscriptionStatus.active }] },
    },
  });

  await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      stripeCustomerId: 'cus_demo_bob',
  subscriptions: { create: [{ stripeSubscriptionId: 'sub_demo_bob_1', status: SubscriptionStatus.past_due }] },
    },
  });

  
  await prisma.dunningCase.upsert({
    where: { stripeInvoiceId: 'in_demo_bob_1' },
    update: {},
    create: {
      stripeInvoiceId: 'in_demo_bob_1',
      stripeCustomerId: 'cus_demo_bob',
      amountDue: 499,
      currency: 'usd',
  status: DunningStatus.failed,
  retryAttempts: { create: [{ attemptNo: 1, runAt: new Date(Date.now() - 86_400_000), status: RetryAttemptStatus.error, note: 'Card declined' }] },
  reminders: { create: [{ channel: DunningChannel.email }] },
    },
  });
  
  const existingRecovery = await prisma.recoveryAttribution.findFirst({ where: { stripeInvoiceId: 'in_demo_alice_1' } });
  if (!existingRecovery) {
    await prisma.recoveryAttribution.create({
      data: {
        stripeCustomerId: 'cus_demo_alice',
        stripeInvoiceId: 'in_demo_alice_1',
        amountRecovered: 999,
        currency: 'usd',
  source: RecoverySource.manual,
      },
    });
  }
  
  await prisma.auditLog.create({ data: { actor: 'system', action: 'seed:created', details: 'Created demo users and dunning case' } });
  
  const existingCsp = await prisma.cspReport.findFirst({ where: { doc: 'example.html' } });
  if (!existingCsp) {
    await prisma.cspReport.create({ data: { violated: "img-src 'self'", doc: 'example.html', raw: '{}' } });
  }
}
