import type { NextApiRequest, NextApiResponse } from 'next';
import getRawBody from 'raw-body';
import type Stripe from 'stripe';
import { stripe } from '../../../lib/stripe';
import { sendMail } from '../../../lib/email';
import { failedPaymentEmail } from '../../../lib/emailTemplates';
import prisma from '../../../lib/prisma';
import { DunningStatus, RecoverySource } from '../../../lib/enums';
import { rateLimit } from '../../../lib/rateLimit';
import { captureError, withSentryTracing } from '../../../lib/sentry';
import { withLogging } from '../../../lib/logger';

const pdb: any = prisma;

export const config = { api: { bodyParser: false } };

export async function handleStripeEvent(event: Stripe.Event) {
	let seen = false;
	try {
		if (pdb?.stripeEventLog && typeof pdb.stripeEventLog.findFirst === 'function') {
			const existing = await pdb.stripeEventLog.findFirst({ where: { eventId: event.id } });
			seen = !!existing;
		}
	} catch {}
	if (!seen) {
		try {
			await pdb.stripeEventLog.create({ data: { type: event.type, raw: JSON.stringify(event), eventId: event.id } });
		} catch {
			try { await pdb.stripeEventLog.create({ data: { type: event.type, raw: JSON.stringify(event) } }); } catch {}
		}
	}

	switch (event.type) {
		case 'invoice.payment_failed': {
			const invoice = event.data.object as Stripe.Invoice;
			return ensureDunningCase(invoice);
		}
		case 'customer.subscription.updated':
		case 'customer.subscription.created':
		case 'customer.subscription.deleted': {
			const sub = event.data.object as Stripe.Subscription;
			return upsertSubscriptionFromStripe(sub);
		}
		case 'invoice.payment_succeeded': {
			const invoice = event.data.object as Stripe.Invoice;
			const stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
			if (stripeCustomerId) {
				await pdb.recoveryAttribution.create({ data: { stripeCustomerId, stripeInvoiceId: invoice.id, amountRecovered: invoice.amount_paid || 0, currency: (invoice.currency || 'usd').toUpperCase(), source: RecoverySource.retry } });
				await pdb.dunningCase.updateMany({ where: { stripeInvoiceId: invoice.id }, data: { status: DunningStatus.recovered } });
				// Write an audit entry so recovered revenue and founder-slot counting can rely on a canonical log
				try {
					await pdb.auditLog.create({ data: { actor: 'system', action: 'billing:purchase', details: JSON.stringify({ invoiceId: invoice.id, customerId: stripeCustomerId, amount: invoice.amount_paid || 0, currency: (invoice.currency || 'usd').toUpperCase() }) } });
				} catch (e) { console.warn('failed to write billing:purchase audit', e); }
			}
			return;
		}
		default:
			return;
	}
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
	const rl = rateLimit('webhook', 300, 60_000);
	if (!rl.ok) {
		res.setHeader('RateLimit-Limit', String(rl.limit));
		res.setHeader('RateLimit-Remaining', String(rl.remaining));
		res.setHeader('RateLimit-Reset', String(Math.floor(rl.resetAt / 1000)));
		return res.status(429).send('Rate limit');
	}
	if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

	const sig = req.headers['stripe-signature'] as string | undefined;
	const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
	let event: any;
	try {
		const buf = await getRawBody(req as any);
		if (!webhookSecret) {
			event = JSON.parse(buf.toString());
		} else {
			event = (stripe as any).webhooks.constructEvent(buf, sig || '', webhookSecret);
		}
	} catch (err: any) {
		return res.status(400).send(`Webhook Error: ${err.message}`);
	}

	try {
		await handleStripeEvent(event);
	} catch (e) {
		console.error(e);
		try { captureError(e); } catch {}
	}

	res.json({ received: true });
}

export default withSentryTracing(withLogging(handler));

async function upsertSubscriptionFromStripe(sub: Stripe.Subscription) {
	const customerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as any).id;
	let user = await pdb.user.findFirst({ where: { stripeCustomerId: customerId } });
	if (!user) {
		user = await pdb.user.create({ data: { email: `${customerId}@placeholder.local`, stripeCustomerId: customerId } });
	}
	await pdb.subscription.upsert({ where: { stripeSubscriptionId: sub.id }, update: { status: sub.status, currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null, cancelAtPeriodEnd: !!sub.cancel_at_period_end, userId: user.id }, create: { stripeSubscriptionId: sub.id, status: sub.status, currentPeriodEnd: sub.current_period_end ? new Date(sub.current_period_end * 1000) : null, cancelAtPeriodEnd: !!sub.cancel_at_period_end, userId: user.id } });
}

async function ensureDunningCase(invoice: Stripe.Invoice) {
	const stripeInvoiceId = invoice.id;
	const stripeCustomerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id;
	if (!stripeCustomerId) return;
	const amountDue = invoice.amount_due || 0;
	const currency = invoice.currency?.toUpperCase() || 'USD';
	const existing = await pdb.dunningCase.findUnique({ where: { stripeInvoiceId } });
	if (existing) return existing;
	const created = await pdb.dunningCase.create({ data: { stripeInvoiceId, stripeCustomerId, amountDue, currency, status: DunningStatus.failed } });

	try {
		const user = await pdb.user.findFirst({ where: { stripeCustomerId } });
		let emailTo = user?.email;
		if (!emailTo && (invoice as any).customer_email) emailTo = (invoice as any).customer_email;
		let portalUrl: string | undefined;
		try {
			const session = await (stripe as any).billingPortal.sessions.create({ customer: stripeCustomerId, return_url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000' });
			portalUrl = session.url;
		} catch (e) {
			console.warn('Failed to create billing portal session', e);
		}
		if (emailTo) {
			const { subject, html } = failedPaymentEmail({ invoiceId: stripeInvoiceId, amount: amountDue, currency, billingPortalUrl: portalUrl });
			await sendMail({ to: emailTo, subject, html });
		} else {
			console.info('No email to notify for customer', stripeCustomerId);
		}
	} catch (err) {
		console.error('Failed to send failed-payment notification', err);
	}

	return created;
}
