import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

/**
 * POST /api/subscribe/accept-terms
 * Records that a client has accepted the terms for a subscription.
 * Body: { subscriptionId }
 */
export async function POST(request: Request) {
  try {
    const { subscriptionId } = await request.json();

    if (!subscriptionId) {
      return NextResponse.json(
        { error: "Missing subscriptionId" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    const { data: sub } = await supabase
      .from("subscriptions")
      .select("id, terms_text, terms_accepted_at")
      .eq("id", subscriptionId)
      .single();

    if (!sub) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    // Only update if terms exist and haven't been accepted yet
    if (sub.terms_text && !sub.terms_accepted_at) {
      await supabase
        .from("subscriptions")
        .update({ terms_accepted_at: new Date().toISOString() })
        .eq("id", subscriptionId);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[accept-terms] Error:", err);
    return NextResponse.json(
      { error: "Failed to accept terms" },
      { status: 500 }
    );
  }
}
