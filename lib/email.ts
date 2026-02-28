import { Resend } from "resend";

/**
 * System notification email utility.
 * Fails silently (logs error) — notification delivery is best-effort.
 * Requires RESEND_API_KEY env var; no-ops if missing.
 */
export async function sendSystemEmail(params: {
  to: string;
  subject: string;
  text: string;
  fromEmail: string;
  fromName?: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping notification");
    return;
  }

  const resend = new Resend(apiKey);
  const from = params.fromName
    ? `${params.fromName} <${params.fromEmail}>`
    : params.fromEmail;

  const { error } = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
  });

  if (error) {
    console.error("[email] Notification delivery failed:", error.message);
  }
}
