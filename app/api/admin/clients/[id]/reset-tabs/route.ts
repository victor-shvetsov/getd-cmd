import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import { getDefaultTabData } from "@/lib/schema";
import type { TabKey } from "@/lib/types";

/**
 * POST /api/admin/clients/[id]/reset-tabs
 *
 * Resets ALL tab data back to empty schema defaults.
 * Knowledge Bank entries are preserved.
 * Requires: { confirm_name: string } matching the client's actual name.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { confirm_name } = body;

  if (!confirm_name || typeof confirm_name !== "string") {
    return NextResponse.json({ error: "confirm_name required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Verify the client exists and name matches
  const { data: client, error: clientErr } = await supabase
    .from("clients")
    .select("name")
    .eq("id", id)
    .single();

  if (clientErr || !client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  if (client.name.trim().toLowerCase() !== confirm_name.trim().toLowerCase()) {
    return NextResponse.json({ error: "Client name does not match" }, { status: 400 });
  }

  // Fetch all tabs for this client
  const { data: tabs, error: tabsErr } = await supabase
    .from("client_tabs")
    .select("id, tab_key")
    .eq("client_id", id);

  if (tabsErr) {
    return NextResponse.json({ error: tabsErr.message }, { status: 500 });
  }

  // Reset each tab to its default empty schema shape
  const results = [];
  for (const tab of tabs ?? []) {
    const defaultData = getDefaultTabData(tab.tab_key as TabKey);
    const { error } = await supabase
      .from("client_tabs")
      .update({ data: defaultData, updated_at: new Date().toISOString() })
      .eq("id", tab.id);

    results.push({ tab_key: tab.tab_key, success: !error });
  }

  // Delete all tab-level translations (translated tab data)
  const tabIds = (tabs ?? []).map((t) => t.id);
  if (tabIds.length > 0) {
    await supabase
      .from("client_tab_translations")
      .delete()
      .in("client_tab_id", tabIds);
  }

  // Also delete client-level UI label translations (they reference old content)
  await supabase
    .from("translations")
    .delete()
    .eq("client_id", id)
    .neq("language_code", "en");

  return NextResponse.json({
    message: "All tab data has been reset to defaults. Knowledge Bank preserved.",
    results,
  });
}
