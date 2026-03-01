import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateTwilioRequest } from "@/lib/twilio";
import { sendEmail, extractSmtpConfig } from "@/lib/automations/lead-reply/tools";

export const dynamic = "force-dynamic";

/**
 * POST /api/webhooks/twilio
 *
 * Handles inbound SMS messages from Twilio. Lets clients approve or discard
 * pending automation drafts by replying to an SMS notification.
 *
 * Supported replies (case-insensitive):
 *   OK / yes / send / approve / y  → approve the most recent pending draft
 *   SKIP / no / discard / cancel / n → discard the most recent pending draft
 *
 * Approval flow replicates what PATCH /api/automations/drafts/[runId] does —
 * sends the email, updates run status, increments counter, logs conversation.
 *
 * The client's phone number is stored in automations.config.notify_phone.
 * We find the right automation by matching config->>'notify_phone' to the
 * From number (Twilio always sends E.164 format, e.g. +4512345678).
 */
export async function POST(req: NextRequest) {
  // Twilio sends application/x-www-form-urlencoded
  const text = await req.text();
  const params: Record<string, string> = {};
  new URLSearchParams(text).forEach((v, k) => {
    params[k] = v;
  });

  const fromPhone = params.From ?? "";
  const msgBody = (params.Body ?? "").trim().toLowerCase();
  const signature = req.headers.get("X-Twilio-Signature") ?? "";

  // Validate that this is a genuine Twilio request
  if (!validateTwilioRequest(signature, req.url, params)) {
    return new Response("Forbidden", { status: 403 });
  }

  const isApprove = ["ok", "yes", "send", "approve", "y", "1"].includes(msgBody);
  const isDiscard = ["skip", "no", "discard", "cancel", "n", "0"].includes(msgBody);

  if (!isApprove && !isDiscard) {
    return twiml("Reply OK to approve the pending draft, or SKIP to discard it.");
  }

  const supabase = createAdminClient();

  // Find automation(s) configured with this notify_phone
  const { data: matchingAutomations } = await supabase
    .from("automations")
    .select("id, automation_key, config, client_id")
    .contains("config", { notify_phone: fromPhone });

  if (!matchingAutomations?.length) {
    return twiml("No automation found for this number.");
  }

  // Find the most recent pending_approval run for any of those automations
  const { data: run } = await supabase
    .from("automation_runs")
    .select("id, payload, draft_content, automation_id, client_id, clients(email_account)")
    .in("automation_id", matchingAutomations.map((a) => a.id))
    .eq("status", "pending_approval")
    .order("ran_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!run) {
    return twiml("No pending draft found — nothing to approve.");
  }

  if (isDiscard) {
    await supabase
      .from("automation_runs")
      .update({ status: "discarded" })
      .eq("id", run.id);
    return twiml("Draft discarded. \u2713");
  }

  // ── Approve: send the email ───────────────────────────────────────────
  const automation = matchingAutomations.find((a) => a.id === run.automation_id)!;
  const cfg = (automation.config ?? {}) as Record<string, unknown>;
  const payload = (run.payload ?? {}) as Record<string, unknown>;
  const clientEmailAccount =
    (run.clients as { email_account?: Record<string, unknown> | null } | null)
      ?.email_account ?? null;

  const finalContent = (run.draft_content ?? "").trim();
  if (!finalContent) {
    return twiml("Error: draft content is empty.");
  }

  const toEmail = payload.from_email as string | undefined;
  if (!toEmail) {
    return twiml("Error: no recipient address in draft.");
  }

  if (automation.automation_key !== "lead_reply") {
    return twiml(`SMS approval is not yet supported for ${automation.automation_key} automation.`);
  }

  const smtp = extractSmtpConfig(clientEmailAccount ?? cfg);
  const fromEmail = smtp?.user ?? (cfg.from_email as string) ?? "";
  const subject = payload.subject as string | undefined;

  const sendResult = await sendEmail(
    {
      to: toEmail,
      subject: subject ? `Re: ${subject}` : "Thanks for reaching out",
      body: finalContent,
      fromName: (cfg.from_name as string) ?? (cfg.owner_name as string) ?? "",
      fromEmail,
    },
    smtp
  );

  if (!sendResult.success) {
    return twiml(`Send failed: ${sendResult.error}`);
  }

  // Mark approved + increment counter
  await supabase
    .from("automation_runs")
    .update({ status: "approved", output_summary: "Approved via SMS" })
    .eq("id", run.id);

  await supabase.rpc("increment_automation_counter", {
    p_automation_id: automation.id,
    p_increment: 1,
  });

  // Mark lead as replied
  const leadId = payload.lead_id as string | null;
  if (leadId) {
    await supabase
      .from("leads")
      .update({ replied_at: new Date().toISOString() })
      .eq("id", leadId);
  }

  // Log outbound conversation for voice training corpus
  await supabase.from("lead_conversations").insert({
    client_id: run.client_id,
    lead_id: leadId ?? null,
    automation_run_id: run.id,
    direction: "outbound",
    from_email: fromEmail,
    to_email: toEmail,
    subject: subject ? `Re: ${subject}` : "Thanks for reaching out",
    content: finalContent,
    was_ai_generated: true,
    was_edited: false, // SMS approval = no content changes
    sent_at: new Date().toISOString(),
  });

  return twiml("Sent \u2713");
}

function twiml(message: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${message}</Message></Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}
