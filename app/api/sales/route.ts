import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse, type NextRequest } from "next/server";

/**
 * GET /api/sales?clientId=xxx&month=2026-02
 * Returns sales entries + revenue goal + aggregations for the given month
 */
export async function GET(req: NextRequest) {
  const clientId = req.nextUrl.searchParams.get("clientId");
  const month = req.nextUrl.searchParams.get("month");

  if (!clientId) {
    return NextResponse.json({ error: "clientId required" }, { status: 400 });
  }

  const now = new Date();
  const targetMonth =
    month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [year, mon] = targetMonth.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, mon - 1, 1)).toISOString();
  const endDate = new Date(Date.UTC(year, mon, 1)).toISOString();

  const supabase = createAdminClient();

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

  const { data: tabData } = await supabase
    .from("client_tabs")
    .select("data")
    .eq("client_id", clientId)
    .eq("tab_key", "sales")
    .single();

  const revenueGoal = Number(
    (tabData?.data as Record<string, unknown>)?.revenue_goal ?? 0
  );
  const productCategories = (
    (tabData?.data as Record<string, unknown>)?.product_categories ?? []
  ) as Array<{ id: string; name: string; sort_order: number }>;

  const rows = entries ?? [];
  const totalRevenue = rows.reduce((s, r) => s + Number(r.amount), 0);
  const untaggedCount = rows.filter((r) => !r.source).length;

  // By category
  const byCat: Record<string, { name: string; total: number; count: number }> = {};
  for (const r of rows) {
    const cat = r.category_name || "Other";
    if (!byCat[cat]) byCat[cat] = { name: cat, total: 0, count: 0 };
    byCat[cat].total += Number(r.amount);
    byCat[cat].count += 1;
  }

  // By source
  const bySource: Record<string, number> = {};
  for (const r of rows) {
    const src = r.source || "untagged";
    bySource[src] = (bySource[src] || 0) + Number(r.amount);
  }

  return NextResponse.json({
    month: targetMonth,
    revenue_goal: revenueGoal,
    total_revenue: totalRevenue,
    untagged_count: untaggedCount,
    product_categories: productCategories,
    by_category: Object.values(byCat).sort((a, b) => b.total - a.total),
    by_source: bySource,
    entries: rows,
    entry_count: rows.length,
  });
}

/**
 * PATCH /api/sales -- tag a sale entry with its source channel
 * Body: { id: string, source: string }
 */
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { id, source } = body;

  if (!id || !source) {
    return NextResponse.json({ error: "id and source required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("sales_entries")
    .update({ source, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE /api/sales?id=xxx -- delete a sale entry (admin)
 */
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("sales_entries")
    .delete()
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/**
 * POST /api/sales -- manually add a sale entry (fallback)
 * Body: { clientId, amount, categoryName?, customerName?, description?, note?, source?, currency?, soldAt? }
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { clientId, amount, categoryName, customerName, description, note, source, currency, soldAt } = body;

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
      customer_name: customerName || null,
      description: description || null,
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
