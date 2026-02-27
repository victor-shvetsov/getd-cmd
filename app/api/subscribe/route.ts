import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { SubscriptionRow } from "@/lib/types";

/**
 * POST /api/subscribe
 * Creates a Stripe Checkout Session for a recurring subscription.
 * Body: { subscriptionId, slug }
 * Returns: { clientSecret }
 */
export async function POST(request: Request) {
  try {
    const { subscriptionId, slug } = await request.json();

    if (!subscriptionId || !slug) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // 1. Fetch the subscription record
    const { data: sub, error: subErr } = await supabase
      .from("subscriptions")
      .select("*, clients!inner(name, slug, stripe_customer_id)")
      .eq("id", subscriptionId)
      .single();

    if (subErr || !sub) {
      return NextResponse.json(
        { error: "Subscription not found" },
        { status: 404 }
      );
    }

    const subscription = sub as SubscriptionRow & {
      clients: { name: string; slug: string; stripe_customer_id: string | null };
    };

    // 2. Validate status
    if (subscription.status === "active") {
      return NextResponse.json(
        { error: "This service is already active" },
        { status: 400 }
      );
    }

    if (subscription.amount <= 0) {
      return NextResponse.json(
        { error: "Invalid subscription amount" },
        { status: 400 }
      );
    }

    // 3. Ensure Stripe customer exists
    let stripeCustomerId = subscription.clients.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        name: subscription.clients.name,
        metadata: { client_id: subscription.client_id, slug },
      });
      stripeCustomerId = customer.id;
      await supabase
        .from("clients")
        .update({ stripe_customer_id: customer.id })
        .eq("id", subscription.client_id);
    }

    // 4. Create Stripe Checkout Session (subscription mode, embedded)
    const origin = request.headers.get("origin") || "";
    const currency = (subscription.currency || "dkk").toLowerCase();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      ui_mode: "embedded",
      customer: stripeCustomerId,
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: subscription.service_label,
              description: subscription.terms_text || undefined,
            },
            unit_amount: subscription.amount,
            recurring: {
              interval: subscription.interval === "year" ? "year" : "month",
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        subscription_id: subscriptionId,
        client_id: subscription.client_id,
        service_key: subscription.service_key,
        slug,
      },
      subscription_data: {
        metadata: {
          subscription_id: subscriptionId,
          client_id: subscription.client_id,
          service_key: subscription.service_key,
        },
      },
      return_url: `${origin}/${slug}?subscription=complete&service=${subscription.service_key}`,
    });

    return NextResponse.json({
      clientSecret: session.client_secret,
    });
  } catch (err) {
    console.error("[subscribe] Error creating session:", err);
    return NextResponse.json(
      { error: "Failed to create subscription checkout" },
      { status: 500 }
    );
  }
}
