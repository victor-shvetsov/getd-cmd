import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";
import { sendEmail, extractSmtpConfig } from "@/lib/automations/lead-reply/tools";
import { sendReviewRequest } from "@/lib/automations/review-collector/tools";

/**
 * PATCH /api/automations/drafts/[runId]
 *
 * Client-facing endpoint — approve or discard a pending draft.
 *
 * Body: {
 *   action: "approve" | "discard",
 *   client_id: string,         // for ownership verification
 *   content?: string           // optional edited content (overrides draft_content)
 * }
 *
 * On approve:
 *   - Sends the message using the automation's send function
 *   - Updates run status to "approved"
 *   - Increments the automation counter
 *
 * On discard:
 *   - Updates run status to "discarded"
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action, client_id, content } = body as {
    action?: string;
    client_id?: string;
    content?: string;
  };

  if (!action || !client_id) {
    return NextResponse.json({ error: "action and client_id required" }, { status: 400 });
  }

  if (action !== "approve" && action !== "discard") {
    return NextResponse.json({ error: "action must be 'approve' or 'discard'" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // ── Load the run with automation + client email_account ──────────────
  const { data: run, error: runError } = await supabase
    .from("automation_runs")
    .select(`
      id,
      automation_id,
      client_id,
      status,
      draft_content,
      payload,
      automations ( id, automation_key, config, client_id ),
      clients ( email_account )
    `)
    .eq("id", runId)
    .eq("client_id", client_id)          // scope to this client
    .eq("status", "pending_approval")    // only pending drafts
    .single();

  if (runError || !run) {
    return NextResponse.json({ error: "Draft not found or already processed" }, { status: 404 });
  }

  const automation = run.automations as {
    id: string;
    automation_key: string;
    config: Record<string, unknown>;
    client_id: string;
  } | null;

  const clientEmailAccount =
    (run.clients as { email_account?: Record<string, unknown> | null } | null)?.email_account ?? null;

  // Extra ownership check: automation must belong to this client
  if (!automation || automation.client_id !== client_id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // ── Discard ───────────────────────────────────────────────────────────
  if (action === "discard") {
    await supabase
      .from("automation_runs")
      .update({ status: "discarded" })
      .eq("id", runId);

    return NextResponse.json({ ok: true, status: "discarded" });
  }

  // ── Approve: send the message ─────────────────────────────────────────
  const finalContent = content?.trim() || (run.draft_content ?? "");
  if (!finalContent) {
    return NextResponse.json({ error: "No content to send" }, { status: 400 });
  }

  const payload = (run.payload ?? {}) as Record<string, unknown>;
  const cfg = (automation.config ?? {}) as Record<string, unknown>;

  let sendResult: { success: boolean; error?: string };

  if (automation.automation_key === "lead_reply") {
    const toEmail = payload.from_email as string;
    const subject = payload.subject as string | undefined;
    if (!toEmail) {
      return NextResponse.json({ error: "Missing recipient in draft payload" }, { status: 422 });
    }

    // Prefer client-level email_account for SMTP; fall back to automation config
    const smtp = extractSmtpConfig(clientEmailAccount ?? cfg);
    const fromEmail = smtp?.user ?? (cfg.from_email as string) ?? "";

    sendResult = await sendEmail({
      to: toEmail,
      subject: subject ? `Re: ${subject}` : "Thanks for reaching out",
      body: finalContent,
      fromName: (cfg.from_name as string) ?? (cfg.owner_name as string) ?? "Victor",
      fromEmail,
    }, smtp);

    // Mark the lead as replied if we have its id
    const leadId = payload.lead_id as string | null;
    if (sendResult.success && leadId) {
      await supabase
        .from("leads")
        .update({ replied_at: new Date().toISOString() })
        .eq("id", leadId);
    }
  } else if (automation.automation_key === "review_collector") {
    const toEmail = payload.customer_email as string;
    const customerName = (payload.customer_name as string) ?? "Customer";
    if (!toEmail) {
      return NextResponse.json({ error: "Missing recipient in draft payload" }, { status: 422 });
    }

    sendResult = await sendReviewRequest({
      to: toEmail,
      customerName,
      message: finalContent,
      fromName: (cfg.from_name as string) ?? (cfg.owner_name as string) ?? "Victor",
      fromEmail: cfg.from_email as string,
    });
  } else {
    return NextResponse.json(
      { error: `Approve not supported for automation key: ${automation.automation_key}` },
      { status: 422 }
    );
  }

  if (!sendResult.success) {
    return NextResponse.json({ error: `Send failed: ${sendResult.error}` }, { status: 500 });
  }

  // ── Mark approved + increment counter ────────────────────────────────
  await supabase
    .from("automation_runs")
    .update({
      status: "approved",
      output_summary: `Approved and sent — ${new Date().toISOString()}`,
    })
    .eq("id", runId);

  await supabase.rpc("increment_automation_counter", {
    p_automation_id: automation.id,
    p_increment: 1,
  });

  return NextResponse.json({ ok: true, status: "approved" });
}
