const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding demo data...')

  // Settings (singleton)
  await prisma.settings.upsert({
    where: { id: 1 },
    update: { safeMode: true },
    create: { id: 1, dunningBaseHours: 24, dunningMaxAttempts: 4, safeMode: true },
  })

  // Users and subscriptions
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      stripeCustomerId: 'cus_demo_alice',
      subscriptions: {
        create: [{ stripeSubscriptionId: 'sub_demo_alice_1', status: 'active' }],
      },
    },
  })

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      stripeCustomerId: 'cus_demo_bob',
      subscriptions: {
        create: [{ stripeSubscriptionId: 'sub_demo_bob_1', status: 'past_due' }],
      },
    },
  })

  // Dunning case for Bob (failed invoice) - idempotent upsert
  const dunning = await prisma.dunningCase.upsert({
    where: { stripeInvoiceId: 'in_demo_bob_1' },
    update: {},
    create: {
      stripeInvoiceId: 'in_demo_bob_1',
      stripeCustomerId: 'cus_demo_bob',
      amountDue: 499,
      currency: 'usd',
      status: 'open',
      retryAttempts: {
        create: [
          { attemptNo: 1, runAt: new Date(Date.now() - 1000 * 60 * 60 * 24), status: 'failed', note: 'Card declined' },
        ],
      },
      reminders: {
        create: [{ channel: 'email' }],
      },
    },
  })

  // Recovery attribution (dry-run example)
  const existingRecovery = await prisma.recoveryAttribution.findFirst({ where: { stripeInvoiceId: 'in_demo_alice_1' } });
  if (!existingRecovery) {
    await prisma.recoveryAttribution.create({
      data: {
        stripeCustomerId: 'cus_demo_alice',
        stripeInvoiceId: 'in_demo_alice_1',
        amountRecovered: 999,
        currency: 'usd',
        source: 'manual-backfill',
      },
    });
  }

  // Audit logs
  await prisma.auditLog.createMany({
    data: [
      { actor: 'system', action: 'seed:created', details: 'Created demo users and dunning case' },
    ],
  })

  // CSP reports sample
  const existingCsp = await prisma.cspReport.findFirst({ where: { doc: 'example.html' } });
  if (!existingCsp) {
    await prisma.cspReport.create({ data: { violated: "img-src 'self'", doc: 'example.html', raw: '{}' } });
  }

  console.log('Seeding complete.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
