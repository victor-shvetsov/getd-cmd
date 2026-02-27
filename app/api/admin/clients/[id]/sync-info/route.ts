import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createAdminClient();

  // Total entries
  const { count: total_entries } = await supabase
    .from("sales_entries")
    .select("*", { count: "exact", head: true })
    .eq("client_id", id);

  // Untagged count
  const { count: untagged_count } = await supabase
    .from("sales_entries")
    .select("*", { count: "exact", head: true })
    .eq("client_id", id)
    .is("source", null);

  // Last entry
  const { data: lastEntry } = await supabase
    .from("sales_entries")
    .select("sold_at")
    .eq("client_id", id)
    .order("sold_at", { ascending: false })
    .limit(1)
    .single();

  // Source breakdown
  const { data: sourceRows } = await supabase
    .from("sales_entries")
    .select("source")
    .eq("client_id", id);

  const sourceCounts: Record<string, number> = {};
  (sourceRows ?? []).forEach((r) => {
    const key = r.source || "untagged";
    sourceCounts[key] = (sourceCounts[key] || 0) + 1;
  });

  const sources = Object.entries(sourceCounts)
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({
    total_entries: total_entries ?? 0,
    untagged_count: untagged_count ?? 0,
    last_entry_at: lastEntry?.sold_at ?? null,
    sources,
  });
}
