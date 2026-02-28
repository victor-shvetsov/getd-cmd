import { Resend } from "resend";

export interface SendReviewRequestParams {
  to: string;
  customerName: string;
  message: string;
  fromName: string;
  fromEmail: string;
}

/**
 * Send a review request email via Resend.
 * Requires RESEND_API_KEY env var.
 * The fromEmail domain must be verified in your Resend account.
 */
export async function sendReviewRequest(
  params: SendReviewRequestParams
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { success: false, error: "RESEND_API_KEY is not set" };
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: `${params.fromName} <${params.fromEmail}>`,
    to: params.to,
    subject: `A quick favour, ${params.customerName}`,
    text: params.message,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
