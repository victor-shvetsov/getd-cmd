"use client";

import { useState, useCallback, useMemo } from "react";
import type { ExecutionData, ExecutionItem, SubscriptionRow } from "@/lib/types";
import { t } from "@/lib/i18n";
import { EmptyState } from "@/components/empty-state";
import { ServicesPanel } from "@/components/services-panel";
import { CheckoutModal } from "@/components/checkout-modal";
import {
  ChevronDown,
  Check,
  CalendarDays,
  FileText,
  MessageSquare,
  AlertTriangle,
  CreditCard,
  Download,
  ExternalLink,
  ArrowRight,
  Rocket,
  TrendingUp,
  Sparkles,
} from "lucide-react";

/* ── Helpers ── */

function safeStr(v: unknown): string {
  return typeof v === "string" ? v : String(v ?? "");
}

function isPaid(item: ExecutionItem): boolean {
  return safeStr(item.payment_status).toLowerCase() === "paid";
}

function isMonthly(item: ExecutionItem): boolean {
  return safeStr(item.payment_type).toLowerCase() === "monthly";
}

function hasPrice(item: ExecutionItem): boolean {
  return parseFloat(safeStr(item.price).replace(/[^0-9.]/g, "") || "0") > 0;
}

function fmtCurrency(price: string, currency: string): string {
  const num = parseFloat(price.replace(/[^0-9.]/g, "") || "0");
  const c = currency.toUpperCase();
  if (c === "EUR") return `\u20ac${num.toLocaleString()}`;
  if (c === "USD") return `$${num.toLocaleString()}`;
  if (c === "GBP") return `\u00a3${num.toLocaleString()}`;
  if (c === "DKK") return `kr ${num.toLocaleString()}`;
  return `${num.toLocaleString()} ${c}`;
}

/* ══════════════════════════════════════════════
   PROGRESS HERO
   Achievement-framed, not cost-framed
   ══════════════════════════════════════════════ */

