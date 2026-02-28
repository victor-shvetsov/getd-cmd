import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";
import bcrypt from "bcryptjs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const supabase = createAdminClient();

  const [clientRes, tabsRes, translationsRes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single(),
    supabase.from("client_tabs").select("*").eq("client_id", id).order("sort_order"),
    supabase.from("translations").select("*").eq("client_id", id),
  ]);

  if (clientRes.error) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tabs = tabsRes.data ?? [];
  const tabIds = tabs.map((t: { id: string }) => t.id);
  let tabTranslations: Array<Record<string, unknown>> = [];
  if (tabIds.length > 0) {
    const { data } = await supabase
      .from("client_tab_translations")
      .select("*")
      .in("client_tab_id", tabIds);
    tabTranslations = data ?? [];
  }

  return NextResponse.json({
    client: clientRes.data,
    tabs,
    translations: translationsRes.data ?? [],
    tabTranslations,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  // Hash PIN before storing if it's being updated
  const updateBody = { ...body };
  if (updateBody.pin) {
    updateBody.pin_hash = await bcrypt.hash(String(updateBody.pin), 10);
  }

  const { data, error } = await supabase
    .from("clients")
    .update({ ...updateBody, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const supabase = createAdminClient();

  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
