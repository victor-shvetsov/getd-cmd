import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/sales?clientId=xxx&month=2026-02
 * Returns sales entries + revenue goal for the given month
 */
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  const month = req.nextUrl.searchParams.get("month"); // e.g. "2026-02"

  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  // Default to current month
  const now = new Date();
  const targetMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [year, mon] = targetMonth.split("-").map(Number);
  const startDate = new Date(year, mon - 1, 1).toISOString();
  const endDate = new Date(year, mon, 1).toISOString();

  const supabase = createAdminClient();

  // Fetch sales entries for the month
  const { data: entries, error } = await supabase
    .from("sales_entries")
    .select("*")
    .eq("client_id", clientId)
    .gte("sold_at", startDate)
    .lt("sold_at", endDate)
    .order("sold_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch the revenue goal from the sales tab data
  const { data: tabData } = await supabase
    .from("client_tabs")
    .select("data")
    .eq("client_id", clientId)
    .eq("tab_key", "sales")
    .single();

  const revenueGoal = (tabData?.data as Record<string, unknown>)?.revenue_goal ?? 0;
  const categories = ((tabData?.data as Record<string, unknown>)?.product_categories ?? []) as Array<{ id: string; name: string; sort_order: number }>;

  // Aggregate totals
  const totalRevenue = (entries ?? []).reduce((sum, e) => sum + Number(e.amount), 0);

  // Aggregate by category
  const byCategory: Record<string, { name: string; total: number; count: number }> = {};
  for (const entry of entries ?? []) {
    const catName = entry.category_name || "Other";
    if (!byCategory[catName]) byCategory[catName] = { name: catName, total: 0, count: 0 };
    byCategory[catName].total += Number(entry.amount);
    byCategory[catName].count += 1;
  }

  // Aggregate by source
  const bySource: Record<string, number> = {};
  for (const entry of entries ?? []) {
    const src = entry.source || "manual";
    bySource[src] = (bySource[src] || 0) + Number(entry.amount);
  }

  return NextResponse.json({
    month: targetMonth,
    revenue_goal: Number(revenueGoal),
    total_revenue: totalRevenue,
    categories,
    by_category: Object.values(byCategory).sort((a, b) => b.total - a.total),
    by_source: bySource,
    entries: entries ?? [],
    entry_count: (entries ?? []).length,
  });
}

/**
 * POST /api/sales -- add a manual sale entry
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { clientId, categoryName, amount, currency, source, note, soldAt } = body;

  if (!clientId || !amount) {
    return NextResponse.json({ error: "clientId and amount required" }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("sales_entries")
    .insert({
      client_id: clientId,
      category_name: categoryName || "Other",
      amount: Number(amount),
      currency: currency || "DKK",
      source: source || "manual",
      note: note || null,
      sold_at: soldAt || new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
