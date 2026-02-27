import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

// GET all subscriptions for a client
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
    .from("subscriptions")
    .select("*")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST create a new subscription (pending status, no Stripe IDs yet)
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

  const { service_key, service_label, amount, currency, interval, termination_months, terms_text, value_proposition, includes } = body;

  if (!service_key || !service_label || !amount) {
    return NextResponse.json({ error: "service_key, service_label, and amount are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      client_id: id,
      service_key,
      service_label,
      amount: Math.round(Number(amount)),
      currency: currency || "dkk",
      interval: interval || "month",
      termination_months: termination_months ?? 0,
      terms_text: terms_text || null,
      value_proposition: value_proposition || null,
      includes: Array.isArray(includes) ? includes : [],
      status: "pending",
      invoices: [],
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
