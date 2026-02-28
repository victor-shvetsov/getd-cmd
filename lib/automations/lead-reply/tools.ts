import nodemailer from "nodemailer";

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
  fromName: string;
  fromEmail: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send a plain-text reply email.
 * If smtp config is provided, uses the client's own SMTP server (sends from their real address).
 * Falls back to Brevo API for system/agency emails.
 */
export async function sendEmail(
  params: SendEmailParams,
  smtp?: SmtpConfig
): Promise<SendEmailResult> {
  if (smtp) {
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.port === 465, // SSL for 465, STARTTLS for 587
      auth: { user: smtp.user, pass: smtp.pass },
    });

    try {
      const info = await transporter.sendMail({
        from: `${params.fromName} <${params.fromEmail}>`,
        to: params.to,
        subject: params.subject,
        text: params.body,
      });
      return { success: true, messageId: info.messageId };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  // Fall back to Brevo API
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return { success: false, error: "No SMTP config provided and BREVO_API_KEY is not set" };
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: params.fromName, email: params.fromEmail },
      to: [{ email: params.to }],
      subject: params.subject,
      textContent: params.body,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText })) as { message?: string };
    return { success: false, error: err.message ?? res.statusText };
  }

  const data = await res.json() as { messageId?: string };
  return { success: true, messageId: data.messageId };
}

/**
 * Extract SMTP config from automation config JSONB.
 * Returns undefined if smtp_host / email_user / email_pass are not set.
 */
export function extractSmtpConfig(config: Record<string, unknown>): SmtpConfig | undefined {
  if (!config.smtp_host || !config.email_user || !config.email_pass) return undefined;
  return {
    host: config.smtp_host as string,
    port: (config.smtp_port as number) ?? 465,
    user: config.email_user as string,
    pass: config.email_pass as string,
  };
}
