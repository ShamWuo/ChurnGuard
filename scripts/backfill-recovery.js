#!/usr/bin/env node

const { stripe } = require('../lib/stripe');
const prisma = require('../lib/prisma').default;
const enums = require('../lib/enums');

async function main() {
  const dry = process.env.BACKFILL_DRY_RUN !== 'false';
  const since = process.env.BACKFILL_SINCE ? new Date(process.env.BACKFILL_SINCE).getTime()/1000 : undefined;
  if (!process.env.STRIPE_SECRET_KEY) {
    console.error('STRIPE_SECRET_KEY is required');
    process.exit(1);
  }
  let startingAfter = undefined;
  let created = 0, scanned = 0;
  while (true) {
    const list = await stripe.invoices.list({ limit: 100, starting_after: startingAfter, ...(since ? { created: { gte: since } } : {}) });
    for (const inv of list.data) {
      scanned++;
      if (inv.paid && inv.customer && inv.amount_paid) {
        const stripeCustomerId = typeof inv.customer === 'string' ? inv.customer : inv.customer.id;
        const exists = await prisma.recoveryAttribution.findFirst({ where: { stripeInvoiceId: inv.id } });
        if (!exists && !dry) {
          await prisma.recoveryAttribution.create({ data: { stripeCustomerId, stripeInvoiceId: inv.id, amountRecovered: inv.amount_paid, currency: (inv.currency||'usd').toUpperCase(), source: enums.RecoverySource.backfill } });
          created++;
        }
      }
    }
    if (!list.has_more) break;
    startingAfter = list.data[list.data.length - 1].id;
  }
  console.log(JSON.stringify({ dry, scanned, created }));
}

main().catch((e) => { console.error(e); process.exit(1); });
