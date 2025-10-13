import nodemailer from "nodemailer";
import { htmlToText } from "html-to-text";
import { ServerClient as PostmarkClient } from "postmark";

export type MailParams = {
  to: string;
  subject: string;
  html: string;
  from?: string;
};

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT) : 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}


export async function sendMail(params: MailParams) {
  const from = params.from || process.env.EMAIL_FROM || "no-reply@example.com";
  const transport = getTransport();

  const text = htmlToText(params.html, { wordwrap: 130 });

  if (!transport) {
    
    const postmarkToken = process.env.POSTMARK_SERVER_TOKEN;
    if (postmarkToken) {
      try {
        const client = new PostmarkClient(postmarkToken);
        const res = await client.sendEmail({
          From: from,
          To: params.to,
          Subject: params.subject,
          HtmlBody: params.html,
          TextBody: text,
        } as any);
        return { messageId: res.MessageID } as any;
      } catch (err: any) {
        console.error("postmark send error", err);
        
      }
    }

  
    console.warn("SMTP/Postmark not configured or failed; printing email to console.");
    console.info({ from, to: params.to, subject: params.subject, text });
    return { mocked: true } as any;
  }

  try {
    const info = await transport.sendMail({
      from,
      to: params.to,
      subject: params.subject,
      text,
      html: params.html,
    });
    return { messageId: info.messageId };
  } catch (err: any) {
    console.error("sendMail error", err);
    
    throw new Error(`Failed to send email: ${err?.message || err}`);
  }
}

export function isSmtpConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}
