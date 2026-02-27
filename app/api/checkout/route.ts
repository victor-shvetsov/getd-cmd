import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { ExecutionData } from "@/lib/types";

/**
 * POST /api/checkout
 * Creates a Stripe Checkout Session for a specific execution item.
 * Body: { clientId, itemIndex, slug }
 * Returns: { clientSecret }
 */
export async function POST(request: Request) {
  try {
    const { clientId, itemIndex, slug } = await request.json();

    if (!clientId || itemIndex === undefined || !slug) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Fetch the execution tab data (server-side price validation)
    const { data: tab, error: tabErr } = await supabase
      .from("client_tabs")
      .select("data")
      .eq("client_id", clientId)
      .eq("tab_key", "execution")
      .single();

    if (tabErr || !tab?.data) {
      return NextResponse.json(
        { error: "Execution tab not found" },
        { status: 404 }
      );
    }

    const execData = tab.data as ExecutionData;
    const items = execData?.execution_checklist?.items;

    if (!items || !items[itemIndex]) {
      return NextResponse.json(
        { error: "Execution item not found" },
        { status: 404 }
      );
    }

    const item = items[itemIndex];

    // 2. Check if already paid
    if (item.payment_status === "Paid") {
      return NextResponse.json(
        { error: "This step is already paid" },
        { status: 400 }
      );
    }

    // 3. Parse price from the item (stored as string like "500" or "1500")
    const priceStr = item.price?.replace(/[^0-9.]/g, "") || "0";
    const priceNumber = parseFloat(priceStr);

    if (priceNumber <= 0) {
      return NextResponse.json(
        { error: "Invalid price for this item" },
        { status: 400 }
      );
    }

    const amountInCents = Math.round(priceNumber * 100);
    const currency = (item.currency || "eur").toLowerCase();

    // 4. Fetch client name for the checkout description
    const { data: client } = await supabase
      .from("clients")
      .select("name")
      .eq("id", clientId)
      .single();

    // 5. Create Stripe Checkout Session (embedded mode)
    const origin = request.headers.get("origin") || "";
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      ui_mode: "embedded",
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: item.action || "Project Step",
              description: item.deliverable
                ? `Deliverable: ${item.deliverable}`
                : undefined,
            },
            unit_amount: amountInCents,
          },
          quantity: 1,
        },
      ],
      metadata: {
        client_id: clientId,
        item_index: String(itemIndex),
        slug,
      },
      return_url: `${origin}/${slug}?payment=complete&step=${itemIndex}`,
    });

    // 6. Insert payment record
    await supabase.from("payments").insert({
      client_id: clientId,
      stripe_session_id: session.id,
      item_index: itemIndex,
      amount: amountInCents,
      currency,
      status: "pending",
    });

    return NextResponse.json({
      clientSecret: session.client_secret,
    });
  } catch (err) {
    console.error("[checkout] Error creating session:", err);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
