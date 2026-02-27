import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/activity?clientId=xxx
 * Returns visible activity entries grouped by month
 */
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");

  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: entries, error } = await supabase
    .from("activity_entries")
    .select("*")
    .eq("client_id", clientId)
    .eq("is_visible", true)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ entries: entries ?? [] });
}