function ProgressHero({
  items,
  lang,
  tr,
}: {
  items: ExecutionItem[];
  lang: string;
  tr: Record<string, Record<string, Record<string, string>>>;
}) {
  const total = items.length;
  const completed = items.filter((i) => safeStr(i.action_status).toLowerCase() === "completed" || isPaid(i)).length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  // Investment framing
  const paidItems = items.filter((i) => isPaid(i) && hasPrice(i));
  const totalInvested = paidItems.reduce((s, i) => s + parseFloat(safeStr(i.price).replace(/[^0-9.]/g, "") || "0"), 0);
  const mainCurrency = items.find((i) => i.currency)?.currency || "DKK";

  // Next milestone
  const nextStep = items.find((i) => !isPaid(i) && hasPrice(i) && !isMonthly(i));

  return (
    <div
      className="relative overflow-hidden p-[1px]"
      style={{ borderRadius: "var(--client-radius, 0.75rem)" }}
    >
      {/* Gradient border */}
      <div
        className="absolute inset-0"
        style={{
          background: "linear-gradient(135deg, var(--client-primary, #3b82f6)40, transparent 50%, var(--client-primary, #3b82f6)15)",
          borderRadius: "inherit",
        }}
      />
      <div
        className="relative flex flex-col gap-4 p-4"
        style={{ backgroundColor: "var(--surface-2)", borderRadius: "inherit" }}
      >
        {/* Top: phase label + completion */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Rocket className="h-3.5 w-3.5" style={{ color: "var(--client-primary, #3b82f6)" }} />
            <span
              className="text-[11px] font-bold uppercase tracking-wider"
              style={{ color: "var(--client-primary, #3b82f6)", opacity: 0.8 }}
            >
              {t("execution.phase_label", lang, tr)}
            </span>
          </div>
          <span
            className="text-[20px] font-black tabular-nums"
            style={{ color: "var(--client-primary, #3b82f6)" }}
          >
            {pct}%
          </span>
        </div>

        {/* Progress ring + completion text */}
        <div className="flex items-center gap-4">
          {/* Circular progress indicator */}
          <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
            <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90">
              <circle
                cx="18" cy="18" r="15.9"
                fill="none"
                stroke="var(--surface-3)"
                strokeWidth="3"
              />
              <circle
                cx="18" cy="18" r="15.9"
                fill="none"
                stroke="var(--client-primary, #3b82f6)"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${pct}, 100`}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <span className="absolute text-[11px] font-extrabold" style={{ color: "var(--client-primary, #3b82f6)" }}>
              {completed}/{total}
            </span>
          </div>

          <div className="flex flex-1 flex-col gap-1">
            <span className="text-[14px] font-bold leading-tight" style={{ color: "var(--client-text, #1a2536)" }}>
              {pct >= 100 ? t("execution.all_complete", lang, tr) : `${completed} ${t("execution.milestones_done", lang, tr)}`}
            </span>

            {/* Investment so far -- positive framing */}
            {totalInvested > 0 && (
              <span className="text-[11px] opacity-40">
                {t("execution.your_investment", lang, tr)}: {fmtCurrency(String(totalInvested), mainCurrency)}
              </span>
            )}
          </div>
        </div>

        {/* Next milestone callout */}
        {nextStep && (
          <div
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5"
            style={{ backgroundColor: "var(--client-primary, #3b82f6)08" }}
          >
            <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--client-primary, #3b82f6)" }} />
            <span className="text-[11.5px] font-medium opacity-60">
              {t("execution.next_step", lang, tr)}: <span className="font-bold opacity-100">{safeStr(nextStep.action)}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════
   TAB TOGGLE
   ══════════════════════════════════════════════ */

function TabToggle({
  activeTab,
  onTabChange,
  projectCount,
  servicesCount,
  lang,
  tr,
}: {
  activeTab: "project" | "growth";
  onTabChange: (tab: "project" | "growth") => void;
  projectCount: number;
  servicesCount: number;
  lang: string;
  tr: Record<string, Record<string, Record<string, string>>>;
}) {
  return (
    <div
      className="flex gap-1 p-1"
      style={{ backgroundColor: "var(--surface-2)", borderRadius: "var(--client-radius, 0.75rem)" }}
    >
      <TabButton
        active={activeTab === "project"}
        onClick={() => onTabChange("project")}
        label={t("execution.your_project", lang, tr)}
        count={projectCount}
      />
      <TabButton
        active={activeTab === "growth"}
        onClick={() => onTabChange("growth")}
        label={t("execution.growth_services", lang, tr)}
        count={servicesCount}
        accent
      />
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
  accent,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-[12px] font-bold transition-all"
      style={{
        backgroundColor: active ? "var(--surface-1)" : "transparent",
        color: active
          ? accent ? "var(--client-primary, #3b82f6)" : "var(--client-text, #1a2536)"
          : "var(--client-text, #1a2536)",
        opacity: active ? 1 : 0.4,
        boxShadow: active ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
      }}
    >
      {accent && <TrendingUp className="h-3 w-3" />}
      {!accent && <Rocket className="h-3 w-3" />}
      {label}
      {count > 0 && (
        <span
          className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold"
          style={{
            backgroundColor: active
              ? accent ? "var(--client-primary, #3b82f6)15" : "var(--surface-3)"
              : "var(--surface-3)",
            color: active && accent ? "var(--client-primary, #3b82f6)" : "inherit",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}

/* ══════════════════════════════════════════════
   STEP CARDS (one-time project items)
   ══════════════════════════════════════════════ */

function CompletedStep({ item }: { item: ExecutionItem }) {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5" style={{ opacity: 0.5 }}>
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "#10b981" }}>
        <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
      </div>
      <span className="flex-1 text-[12px] font-medium line-through">{safeStr(item.action)}</span>
      {isPaid(item) && hasPrice(item) && (
        <span className="text-[10px] font-bold tabular-nums opacity-50">
          {fmtCurrency(safeStr(item.price), safeStr(item.currency) || "DKK")}
        </span>
      )}
    </div>
  );
}

function ActiveStepCard({
  item,
  globalIdx,
  canPay,
  onPay,
  lang,
  tr,
}: {
  item: ExecutionItem;
  globalIdx: number;
  canPay: boolean;
  onPay: (idx: number) => void;
  lang: string;
  tr: Record<string, Record<string, Record<string, string>>>;
}) {
  const priced = hasPrice(item);
  const deliverable = safeStr(item.deliverable);
  const deadline = safeStr(item.deadline);
  const notes = safeStr(item.notes);
  const deadlineStatus = safeStr(item.deadline_status).toLowerCase();
  const priority = safeStr(item.priority).toLowerCase();

  return (
    <div
      className="overflow-hidden"
      style={{
        backgroundColor: "var(--surface-1)",
        borderRadius: "var(--client-radius, 0.75rem)",
        border: canPay ? "1px solid var(--client-primary, #3b82f6)30" : "1px solid var(--border-1, transparent)",
      }}
    >
      {/* Accent bar for payable items */}
      {canPay && (
        <div className="h-0.5" style={{ background: "linear-gradient(90deg, var(--client-primary, #3b82f6), var(--client-accent, #60a5fa))" }} />
      )}

      <div className="flex flex-col gap-3 p-4">
        {/* Step number + action name */}
        <div className="flex items-start gap-3">
          <div
            className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
            style={{
              backgroundColor: canPay ? "var(--client-primary, #3b82f6)" : "var(--surface-3)",
              color: canPay ? "white" : "var(--client-text, #1a2536)",
              opacity: canPay ? 1 : 0.4,
            }}
          >
            {canPay ? (
              <Sparkles className="h-3 w-3" />
            ) : (
              <span className="text-[10px] font-bold">{globalIdx + 1}</span>
            )}
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-[14px] font-bold leading-snug">{safeStr(item.action)}</span>
            {deliverable && (
              <p className="text-[12px] leading-relaxed opacity-50">{deliverable}</p>
            )}
          </div>
        </div>

        {/* Meta row: price + deadline + priority */}
        <div className="flex flex-wrap items-center gap-2 pl-9">
          {priced && (
            <span
              className="rounded-lg px-2.5 py-1 text-[12px] font-bold tabular-nums"
              style={{
                backgroundColor: canPay ? "var(--client-primary, #3b82f6)08" : "var(--surface-3)",
                color: canPay ? "var(--client-primary, #3b82f6)" : "inherit",
              }}
            >
              {fmtCurrency(safeStr(item.price), safeStr(item.currency) || "DKK")}
            </span>
          )}
          {deadline && (
            <span className="flex items-center gap-1 text-[11px] opacity-40">
              <CalendarDays className="h-3 w-3" />
              {deadline}
            </span>
          )}
          {deadlineStatus === "at_risk" && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "#f59e0b15", color: "#f59e0b" }}>
              at risk
            </span>
          )}
          {deadlineStatus === "overdue" && (
            <span className="rounded px-1.5 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "#ef444415", color: "#ef4444" }}>
              overdue
            </span>
          )}
          {priority === "critical" && <AlertTriangle className="h-3 w-3" style={{ color: "#ef4444" }} />}
          {priority === "high" && <AlertTriangle className="h-3 w-3" style={{ color: "#f59e0b" }} />}
        </div>

        {/* Notes */}
        {notes && (
          <div className="flex gap-2 pl-9">
            <MessageSquare className="mt-0.5 h-3 w-3 shrink-0 opacity-20" />
            <p className="text-[11px] leading-relaxed opacity-40">{notes}</p>
          </div>
        )}

        {/* CTA: Pay button for the next payable step */}
        {priced && canPay && (
          <button
            onClick={() => onPay(globalIdx)}
            className="mt-1 flex items-center justify-center gap-2 rounded-xl py-3 text-[13px] font-bold text-white transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ backgroundColor: "var(--client-primary, #3b82f6)" }}
          >
            <CreditCard className="h-4 w-4" />
            {t("execution.start_step", lang, tr)}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}

        {/* Blocked: can't pay yet */}
        {priced && !isPaid(item) && !canPay && (
          <p className="mt-1 text-center text-[11px] font-medium opacity-25">
            {t("execution.pay_previous_first", lang, tr)}
          </p>
        )}

        {/* Invoice links for paid items */}
        {isPaid(item) && (item.invoice_url || item.invoice_pdf) && (
          <div className="flex items-center gap-2 pl-9">
            {item.invoice_pdf && (
              <a href={item.invoice_pdf} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-opacity active:opacity-70" style={{ backgroundColor: "var(--surface-3)" }}>
                <Download className="h-3 w-3 opacity-50" /> {t("execution.download_invoice", lang, tr)}
              </a>
            )}
            {item.invoice_url && (
              <a href={item.invoice_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-opacity active:opacity-70" style={{ backgroundColor: "var(--surface-3)" }}>
                <ExternalLink className="h-3 w-3 opacity-50" /> {t("execution.view_invoice", lang, tr)}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function FutureStep({ item, idx }: { item: ExecutionItem; idx: number }) {
  const [open, setOpen] = useState(false);
  const deliverable = safeStr(item.deliverable);
  const priced = hasPrice(item);

  return (
    <div style={{ opacity: 0.4 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left"
      >
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px]"
          style={{ borderColor: "var(--client-text, #1a2536)", opacity: 0.2 }}
        >
          <span className="text-[8px] font-bold">{idx + 1}</span>
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <span className="text-[12px] font-medium">{safeStr(item.action)}</span>
          {priced && (
            <span className="text-[11px] tabular-nums opacity-50">
              {fmtCurrency(safeStr(item.price), safeStr(item.currency) || "DKK")}
            </span>
          )}
        </div>
        <ChevronDown
          className="h-3 w-3 transition-transform duration-200"
          style={{ opacity: 0.3, transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && deliverable && (
        <div className="flex gap-2 px-4 pb-3 pl-11">
          <FileText className="mt-0.5 h-3 w-3 shrink-0 opacity-25" />
          <span className="text-[11px] leading-relaxed opacity-50">{deliverable}</span>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   MAIN EXECUTION TAB
   ══════════════════════════════════════════════ */

interface Props {
  data?: Record<string, unknown>;
  baseData?: Record<string, unknown>;
  lang: string;
  translations: Record<string, Record<string, Record<string, string>>>;
  clientId?: string;
  slug?: string;
  subscriptions?: SubscriptionRow[];
  onRefresh?: () => void;
}

export function ExecutionTab({ data, baseData, lang, translations: tr, clientId, slug, subscriptions, onRefresh }: Props) {
  const d = data as unknown as ExecutionData | undefined;
  const base = (baseData ?? data) as unknown as ExecutionData | undefined;
  const allItems = d?.execution_checklist?.items ?? [];
  const baseItems = base?.execution_checklist?.items ?? [];

  // Split items: setup (one-time) vs ongoing (monthly)
  const setupItems = useMemo(() => allItems.filter((i) => !isMonthly(i)), [allItems]);
  const ongoingItems = useMemo(() => allItems.filter((i) => isMonthly(i)), [allItems]);

  // Subscriptions
  const pendingSubs = useMemo(() => (subscriptions ?? []).filter((s) => s.status === "pending"), [subscriptions]);
  const activeSubs = useMemo(() => (subscriptions ?? []).filter((s) => s.status === "active" || s.status === "past_due"), [subscriptions]);
  const hasSubs = (subscriptions ?? []).length > 0;

  // Combine ongoing execution items + subscription count for "Growth" tab
  const growthCount = ongoingItems.length + pendingSubs.length + activeSubs.length;

  // Unpaid project items count
  const unpaidSetup = setupItems.filter((i) => hasPrice(i) && !isPaid(i)).length;

  // Default to whichever tab has pending items (conversion-first)
  const [activeTab, setActiveTab] = useState<"project" | "growth">(
    pendingSubs.length > 0 && unpaidSetup === 0 ? "growth" : "project"
  );

  // Checkout modal
  const [checkoutIdx, setCheckoutIdx] = useState<number | null>(null);

  const handlePay = useCallback((itemIndex: number) => {
    console.log("[v0] handlePay called. itemIndex:", itemIndex, "clientId:", clientId, "slug:", slug, "item:", allItems[itemIndex]?.action);
    alert(`[DEBUG] handlePay fired! itemIndex=${itemIndex}, clientId=${clientId}, slug=${slug}`);
    if (!clientId || !slug) {
      console.log("[v0] BLOCKED: missing clientId or slug");
      return;
    }
    setCheckoutIdx(itemIndex);
  }, [clientId, slug, allItems]);

  const handleCheckoutComplete = useCallback(() => {
    setCheckoutIdx(null);
    onRefresh?.();
  }, [onRefresh]);

  // Sequential gating: first unpaid one-time item
  const firstUnpaidIdx = useMemo(() => {
    for (let i = 0; i < allItems.length; i++) {
      if (!isMonthly(allItems[i]) && hasPrice(allItems[i]) && !isPaid(allItems[i])) return i;
    }
    return -1;
  }, [allItems]);

  if (!allItems.length && !hasSubs) {
    return <EmptyState lang={lang} translations={tr} />;
  }

  // If no subscriptions and no ongoing items, skip the tab toggle entirely
  const showTabs = hasSubs || ongoingItems.length > 0;

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      {/* Progress Hero -- always visible */}
      {setupItems.length > 0 && (
        <ProgressHero items={baseItems.length > 0 ? baseItems.filter((i) => !isMonthly(i)) : setupItems} lang={lang} tr={tr} />
      )}

      {/* Tab toggle -- only if there are growth services */}
      {showTabs && (
        <TabToggle
          activeTab={activeTab}
          onTabChange={setActiveTab}
          projectCount={unpaidSetup}
          servicesCount={growthCount}
          lang={lang}
          tr={tr}
        />
      )}

      {/* ── YOUR PROJECT TAB ── */}
      {(activeTab === "project" || !showTabs) && setupItems.length > 0 && (
        <div className="flex flex-col gap-2">
          {setupItems.map((item, i) => {
            const globalIdx = allItems.indexOf(item);
            const isComplete = safeStr(item.action_status).toLowerCase() === "completed" || isPaid(item);
            const canPay = hasPrice(item) && !isPaid(item) && globalIdx === firstUnpaidIdx;
            const isFuture = hasPrice(item) && !isPaid(item) && !canPay;

            if (isComplete) return <CompletedStep key={globalIdx} item={item} />;
            if (canPay || (!isFuture && !isComplete)) {
              return (
                <ActiveStepCard
                  key={globalIdx}
                  item={item}
                  globalIdx={globalIdx}
                  canPay={canPay}
                  onPay={handlePay}
                  lang={lang}
                  tr={tr}
                />
              );
            }
            return <FutureStep key={globalIdx} item={item} idx={i} />;
          })}
        </div>
      )}

      {/* ── GROWTH SERVICES TAB ── */}
      {activeTab === "growth" && showTabs && (
        <div className="flex flex-col gap-3">
          {/* Subscriptions panel */}
          {hasSubs && slug && (
            <ServicesPanel subscriptions={subscriptions!} slug={slug} lang={lang} translations={tr} onRefresh={onRefresh} />
          )}

          {/* Ongoing execution items (monthly from old system) */}
          {ongoingItems.length > 0 && (
            <div
              className="overflow-hidden"
              style={{ backgroundColor: "var(--surface-1)", borderRadius: "var(--client-radius, 0.75rem)" }}
            >
              {ongoingItems.map((item, i) => {
                const globalIdx = allItems.indexOf(item);
                const canPay = hasPrice(item) && !isPaid(item);
                return (
                  <div key={globalIdx} style={{ borderBottom: i < ongoingItems.length - 1 ? "1px solid var(--border-1)" : "none" }}>
                    <ActiveStepCard item={item} globalIdx={globalIdx} canPay={canPay} onPay={handlePay} lang={lang} tr={tr} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Checkout Modal */}
      {checkoutIdx !== null && clientId && slug && allItems[checkoutIdx] && (
        <CheckoutModal
          clientId={clientId}
          itemIndex={checkoutIdx}
          slug={slug}
          itemName={safeStr(allItems[checkoutIdx].action)}
          price={safeStr(allItems[checkoutIdx].price)}
          currency={safeStr(allItems[checkoutIdx].currency) || "DKK"}
          onClose={() => setCheckoutIdx(null)}
          onComplete={handleCheckoutComplete}
        />
      )}
    </div>
  );
}
