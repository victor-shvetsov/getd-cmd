import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { parseLeadEmail } from "@/lib/automations/lead-reply/parse-email";
import { LeadReplyAutomation } from "@/lib/automations/lead-reply";

const automation = new LeadReplyAutomation();

/**
 * POST /api/webhooks/inbound-lead
 *
 * Receives inbound email webhooks from Resend.
 * Each client has a dedicated address: [slug]@leads.getd.dk
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
  // "to" may be a string or array depending on Resend version
  const toRaw = body.to;
  const toAddress = Array.isArray(toRaw)
    ? (toRaw[0] as string)
    : (toRaw as string) ?? "";

  const fromRaw = (body.from as string) ?? "";
  const subject = (body.subject as string) ?? "";
  // Prefer plain text; fall back to HTML
  const emailBody = (body.text as string) || (body.html as string) || "";

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
    .select("id, is_enabled, config, require_approval")
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
