import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/automations?clientId=xxx
 * Returns all automations for this client
 */
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("automations")
    .select("*")
    .eq("client_id", clientId)
    .order("sort_order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ automations: data ?? [] });
}

/**
 * PATCH /api/automations -- toggle an automation on/off
 * Body: { automationId, enabled }
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { automationId, enabled } = body;

  if (!automationId || typeof enabled !== "boolean") {
    return NextResponse.json({ error: "automationId and enabled required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Get the automation to check for webhook URL
  const { data: automation } = await supabase
    .from("automations")
    .select("*")
    .eq("id", automationId)
    .single();

  if (!automation) {
    return NextResponse.json({ error: "Automation not found" }, { status: 404 });
  }

  // Update the toggle state
  const { error } = await supabase
    .from("automations")
    .update({ is_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("id", automationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire n8n webhook if configured (non-blocking)
  if (automation.webhook_url) {
    fetch(automation.webhook_url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        automation_key: automation.automation_key,
        client_id: automation.client_id,
        enabled,
      }),
    }).catch(() => {
      // Non-blocking -- webhook failure doesn't break the toggle
    });
  }

  return NextResponse.json({ ok: true, enabled });
}
