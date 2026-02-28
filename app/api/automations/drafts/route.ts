import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/automations/drafts?clientId=xxx
 *
 * Client-facing endpoint — returns all pending_approval automation runs
 * for this client, joined with the automation name and key.
 *
 * No admin auth required; scoped strictly to the provided clientId.
 */
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("automation_runs")
    .select(`
      id,
      automation_id,
      draft_content,
      payload,
      input_summary,
      ran_at,
      automations ( name, automation_key, config, client_id )
    `)
    .eq("client_id", clientId)
    .eq("status", "pending_approval")
    .order("ran_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Only return drafts that truly belong to this client (double-check via join)
  const safe = (data ?? []).filter(
    (row) =>
      row.automations &&
      (row.automations as { client_id: string }).client_id === clientId
  );

  return NextResponse.json({ drafts: safe });
}
