import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { parseLeadEmail } from "@/lib/automations/lead-reply/parse-email";
import { LeadReplyAutomation } from "@/lib/automations/lead-reply";
import { sendSystemEmail } from "@/lib/email";

const automation = new LeadReplyAutomation();

/**
 * POST /api/webhooks/inbound-lead
 *
 * Receives inbound email webhooks from Resend.
 * Each client has a dedicated address: [slug]@[RESEND_INBOUND_DOMAIN]
 * e.g. casper@olkochiex.resend.app (Resend subdomain) or casper@leads.getd.dk (custom domain)
 *
 * Configure RESEND_INBOUND_DOMAIN in Vercel env vars and Resend inbound routing settings.
 *
 * Flow:
 *   1. Extract client slug from the "to" address
 *   2. Load client + lead_reply automation from DB
 *   3. Use Claude to parse the raw email → clean lead fields
 *   4. Save lead to `leads` table
 *   5. Run the lead_reply automation (Claude generates reply → Resend sends it)
 *   6. Log the run and increment the counter
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── Parse Resend inbound payload ─────────────────────────────────────
  // Resend email.received events wrap fields in body.data.
  // Fall back to top-level fields for direct/test calls.
  const payload = (body.data as Record<string, unknown>) ?? body;

  const toRaw = payload.to;
  const toAddress = Array.isArray(toRaw)
    ? (toRaw[0] as string)
    : (toRaw as string) ?? "";

  const fromRaw = (payload.from as string) ?? "";
  const subject = (payload.subject as string) ?? "";

  // Prefer plain text; fall back to HTML.
  // Resend often omits the body from the webhook payload — fetch it via API if missing.
  let emailBody = (payload.text as string) || (payload.html as string) || "";

  if (!emailBody) {
    const emailId = payload.email_id as string | undefined;
    if (emailId && process.env.RESEND_API_KEY) {
      try {
        const res = await fetch(`https://api.resend.com/emails/${emailId}`, {
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
        });
        if (res.ok) {
          const email = await res.json() as Record<string, unknown>;
          emailBody = (email.text as string) || (email.html as string) || "";
        }
      } catch (err) {
        console.error("[inbound-lead] Failed to fetch email body from Resend API:", err);
      }
    }
  }

  if (!toAddress || !emailBody) {
    return NextResponse.json({ error: "Missing 'to' or email body" }, { status: 400 });
  }

  // Extract slug: "lucaffe@leads.getd.dk" → "lucaffe"
  const slug = toAddress.split("@")[0].toLowerCase().trim();
  if (!slug) {
    return NextResponse.json({ error: "Cannot parse client slug from To address" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // ── Resolve client ────────────────────────────────────────────────────
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("id, slug")
    .eq("slug", slug)
    .single();

  if (clientError || !client) {
    console.error("[inbound-lead] Client not found for slug:", slug);
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  // ── Resolve automation ────────────────────────────────────────────────
  const { data: automationRow, error: automationError } = await supabase
    .from("automations")
    .select("id, name, is_enabled, config, require_approval")
    .eq("client_id", client.id)
    .eq("automation_key", "lead_reply")
    .single();

  if (automationError || !automationRow) {
    console.error("[inbound-lead] lead_reply not configured for:", slug);
    return NextResponse.json({ error: "lead_reply automation not configured for this client" }, { status: 404 });
  }

  if (!automationRow.is_enabled) {
    return NextResponse.json({ ok: true, skipped: "automation disabled" });
  }

  const config = (automationRow.config as Record<string, unknown>) ?? {};
  const requireApproval = automationRow.require_approval === true;

  // ── Parse the raw email with Claude ──────────────────────────────────
  let parsed;
  try {
    parsed = await parseLeadEmail(
      `From: ${fromRaw}\nSubject: ${subject}\n\n${emailBody}`,
      config.email_example as string | undefined
    );
  } catch (err) {
    console.error("[inbound-lead] Email parsing failed:", err);
    return NextResponse.json({ error: "Email parsing failed" }, { status: 500 });
  }

  if (!parsed.from_email) {
    return NextResponse.json({ error: "Could not extract sender email from the message" }, { status: 422 });
  }

  // ── Save lead to DB ───────────────────────────────────────────────────
  const { data: lead } = await supabase
    .from("leads")
    .insert({
      client_id: client.id,
      from_name: parsed.from_name || null,
      from_email: parsed.from_email,
      subject: parsed.subject || subject || null,
      message: parsed.message,
      raw_email: emailBody.slice(0, 5000),
    })
    .select("id")
    .single();

  // ── Run the automation ────────────────────────────────────────────────
  const startedAt = Date.now();
  let result;

  try {
    result = await automation.run(
      {
        from_email: parsed.from_email,
        from_name: parsed.from_name,
        subject: parsed.subject || subject,
        message: parsed.message,
      },
      { client_id: client.id, slug: client.slug, config, draftMode: requireApproval }
    );
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[inbound-lead] Automation threw:", error);

    await supabase.from("automation_runs").insert({
      automation_id: automationRow.id,
      client_id: client.id,
      status: "error",
      input_summary: `Lead from ${parsed.from_email}`,
      error,
    });

    return NextResponse.json({ error: "Automation failed" }, { status: 500 });
  }

  // ── Draft mode: store for approval and return early ───────────────────
  if (requireApproval && result.draftContent) {
    await supabase.from("automation_runs").insert({
      automation_id: automationRow.id,
      client_id: client.id,
      status: "pending_approval",
      draft_content: result.draftContent,
      // Store lead info so the approve endpoint knows where to send
      payload: {
        from_email: parsed.from_email,
        from_name: parsed.from_name,
        subject: parsed.subject || subject,
        message: parsed.message,
        lead_id: lead?.id ?? null,
      },
      input_summary: `Lead from ${parsed.from_email}`,
      output_summary: result.summary,
    });

    console.log(`[inbound-lead] Draft stored for approval — client ${slug}`);

    // Notify owner if notify_email is set in automation config
    const notifyEmail = config.notify_email as string | undefined;
    const fromEmail = config.from_email as string | undefined;
    if (notifyEmail && fromEmail) {
      await sendSystemEmail({
        to: notifyEmail,
        fromEmail,
        subject: `New lead draft waiting: ${parsed.from_name ?? parsed.from_email}`,
        text: `A lead reply draft is waiting for your review in your dashboard.\n\nFrom: ${parsed.from_name ?? ""} <${parsed.from_email}>\nSubject: ${parsed.subject ?? subject}\n\nOpen your dashboard to review and approve the draft before it is sent.`,
      });
    }

    return NextResponse.json({ success: true, pending_approval: true });
  }

  // ── Log run ───────────────────────────────────────────────────────────
  await supabase.from("automation_runs").insert({
    automation_id: automationRow.id,
    client_id: client.id,
    status: result.success ? "success" : "error",
    input_summary: `Lead from ${parsed.from_email}`,
    output_summary: result.summary,
    error: result.error ?? null,
  });

  // ── Increment counter + mark lead as replied ───────────────────────────
  if (result.success) {
    await supabase.rpc("increment_automation_counter", {
      p_automation_id: automationRow.id,
      p_increment: result.increment ?? 1,
    });

    if (lead?.id) {
      await supabase
        .from("leads")
        .update({ replied_at: new Date().toISOString() })
        .eq("id", lead.id);
    }
  }

  const duration = Date.now() - startedAt;
  console.log(
    `[inbound-lead] ${result.success ? "OK" : "FAIL"} for ${slug} in ${duration}ms — ${result.summary || result.error}`
  );

  return NextResponse.json({ success: result.success, summary: result.summary });
}
