"use client";

import { useCallback, useState } from "react";
import type { SubscriptionRow } from "@/lib/types";
import { t } from "@/lib/i18n";
import {
  Check,
  ChevronDown,
  CreditCard,
  Download,
  FileText,
  RefreshCw,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  Zap,
  TrendingUp,
  Search,
  BarChart3,
  Globe,
  Megaphone,
  Mail,
  PenTool,
  Monitor,
} from "lucide-react";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

/* ── Helpers ── */

function fmtAmount(amount: number, currency: string): string {
  const num = amount / 100;
  const sym =
    currency === "eur" || currency === "EUR"
      ? "\u20ac"
      : currency === "usd" || currency === "USD"
        ? "$"
        : currency === "gbp" || currency === "GBP"
          ? "\u00a3"
          : currency === "dkk" || currency === "DKK"
            ? "kr "
            : `${currency.toUpperCase()} `;
  return `${sym}${num.toLocaleString()}`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Map service_key to an icon
const SERVICE_ICONS: Record<string, typeof Search> = {
  seo: Search,
  ppc: BarChart3,
  social_media: Globe,
  email: Mail,
  content: PenTool,
  web_dev: Monitor,
};

function getServiceIcon(key: string) {
  return SERVICE_ICONS[key] ?? Megaphone;
}

/* ── Active Service Card (compact, value reinforcement) ── */
function ActiveCard({
  sub,
  lang,
  tr,
}: {
  sub: SubscriptionRow;
  lang: string;
  tr: Record<string, Record<string, Record<string, string>>>;
}) {
  const [expanded, setExpanded] = useState(false);
  const Icon = getServiceIcon(sub.service_key);
  const invoices = sub.invoices ?? [];
  const isPastDue = sub.status === "past_due";

  return (
    <div
      className="overflow-hidden transition-all"
      style={{
        backgroundColor: "var(--surface-1)",
        borderRadius: "var(--client-radius, 0.75rem)",
        border: isPastDue ? "1px solid #ef444440" : "1px solid var(--border-1, transparent)",
      }}
    >
      <button
        onClick={() => setExpanded((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        {/* Icon */}
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: isPastDue ? "#ef444412" : "var(--client-primary-alpha, #3b82f612)" }}
        >
          <Icon className="h-4 w-4" style={{ color: isPastDue ? "#ef4444" : "var(--client-primary, #3b82f6)" }} />
        </div>

        <div className="flex flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold">{sub.service_label}</span>
            {isPastDue ? (
              <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: "#ef444418", color: "#ef4444" }}>
                Past Due
              </span>
            ) : (
              <span className="rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider" style={{ backgroundColor: "#10b98118", color: "#10b981" }}>
                {t("subscriptions.active_label", lang, tr)}
              </span>
            )}
          </div>
          <span className="text-[11px] opacity-40">
            {fmtAmount(sub.amount, sub.currency)}/{sub.interval === "year" ? t("subscriptions.yr", lang, tr) : t("subscriptions.mo", lang, tr)}
            {sub.current_period_end && <span className="ml-1.5">{" \u00b7 "}{t("subscriptions.next_billing", lang, tr)}: {fmtDate(sub.current_period_end)}</span>}
          </span>
        </div>

        <ChevronDown
          className="h-4 w-4 shrink-0 transition-transform duration-200"
          style={{ opacity: 0.2, transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>

      {expanded && (
        <div className="flex flex-col gap-3 border-t px-4 pb-4 pt-3" style={{ borderColor: "var(--border-1, #00000008)" }}>
          {/* Past due warning */}
          {isPastDue && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2.5" style={{ backgroundColor: "#ef444408" }}>
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" style={{ color: "#ef4444" }} />
              <span className="text-[11px] font-medium" style={{ color: "#ef4444" }}>
                {t("subscriptions.payment_failed", lang, tr)}
              </span>
            </div>
          )}

          {/* What's included (value reinforcement) */}
          {sub.includes && sub.includes.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-30">
                {t("subscriptions.whats_included", lang, tr)}
              </span>
              <div className="flex flex-col gap-1">
                {sub.includes.map((item, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-3 w-3 shrink-0" style={{ color: "var(--client-primary, #3b82f6)" }} />
                    <span className="text-[12px] opacity-60">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoice history */}
          {invoices.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider opacity-30">
                {t("subscriptions.invoices", lang, tr)} ({invoices.length})
              </span>
              <div className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                {[...invoices].reverse().map((inv, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg px-3 py-2"
                    style={{ backgroundColor: "var(--surface-2)" }}
                  >
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[11px] opacity-50">{fmtDate(inv.date)}</span>
                      <span className="text-[12px] font-bold tabular-nums">{fmtAmount(inv.amount, inv.currency)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {inv.invoice_pdf && (
                        <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold transition-colors hover:opacity-70" style={{ backgroundColor: "#10b98112", color: "#10b981" }}>
                          <Download className="h-3 w-3" /> PDF
                        </a>
                      )}
                      {inv.invoice_url && (
                        <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-semibold opacity-40 transition-colors hover:opacity-70">
                          <FileText className="h-3 w-3" /> View
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Pending Service Card (conversion-optimized) ── */
function PendingCard({
  sub,
  slug,
  lang,
  tr,
  onRefresh,
}: {
  sub: SubscriptionRow;
  slug: string;
  lang: string;
  tr: Record<string, Record<string, Record<string, string>>>;
  onRefresh?: () => void;
}) {
  const [termsAccepted, setTermsAccepted] = useState(!!sub.terms_accepted_at);
  const [acceptingTerms, setAcceptingTerms] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);

  const Icon = getServiceIcon(sub.service_key);
  const needsTerms = !!sub.terms_text && !termsAccepted;
  const hasValueProp = !!sub.value_proposition;
  const hasIncludes = sub.includes && sub.includes.length > 0;

  const handleAcceptTerms = useCallback(async () => {
    setAcceptingTerms(true);
    try {
      const res = await fetch("/api/subscribe/accept-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptionId: sub.id }),
      });
      if (res.ok) setTermsAccepted(true);
    } catch {
      /* user can retry */
    } finally {
      setAcceptingTerms(false);
    }
  }, [sub.id]);

  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptionId: sub.id, slug }),
    });
    if (!res.ok) throw new Error("Failed to start subscription");
    const data = await res.json();
    return data.clientSecret;
  }, [sub.id, slug]);

  return (
    <div
      className="overflow-hidden"
      style={{
        backgroundColor: "var(--surface-1)",
        borderRadius: "var(--client-radius, 0.75rem)",
        border: "1px solid var(--client-primary-alpha, #3b82f620)",
      }}
    >
      {/* Top gradient accent */}
      <div className="h-1" style={{ background: "linear-gradient(90deg, var(--client-primary, #3b82f6), var(--client-accent, #8b5cf6))" }} />

      <div className="flex flex-col gap-4 px-4 pb-5 pt-4">
        {/* Service badge */}
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{ backgroundColor: "var(--client-primary-alpha, #3b82f612)" }}
          >
            <Icon className="h-5 w-5" style={{ color: "var(--client-primary, #3b82f6)" }} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-35">
              {sub.service_label}
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold tabular-nums">{fmtAmount(sub.amount, sub.currency)}</span>
              <span className="text-[11px] opacity-35">
                /{sub.interval === "year" ? t("subscriptions.per_year", lang, tr) : t("subscriptions.per_month", lang, tr)}
              </span>
            </div>
          </div>
        </div>

        {/* Value proposition -- the hero selling line */}
        {hasValueProp && (
          <div className="flex items-start gap-2.5">
            <TrendingUp className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--client-primary, #3b82f6)" }} />
            <p className="text-[14px] font-semibold leading-snug" style={{ color: "var(--text-1)" }}>
              {sub.value_proposition}
            </p>
          </div>
        )}

        {/* What's included */}
        {hasIncludes && (
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-30">
              {t("subscriptions.whats_included", lang, tr)}
            </span>
            <div className="flex flex-col gap-1.5">
              {sub.includes.map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div
                    className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                    style={{ backgroundColor: "var(--client-primary-alpha, #3b82f612)" }}
                  >
                    <Check className="h-2.5 w-2.5" style={{ color: "var(--client-primary, #3b82f6)" }} />
                  </div>
                  <span className="text-[12px] leading-snug opacity-65">{item}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Termination notice (subtle, not scary) */}
        {sub.termination_months > 0 && (
          <p className="text-[11px] opacity-35">
            {sub.termination_months} {t("subscriptions.months_notice", lang, tr)}
          </p>
        )}

        {/* Terms acceptance -- inline checkbox, not a wall */}
        {sub.terms_text && (
          <div
            className="rounded-xl px-3.5 py-3"
            style={{ backgroundColor: "var(--surface-2)" }}
          >
            {!termsAccepted ? (
              <div className="flex flex-col gap-2.5">
                <p className="text-[11px] leading-relaxed opacity-50">{sub.terms_text}</p>
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={acceptingTerms}
                    onChange={() => {
                      if (!acceptingTerms) handleAcceptTerms();
                    }}
                    disabled={acceptingTerms}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded accent-current"
                    style={{ accentColor: "var(--client-primary, #3b82f6)" }}
                  />
                  <span className="text-[12px] font-medium opacity-70">
                    {acceptingTerms ? t("subscriptions.accepting", lang, tr) : t("subscriptions.i_agree_to_terms", lang, tr)}
                  </span>
                </label>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-[12px] font-medium" style={{ color: "#10b981" }}>
                <Check className="h-3.5 w-3.5" />
                {t("subscriptions.terms_accepted", lang, tr)}
              </div>
            )}
          </div>
        )}

        {/* CTA Button -- full width, prominent, branded */}
        {!showCheckout && (
          <button
            onClick={() => {
              console.log("[v0] Start service clicked. needsTerms:", needsTerms, "termsAccepted:", termsAccepted, "sub.terms_text:", !!sub.terms_text);
              alert(`[DEBUG] Start service clicked! needsTerms=${needsTerms}, termsAccepted=${termsAccepted}, sub=${sub.service_label}`);
              if (needsTerms) return;
              setShowCheckout(true);
            }}
            disabled={needsTerms}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30 disabled:hover:brightness-100"
            style={{ backgroundColor: "var(--client-primary, #3b82f6)" }}
          >
            <Sparkles className="h-4 w-4" />
            {t("subscriptions.start_service", lang, tr)} {sub.service_label}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {/* Embedded Stripe Checkout */}
        {showCheckout && (
          <div className="overflow-hidden rounded-xl border" style={{ borderColor: "var(--border-1)" }}>
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{
                fetchClientSecret,
  onComplete: () => {
  setShowCheckout(false);
  if (onRefresh) onRefresh();
  },
              }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Services Panel ── */
interface ServicesPanelProps {
  subscriptions: SubscriptionRow[];
  slug: string;
  lang: string;
  translations: Record<string, Record<string, Record<string, string>>>;
  onRefresh?: () => void;
  }
  
  export function ServicesPanel({ subscriptions, slug, lang, translations: tr, onRefresh }: ServicesPanelProps) {
  if (subscriptions.length === 0) return null;

  const active = subscriptions.filter((s) => s.status === "active" || s.status === "past_due");
  const pending = subscriptions.filter((s) => s.status === "pending");

  return (
    <div className="flex flex-col gap-3">
      {/* Pending services first -- these are the conversion targets */}
      {pending.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 px-1">
            <Zap className="h-3.5 w-3.5" style={{ color: "var(--client-primary, #3b82f6)" }} />
            <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--client-primary, #3b82f6)", opacity: 0.7 }}>
              {t("subscriptions.ready_to_grow", lang, tr)}
            </span>
          </div>
          {pending.map((sub) => (
            <PendingCard key={sub.id} sub={sub} slug={slug} lang={lang} tr={tr} onRefresh={onRefresh} />
          ))}
        </div>
      )}

      {/* Active services -- compact, value reinforcement */}
      {active.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] font-bold uppercase tracking-wider opacity-30">
              {t("subscriptions.your_services", lang, tr)}
            </span>
            <span className="text-[10px] font-semibold tabular-nums opacity-20">
              {active.length} {t("subscriptions.active_label", lang, tr)}
            </span>
          </div>
          {active.map((sub) => (
            <ActiveCard key={sub.id} sub={sub} lang={lang} tr={tr} />
          ))}
        </div>
      )}
    </div>
  );
}
