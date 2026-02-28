import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/activity?clientId=xxx[&all=1]
 * Returns activity entries. Without `all`, only visible entries.
 * With `all=1` returns everything (for admin).
 */
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  const all = req.nextUrl.searchParams.get("all") === "1";

  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  let query = supabase
    .from("activity_entries")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!all) {
    query = query.eq("is_visible", true);
  }

  const { data: entries, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: entries ?? [] });
}

/**
 * POST /api/activity -- create a new entry
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { client_id, title, description, category, is_visible, created_at } = body;

  if (!client_id || !title) {
    return NextResponse.json({ error: "client_id and title required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const insert: Record<string, unknown> = {
    client_id,
    title,
    description: description ?? null,
    category: category ?? "general",
    is_visible: is_visible ?? true,
  };

  // Allow backdating entries
  if (created_at) {
    insert.created_at = created_at;
  }

  const { data, error } = await supabase
    .from("activity_entries")
    .insert(insert)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data });
}

/**
 * PATCH /api/activity -- update an entry
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("activity_entries")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entry: data });
}

/**
 * DELETE /api/activity?id=xxx
 */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("activity_entries")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
