import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

/**
 * POST /api/automations/toggle
 *
 * Client-facing endpoint — allows a client to toggle their own automation on/off.
 * No admin auth required, but strictly scoped: the automation must belong to
 * the client_id provided in the body.
 *
 * Body: { automation_id, client_id, is_enabled }
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const { automation_id, client_id, is_enabled } = body;

  if (!automation_id || !client_id || typeof is_enabled !== "boolean") {
    return NextResponse.json(
      { error: "automation_id, client_id, and is_enabled required" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Only update if the automation belongs to this client — prevents toggling other clients' automations
  const { data, error } = await supabase
    .from("automations")
    .update({ is_enabled, updated_at: new Date().toISOString() })
    .eq("id", automation_id)
    .eq("client_id", client_id)  // scope enforcement
    .select("id, is_enabled")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "Automation not found or not authorized" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, is_enabled: data.is_enabled });
}
