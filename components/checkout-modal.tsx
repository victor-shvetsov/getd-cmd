"use client";

import { useCallback, useState } from "react";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

interface CheckoutModalProps {
  clientId: string;
  slug: string;
  itemIndex: number;
  itemName: string;
  price: string;
  currency: string;
  onClose: () => void;
  onComplete: () => void;
}

export function CheckoutModal({
  clientId,
  slug,
  itemIndex,
  itemName,
  price,
  currency,
  onClose,
  onComplete,
}: CheckoutModalProps) {
  const [error, setError] = useState<string | null>(null);

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, itemIndex, slug }),
    });

    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to create checkout session");
    }

    const data = await res.json();
    return data.clientSecret;
  }, [clientId, itemIndex, slug]);

  const handleComplete = useCallback(() => {
    // Small delay to let the user see the success state
    setTimeout(() => {
      onComplete();
    }, 1500);
  }, [onComplete]);

  const c = currency?.toLowerCase() || "dkk";
  const currencySymbol =
    c === "usd" ? "$"
    : c === "gbp" ? "\u00A3"
    : c === "eur" ? "\u20AC"
    : c === "dkk" || c === "sek" || c === "nok" ? "kr "
    : `${currency} `;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
    >
      {/* Backdrop click to close */}
      <div className="absolute inset-0" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-t-2xl sm:rounded-2xl"
        style={{ backgroundColor: "var(--surface-1, #fff)" }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b px-5 py-4"
          style={{ borderColor: "var(--client-text, #1a2536)10" }}
        >
          <div>
            <h3
              className="text-sm font-bold"
              style={{
                color: "var(--client-text, #1a2536)",
                fontFamily: "var(--client-font-heading, inherit)",
              }}
            >
              {itemName}
            </h3>
            <p
              className="mt-0.5 text-lg font-bold"
              style={{ color: "var(--client-primary, #3b82f6)" }}
            >
              {currencySymbol}
              {price}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:opacity-70"
            style={{
              backgroundColor: "var(--client-text, #1a2536)08",
              color: "var(--client-text, #1a2536)",
            }}
            aria-label="Close"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <line x1="1" y1="1" x2="13" y2="13" />
              <line x1="13" y1="1" x2="1" y2="13" />
            </svg>
          </button>
        </div>

        {/* Stripe Embedded Checkout */}
        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={onClose}
                className="mt-2 text-xs font-medium text-red-600 underline"
              >
                Close
              </button>
            </div>
          ) : (
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{
                fetchClientSecret,
                onComplete: handleComplete,
              }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          )}
        </div>
      </div>
    </div>
  );
}
