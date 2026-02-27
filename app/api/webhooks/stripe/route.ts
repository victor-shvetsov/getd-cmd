import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import type { ExecutionData, SubscriptionRow } from "@/lib/types";
import Stripe from "stripe";

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events for both one-time payments and subscriptions.
 */
export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[webhook] Signature verification failed:", err);
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  switch (event.type) {
    // ── One-time payment completed ──
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      // Handle subscription checkout completion
      if (session.mode === "subscription") {
        const subId = session.metadata?.subscription_id;
        if (subId) {
          const stripeSubId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription?.id;

          await supabase
            .from("subscriptions")
            .update({
              status: "active",
              stripe_subscription_id: stripeSubId || null,
              current_period_start: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", subId);

          console.log(`[webhook] Subscription ${subId} activated via checkout`);
        }
        break;
      }

      // Handle one-time payment checkout (existing logic)
      const clientId = session.metadata?.client_id;
      const itemIndex = parseInt(session.metadata?.item_index ?? "-1", 10);

      if (!clientId || itemIndex < 0) {
        console.error("[webhook] Missing metadata in session:", session.id);
        break;
      }

      // Update payment record
      await supabase
        .from("payments")
        .update({
          status: "paid",
          paid_at: new Date().toISOString(),
        })
        .eq("stripe_session_id", session.id);

      // Update the execution item in the tab data
      const { data: tab } = await supabase
        .from("client_tabs")
        .select("id, data")
        .eq("client_id", clientId)
        .eq("tab_key", "execution")
        .single();

      if (tab?.data) {
        const execData = tab.data as ExecutionData;
        const items = execData?.execution_checklist?.items;

        if (items && items[itemIndex]) {
          items[itemIndex].payment_status = "Paid";
          items[itemIndex].action_status = "In Progress";
          items[itemIndex].stripe_session_id = session.id;
          items[itemIndex].paid_at = new Date().toISOString();

          await supabase
            .from("client_tabs")
            .update({ data: execData })
            .eq("id", tab.id);

          console.log(
            `[webhook] Payment confirmed for client ${clientId}, item ${itemIndex}`
          );
        }
      }
      break;
    }

    // ── Subscription invoice paid (recurring billing success) ──
    case "invoice.paid": {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeSubId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;

      if (!stripeSubId) break;

      // Find our subscription by stripe_subscription_id
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("id, invoices")
        .eq("stripe_subscription_id", stripeSubId)
        .single();

      if (!sub) break;

      // Append invoice to the invoices array
      const invoices = (sub.invoices as SubscriptionRow["invoices"]) || [];
      invoices.push({
        date: new Date(invoice.created * 1000).toISOString(),
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: "paid",
        invoice_url: invoice.hosted_invoice_url || null,
        invoice_pdf: invoice.invoice_pdf || null,
        stripe_invoice_id: invoice.id,
      });

      await supabase
        .from("subscriptions")
        .update({
          status: "active",
          invoices,
          current_period_start: invoice.period_start
            ? new Date(invoice.period_start * 1000).toISOString()
            : undefined,
          current_period_end: invoice.period_end
            ? new Date(invoice.period_end * 1000).toISOString()
            : undefined,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);

      console.log(`[webhook] Invoice paid for subscription ${sub.id}`);
      break;
    }

    // ── Subscription payment failed ──
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const stripeSubId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription?.id;

      if (!stripeSubId) break;

      await supabase
        .from("subscriptions")
        .update({
          status: "past_due",
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", stripeSubId);

      console.log(`[webhook] Payment failed for stripe sub ${stripeSubId}`);
      break;
    }

    // ── Subscription canceled ──
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;

      await supabase
        .from("subscriptions")
        .update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", sub.id);

      console.log(`[webhook] Subscription canceled: ${sub.id}`);
      break;
    }

    // ── Subscription updated (e.g. plan change, period renewal) ──
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;

      const statusMap: Record<string, string> = {
        active: "active",
        past_due: "past_due",
        canceled: "canceled",
        unpaid: "past_due",
        trialing: "active",
      };

      await supabase
        .from("subscriptions")
        .update({
          status: statusMap[sub.status] || "active",
          current_period_start: new Date(
            sub.current_period_start * 1000
          ).toISOString(),
          current_period_end: new Date(
            sub.current_period_end * 1000
          ).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_subscription_id", sub.id);

      console.log(`[webhook] Subscription updated: ${sub.id} -> ${sub.status}`);
      break;
    }
  }

  return NextResponse.json({ received: true });
}
