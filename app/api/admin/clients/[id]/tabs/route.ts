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
  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("client_tabs")
    .select("*")
    .eq("client_id", id)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("client_tabs")
    .insert({
      client_id: id,
      tab_key: body.tab_key,
      data: body.data ?? {},
      sort_order: body.sort_order ?? 0,
      is_visible: body.is_visible ?? true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await params;
  const body = await request.json();
  const { tabId, ...updates } = body;

  if (!tabId) {
    return NextResponse.json({ error: "tabId required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("client_tabs")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", tabId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Canonical tab order
const TAB_ORDER: Record<string, number> = {
  brief: 0,
  marketing_channels: 1,
  demand: 2,
  website: 3,
  assets: 4,
  execution: 5,
};

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const { tab_key, data, sort_order, is_visible } = body;

  const supabase = createAdminClient();

  // If no sort_order provided, check existing row first, then fall back to canonical order
  let resolvedSortOrder = sort_order;
  if (resolvedSortOrder === undefined || resolvedSortOrder === null) {
    const { data: existing } = await supabase
      .from("client_tabs")
      .select("sort_order")
      .eq("client_id", id)
      .eq("tab_key", tab_key)
      .single();
    resolvedSortOrder = existing?.sort_order ?? TAB_ORDER[tab_key] ?? 0;
  }

  const { data: result, error } = await supabase
    .from("client_tabs")
    .upsert(
      {
        client_id: id,
        tab_key,
        data,
        sort_order: resolvedSortOrder,
        is_visible: is_visible ?? true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id,tab_key" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(result);
}
