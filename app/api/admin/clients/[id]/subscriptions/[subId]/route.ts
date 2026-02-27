import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/admin-auth";

// PATCH update a subscription
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, subId } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  // Only allow updating these fields from admin
  const allowed = [
    "service_key", "service_label", "amount", "currency",
    "interval", "termination_months", "terms_text",
    "value_proposition", "includes",
  ];
  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const key of allowed) {
    if (body[key] !== undefined) {
      update[key] = key === "amount" ? Math.round(Number(body[key])) : body[key];
    }
  }

  const { data, error } = await supabase
    .from("subscriptions")
    .update(update)
    .eq("id", subId)
    .eq("client_id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE a subscription (only if pending -- active ones need cancellation flow)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; subId: string }> }
) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id, subId } = await params;
  const supabase = createAdminClient();

  // Check status before deleting
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("status")
    .eq("id", subId)
    .eq("client_id", id)
    .single();

  if (!sub) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  if (sub.status === "active") {
    return NextResponse.json(
      { error: "Cannot delete an active subscription. Cancel it first via Stripe." },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("subscriptions")
    .delete()
    .eq("id", subId)
    .eq("client_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
