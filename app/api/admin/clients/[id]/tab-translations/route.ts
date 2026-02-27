import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: clientId } = await params;
  const supabase = createAdminClient();

  // Get all tab translations for this client's tabs
  const { data: tabs } = await supabase
    .from("client_tabs")
    .select("id, tab_key")
    .eq("client_id", clientId);

  if (!tabs || tabs.length === 0) {
    return NextResponse.json([]);
  }

  const tabIds = tabs.map((t) => t.id);
  const { data: translations, error } = await supabase
    .from("client_tab_translations")
    .select("*")
    .in("client_tab_id", tabIds);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Return with tab_key attached for easy lookup
  const enriched = (translations ?? []).map((tr) => {
    const tab = tabs.find((t) => t.id === tr.client_tab_id);
    return { ...tr, tab_key: tab?.tab_key ?? null };
  });

  return NextResponse.json(enriched);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await params;
  const body = await request.json();
  const { client_tab_id, language_code, data } = body;

  const supabase = createAdminClient();

  const { data: result, error } = await supabase
    .from("client_tab_translations")
    .upsert(
      {
        client_tab_id,
        language_code,
        data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_tab_id,language_code" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(result);
}
