import type { NextApiRequest, NextApiResponse } from "next";
import prisma from "../../../lib/prisma";
import { DunningChannel, DunningStatus, RetryAttemptStatus } from '../../../lib/enums';
import { stripe } from "../../../lib/stripe";
import { sendMail } from "../../../lib/email";
import { reminderEmail } from "../../../lib/emailTemplates";
import { sendSlack } from "../../../lib/slack";
import crypto from "crypto";
import { captureError } from "../../../lib/sentry";
import { withLogging } from "../../../lib/logger";
import { withSentryTracing } from "../../../lib/sentry";

export async function processDunning(opts?: { dryRun?: boolean }) {
  const pdb: any = prisma;
  const settings = await pdb.settings.findUnique({ where: { id: 1 } });
  const base = (settings?.dunningBaseHours && Number(settings.dunningBaseHours)) || 24;
  const maxAttempts = (settings?.dunningMaxAttempts && Number(settings.dunningMaxAttempts)) || 5;
  const delays = Array.from({ length: maxAttempts }).map((_, i) => (i === 0 ? 0 : base * Math.pow(2, i - 1)));

  const cases = await pdb.dunningCase.findMany({ where: { status: { in: [DunningStatus.failed, DunningStatus.reminded] } }, take: 50 });
  const metrics: any = (global as any).__dunningMetrics ||= { processed: 0, emailed: 0, slacked: 0, retried: 0 };
  let emailed = 0, slacked = 0, retried = 0;

  for (const c of cases) {
    const existing = await pdb.retryAttempt.findFirst({ where: { dunningCaseId: c.id }, orderBy: { runAt: "desc" } });
    const nextAttemptNo = (existing?.attemptNo || 0) + 1;
    const delayIndex = Math.min(nextAttemptNo - 1, delays.length - 1);
    const nextDelayHours = delays[delayIndex] || base;
    const nextRunAt = new Date(Date.now() + nextDelayHours * 3600 * 1000);
    if (!existing || (existing && existing.runAt < new Date())) {
      await pdb.retryAttempt.create({ data: { dunningCaseId: c.id, attemptNo: nextAttemptNo, runAt: nextRunAt } });
    }

  const subjectHtml = reminderEmail({ invoiceId: c.stripeInvoiceId, attemptNo: (existing?.attemptNo || 0) + 1, amount: c.amountDue, currency: c.currency });
  const envSafe = process.env.SAFE_MODE === 'true';
  const dbSafe = !!settings?.safeMode;
  const safeMode = envSafe || dbSafe;
  if (!opts?.dryRun && !safeMode) {
      await sendMail({ to: process.env.TEST_DUNNING_EMAIL || "owner@example.com", ...subjectHtml });
      await sendSlack(`Invoice ${c.stripeInvoiceId} failed for ${c.stripeCustomerId} (${(c.amountDue / 100).toFixed(2)} ${c.currency})`);
  await pdb.dunningReminder.create({ data: { dunningCaseId: c.id, channel: DunningChannel.email } });
  await pdb.dunningReminder.create({ data: { dunningCaseId: c.id, channel: DunningChannel.slack } });
  await pdb.dunningCase.update({ where: { id: c.id }, data: { lastReminderAt: new Date(), status: DunningStatus.reminded } });
      emailed++;
      slacked++;
    }
  }

  
  const due = await pdb.retryAttempt.findMany({ where: { runAt: { lte: new Date() }, status: RetryAttemptStatus.queued }, take: 50 });
  metrics.processed += cases.length;
  for (const a of due) {
    try {
      const dc = await pdb.dunningCase.findUnique({ where: { id: a.dunningCaseId } });
      if (!dc) continue;
  const envSafe = process.env.SAFE_MODE === 'true';
  const dbSafe = !!settings?.safeMode;
  const safeMode = envSafe || dbSafe;
  if (!opts?.dryRun && !safeMode) {
        await stripe.invoices.pay(dc.stripeInvoiceId, { off_session: true });
  await pdb.retryAttempt.update({ where: { id: a.id }, data: { status: RetryAttemptStatus.attempted } });
      }
      retried++;
      } catch (err: any) {
        await pdb.retryAttempt.update({ where: { id: a.id }, data: { status: RetryAttemptStatus.error, note: err.message?.slice(0, 200) } });
      }
  }

  metrics.emailed += emailed;
  metrics.slacked += slacked;
  metrics.retried += retried;

  return { processed: cases.length, emailed, slacked, retried, metrics };
}

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");
  const ts = req.headers["x-cron-timestamp"] as string | undefined;
  const sig = req.headers["x-cron-signature"] as string | undefined;
  const secret = process.env.CRON_SECRET || "dev-secret";
  if (!ts || !sig) return res.status(401).json({ error: "Missing cron auth headers" });
  const age = Math.abs(Date.now() - parseInt(ts, 10));
  if (Number.isNaN(age) || age > 5 * 60 * 1000) return res.status(401).json({ error: "Stale timestamp" });
  const payload = `${ts}.${req.method || ""}`;
  const h = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (!crypto.timingSafeEqual(Buffer.from(h), Buffer.from(sig))) return res.status(401).json({ error: "Invalid signature" });

  try {
    const result = await processDunning();
    res.json(result);
  } catch (e: any) {
    try { captureError(e); } catch {}
    res.status(500).json({ error: e.message });
  }
}
export default withSentryTracing(withLogging(handler));
