import fs from "fs";
import path from "path";
import Handlebars from "handlebars";

function loadTemplate(name: string) {
  const hbs = path.join(process.cwd(), "lib", "templates", `${name}.hbs`);
  const html = path.join(process.cwd(), "lib", "templates", `${name}.html`);
  try {
    return fs.readFileSync(hbs, "utf8");
  } catch (e) {
    try {
      return fs.readFileSync(html, "utf8");
    } catch (e2) {
      console.warn("Template not found:", hbs, html);
      return "";
    }
  }
}

function renderTpl(name: string, vars: Record<string, any>) {
  const tpl = loadTemplate(name);
  if (!tpl) return "";
  // If template contains Handlebars tokens, use Handlebars. Else support simple ${var} placeholders.
  if (tpl.includes("{{") || tpl.includes("}}") ) {
    const compiled = Handlebars.compile(tpl);
    return compiled(vars);
  }
  // Simple ${...} interpolation supporting patterns like ${var} and ${var || 'default'}
  return tpl.replace(/\$\{([^}]+)\}/g, (_: string, expr: string) => {
    const parts = expr.split('||').map((p: string) => p.trim());
    if (parts.length === 1) {
      const k = parts[0];
      return vars[k] !== undefined && vars[k] !== null ? String(vars[k]) : "";
    }
    const varName = parts[0];
    // join the rest as default and strip surrounding quotes if present
    const defaultPart = parts.slice(1).join('||').trim().replace(/^['"]|['"]$/g, '');
    const val = vars[varName];
    if (val !== undefined && val !== null && val !== '') return String(val);
    return defaultPart;
  });
}

export function failedPaymentEmail(params: { invoiceId: string; amount: number; currency: string; billingPortalUrl?: string }) {
  const { invoiceId, amount, currency, billingPortalUrl } = params;
  const amountStr = (amount / 100).toFixed(2) + " " + currency;
  const subject = `Action needed: issue with your payment (${amountStr})`;
  const html = renderTpl("failedPayment", { invoiceId, amountStr, billingPortalUrl });
  return { subject, html };
}

export function reminderEmail(params: { invoiceId: string; attemptNo: number; amount: number; currency: string; billingPortalUrl?: string }) {
  const { invoiceId, attemptNo, amount, currency, billingPortalUrl } = params;
  const amountStr = (amount / 100).toFixed(2) + " " + currency;
  const subject = `Reminder ${attemptNo}: update payment method (${amountStr})`;
  const html = renderTpl("reminder", { invoiceId, attemptNo, amountStr, billingPortalUrl });
  return { subject, html };
}

export function recoveredEmail(params: { amount: number; currency: string }) {
  const { amount, currency } = params;
  const amountStr = (amount / 100).toFixed(2) + " " + currency;
  const subject = `You're all set — payment recovered (${amountStr})`;
  const html = `
  <div style="font-family:system-ui,Segoe UI,Arial,sans-serif;font-size:16px;">
    <h2>Payment successful</h2>
    <p>Thanks! We recovered your recent payment (${amountStr}). No action needed.</p>
  </div>`;
  return { subject, html };
}
