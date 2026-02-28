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
 * POST /api/automations -- create a new automation
 * Body: { client_id, name, description, automation_key, counter_label?, webhook_url?, is_enabled?, sort_order? }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { client_id, name, description, automation_key, counter_label, webhook_url, is_enabled, sort_order } = body;

  if (!client_id || !name || !automation_key) {
    return NextResponse.json({ error: "client_id, name, and automation_key required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const insert: Record<string, unknown> = {
    client_id,
    name,
    description: description ?? "",
    automation_key,
    counter_label: counter_label ?? "actions completed",
    counter_value: 0,
    is_enabled: is_enabled ?? false,
    sort_order: sort_order ?? 0,
  };

  if (webhook_url) insert.webhook_url = webhook_url;

  const { data, error } = await supabase
    .from("automations")
    .insert(insert)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ automation: data });
}

/**
 * PATCH /api/automations -- update any fields on an automation
 * Body: { id, ...updates }
 * Supports: name, description, automation_key, is_enabled, counter_label, counter_value, webhook_url, sort_order
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, automationId, ...updates } = body;

  const targetId = id ?? automationId;
  if (!targetId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // Legacy support: if only "enabled" is passed, map to is_enabled
  if ("enabled" in updates && !("is_enabled" in updates)) {
    updates.is_enabled = updates.enabled;
    delete updates.enabled;
  }

  const supabase = createAdminClient();

  // If toggling is_enabled, fire webhook
  if (typeof updates.is_enabled === "boolean") {
    const { data: automation } = await supabase
      .from("automations")
      .select("webhook_url, automation_key, client_id")
      .eq("id", targetId)
      .single();

    if (automation?.webhook_url) {
      fetch(automation.webhook_url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          automation_key: automation.automation_key,
          client_id: automation.client_id,
          enabled: updates.is_enabled,
        }),
      }).catch(() => {});
    }
  }

  const { data, error } = await supabase
    .from("automations")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", targetId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ automation: data });
}

/**
 * DELETE /api/automations?id=xxx
 */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("automations")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
