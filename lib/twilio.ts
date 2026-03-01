import Twilio from "twilio";
import { validateRequest } from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID ?? "";
const authToken = process.env.TWILIO_AUTH_TOKEN ?? "";
export const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER ?? "";

// Only instantiate if credentials are present — avoids errors in dev/test
const client = accountSid && authToken ? new Twilio(accountSid, authToken) : null;

/**
 * Send an SMS message via Twilio.
 *
 * Silently no-ops if Twilio env vars are not configured.
 * Never throws — SMS failures are logged but never crash the caller.
 * This lets SMS be sprinkled into automation flows without adding fragility.
 */
export async function sendSms(to: string, body: string): Promise<void> {
  if (!client || !twilioPhoneNumber) {
    console.warn("[twilio] Not configured — skipped SMS to", to);
    return;
  }
  try {
    await client.messages.create({ to, from: twilioPhoneNumber, body });
    console.log("[twilio] SMS sent to", to);
  } catch (err) {
    console.error("[twilio] Failed to send SMS to", to, ":", err);
  }
}

/**
 * Validate an incoming Twilio webhook POST request.
 *
 * If TWILIO_AUTH_TOKEN is not set (e.g. local dev), validation is skipped
 * and the function returns true. In production the token is always present.
 */
export function validateTwilioRequest(
  signature: string,
  url: string,
  params: Record<string, string>
): boolean {
  if (!authToken) return true; // dev: skip validation
  return validateRequest(authToken, signature, url, params);
}
