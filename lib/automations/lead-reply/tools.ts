import { Resend } from "resend";

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
 * Send a plain-text reply email via Resend.
 * Requires RESEND_API_KEY env var.
 * The fromEmail domain must be verified in your Resend account.
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY is not set" };
  }

  const resend = new Resend(apiKey);

  const { data, error } = await resend.emails.send({
    from: `${params.fromName} <${params.fromEmail}>`,
    to: params.to,
    subject: params.subject,
    text: params.body,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, messageId: data?.id };
}
