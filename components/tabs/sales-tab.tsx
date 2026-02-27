"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { Plus, TrendingUp, Store, Globe, PenLine, X, ChevronLeft, ChevronRight } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface CategoryBreakdown {
  name: string;
  total: number;
  count: number;
}

interface SalesResponse {
  month: string;
  revenue_goal: number;
  total_revenue: number;
  categories: { id: string; name: string; sort_order: number }[];
  by_category: CategoryBreakdown[];
  by_source: Record<string, number>;
  entries: unknown[];
  entry_count: number;
}

interface SalesTabProps {
  data: unknown;
  lang: string;
  translations: Record<string, Record<string, Record<string, string>>>;
  clientId: string;
  currency: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatCurrency(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  try {
    return new Intl.NumberFormat("da-DK", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    const symbols: Record<string, string> = { DKK: "kr", EUR: "\u20ac", USD: "$", GBP: "\u00a3", SEK: "kr", NOK: "kr" };
    return `${symbols[code] || code} ${amount.toLocaleString("da-DK")}`;
  }
}

/** Compact format for large numbers inside the ring: 1.2M, 450K, etc. */
function formatCompact(amount: number, currency: string): string {
  const code = currency.toUpperCase();
  const sym: Record<string, string> = { DKK: "kr ", EUR: "\u20ac", USD: "$", GBP: "\u00a3", SEK: "kr ", NOK: "kr " };
  const prefix = sym[code] || `${code} `;
  if (amount >= 1_000_000) return `${prefix}${(amount / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (amount >= 100_000) return `${prefix}${Math.round(amount / 1000)}K`;
  if (amount >= 10_000) return `${prefix}${(amount / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${prefix}${amount.toLocaleString("da-DK")}`;
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function shiftMonth(monthStr: string, delta: number): string {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(monthStr: string, lang: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  const d = new Date(y, m - 1);
  const locale = lang === "da" ? "da-DK" : lang === "de" ? "de-DE" : lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-US";
  return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
}

function isCurrentMonth(monthStr: string): boolean {
  return monthStr === getCurrentMonth();
}

function getDaysProgress(): { dayOfMonth: number; daysInMonth: number; pct: number } {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return { dayOfMonth, daysInMonth, pct: (dayOfMonth / daysInMonth) * 100 };
}

/** Returns a hsl color string based on how well revenue tracks against time. */
function getPaceColor(revenuePct: number, timePct: number): string {
  if (revenuePct === 0 && timePct === 0) return "var(--client-primary, #3b82f6)";
  const ratio = timePct > 0 ? revenuePct / timePct : revenuePct > 0 ? 2 : 0;
  // ratio >= 1.0 = on track (green), 0.7-1.0 = slightly behind (amber), < 0.7 = behind (red)
  if (ratio >= 1.0) return "#22c55e";
  if (ratio >= 0.7) return "#f59e0b";
  return "#ef4444";
}

/** Returns a softer bg tint from the pace color for the ring background. */
function getPaceBg(revenuePct: number, timePct: number): string {
  const ratio = timePct > 0 ? revenuePct / timePct : revenuePct > 0 ? 2 : 0;
  if (ratio >= 1.0) return "rgba(34,197,94,0.08)";
  if (ratio >= 0.7) return "rgba(245,158,11,0.08)";
  return "rgba(239,68,68,0.06)";
}

const SOURCE_ICONS: Record<string, typeof Globe> = {
  online: Globe,
  offline: Store,
  manual: PenLine,
};

const SOURCE_LABELS: Record<string, string> = {
  online: "Online",
  offline: "Offline",
  manual: "Manual",
};

/* ------------------------------------------------------------------ */
/*  Circular Progress Ring with conditional gradient                    */
/* ------------------------------------------------------------------ */

function ProgressRing({
  pct,
  color,
  size = 200,
  stroke = 12,
  children,
}: {
  pct: number;
  color: string;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(Math.max(pct, 0), 100);
  const offset = circumference - (clampedPct / 100) * circumference;
  const gradientId = `ring-grad-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="drop-shadow-sm">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          className="opacity-[0.06]"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Sale Sheet                                                      */
/* ------------------------------------------------------------------ */

function AddSaleSheet({
  clientId,
  currency,
  categories,
  onClose,
  onAdded,
}: {
  clientId: string;
  currency: string;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onAdded: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0]?.name || "Other");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!amount || Number(amount) <= 0) return;
    setSaving(true);
    try {
      await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          categoryName: category,
          amount: Number(amount),
          currency,
          source: "manual",
          note: note || null,
        }),
      });
      onAdded();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative z-10 w-full max-w-lg animate-in slide-in-from-bottom rounded-t-2xl p-5 pb-8"
        style={{ backgroundColor: "var(--surface-1, #f5f5f5)", color: "inherit" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full opacity-20" style={{ backgroundColor: "currentColor" }} />
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-semibold">Add a sale</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:opacity-70">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium opacity-50">Amount ({currency})</label>
            <input
              type="number"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              autoFocus
              className="w-full rounded-xl border px-4 py-3 text-2xl font-bold tabular-nums outline-none transition-colors focus:ring-2"
              style={{
                backgroundColor: "var(--surface-2, #eee)",
                borderColor: "var(--border-1, #ddd)",
                color: "inherit",
              }}
            />
          </div>
          {categories.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium opacity-50">Category</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setCategory(cat.name)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                    style={{
                      backgroundColor: category === cat.name ? "var(--client-primary, #3b82f6)" : "var(--surface-2, #eee)",
                      color: category === cat.name ? "#fff" : "inherit",
                      opacity: category === cat.name ? 1 : 0.6,
                    }}
                  >
                    {cat.name}
                  </button>
                ))}
                <button
                  onClick={() => setCategory("Other")}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    backgroundColor: category === "Other" ? "var(--client-primary, #3b82f6)" : "var(--surface-2, #eee)",
                    color: category === "Other" ? "#fff" : "inherit",
                    opacity: category === "Other" ? 1 : 0.6,
                  }}
                >
                  Other
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium opacity-50">Note (optional)</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Trade show sale, walk-in..."
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors focus:ring-2"
              style={{
                backgroundColor: "var(--surface-2, #eee)",
                borderColor: "var(--border-1, #ddd)",
                color: "inherit",
              }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!amount || Number(amount) <= 0 || saving}
            className="mt-1 w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30"
            style={{ backgroundColor: "var(--client-primary, #3b82f6)" }}
          >
            {saving ? "Saving..." : `Add ${amount ? formatCurrency(Number(amount), currency) : "sale"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Month Hero Card (swipeable)                                        */
/* ------------------------------------------------------------------ */

function MonthHero({
  month,
  data,
  currency,
  lang,
  onPrev,
  onNext,
  canGoNext,
}: {
  month: string;
  data: SalesResponse | undefined;
  currency: string;
  lang: string;
  onPrev: () => void;
  onNext: () => void;
  canGoNext: boolean;
}) {
  const revenueGoal = data?.revenue_goal ?? 0;
  const totalRevenue = data?.total_revenue ?? 0;
  const progressPct = revenueGoal > 0 ? (totalRevenue / revenueGoal) * 100 : 0;

  const isCurrent = isCurrentMonth(month);
  const daysInfo = useMemo(() => getDaysProgress(), []);
  const timePct = isCurrent ? daysInfo.pct : 100; // past months use 100%

  const paceColor = revenueGoal > 0 ? getPaceColor(progressPct, timePct) : "var(--client-primary, #3b82f6)";
  const paceBg = revenueGoal > 0 ? getPaceBg(progressPct, timePct) : "transparent";

  const statusMessage = useMemo(() => {
    if (!isCurrent) {
      if (revenueGoal === 0) return `${formatCurrency(totalRevenue, currency)} total`;
      return progressPct >= 100 ? "Goal reached!" : `${Math.round(progressPct)}% of goal`;
    }
    if (revenueGoal === 0) return "Set a monthly goal to track progress";
    if (progressPct >= 100) return "Goal reached! Keep going!";
    const ratio = timePct > 0 ? progressPct / timePct : 0;
    if (ratio >= 1.0) return "You're ahead of schedule";
    if (ratio >= 0.7) return "Slightly behind, but close";
    return "Time to push harder";
  }, [isCurrent, revenueGoal, totalRevenue, progressPct, timePct, currency]);

  // Swipe support
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 60) onPrev();
    else if (dx < -60 && canGoNext) onNext();
  };

  return (
    <div
      className="relative flex flex-col items-center gap-1 rounded-2xl px-4 pb-5 pt-4"
      style={{ backgroundColor: "var(--surface-1)", transition: "background-color 0.3s" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Month nav */}
      <div className="mb-2 flex w-full items-center justify-between">
        <button
          onClick={onPrev}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:opacity-70"
          style={{ backgroundColor: "var(--surface-2)" }}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-xs font-semibold uppercase tracking-wider opacity-50">
          {getMonthLabel(month, lang)}
        </span>
        <button
          onClick={onNext}
          disabled={!canGoNext}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:opacity-70 disabled:opacity-15"
          style={{ backgroundColor: "var(--surface-2)" }}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Progress Ring with revenue inside */}
      <div
        className="flex items-center justify-center rounded-full p-2 transition-colors duration-700"
        style={{ backgroundColor: paceBg }}
      >
        <ProgressRing pct={progressPct} color={paceColor} size={190} stroke={12}>
          <span
            className="text-center text-2xl font-bold tabular-nums leading-tight"
            style={{ maxWidth: 130 }}
          >
            {formatCompact(totalRevenue, currency)}
          </span>
          {revenueGoal > 0 && (
            <span className="mt-0.5 text-center text-[11px] opacity-40">
              of {formatCompact(revenueGoal, currency)}
            </span>
          )}
        </ProgressRing>
      </div>

      {/* Status line */}
      <p
        className="mt-1 text-center text-xs font-semibold"
        style={{ color: revenueGoal > 0 ? paceColor : "inherit", opacity: revenueGoal > 0 ? 0.9 : 0.4 }}
      >
        {statusMessage}
      </p>

      {/* Day progress (only current month) */}
      {isCurrent && revenueGoal > 0 && (
        <div className="mt-2 w-full max-w-[200px]">
          <div className="flex items-center justify-between text-[10px] opacity-30">
            <span>Day {daysInfo.dayOfMonth}</span>
            <span>{daysInfo.daysInMonth} days</span>
          </div>
          <div className="mt-0.5 h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--surface-3)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${daysInfo.pct}%`, backgroundColor: paceColor, opacity: 0.35 }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Sales Tab                                                      */
/* ------------------------------------------------------------------ */

export function SalesTab({ clientId, currency, lang }: SalesTabProps) {
  const [month, setMonth] = useState(getCurrentMonth);
  const [showAddSale, setShowAddSale] = useState(false);

  const { data, mutate, isLoading } = useSWR<SalesResponse>(
    `/api/sales?clientId=${clientId}&month=${month}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  const categories = data?.categories ?? [];
  const byCategory = data?.by_category ?? [];
  const bySource = data?.by_source ?? {};
  const totalRevenue = data?.total_revenue ?? 0;

  const canGoNext = !isCurrentMonth(month);

  const handlePrev = useCallback(() => setMonth((m) => shiftMonth(m, -1)), []);
  const handleNext = useCallback(() => {
    setMonth((m) => {
      const next = shiftMonth(m, 1);
      return next <= getCurrentMonth() ? next : m;
    });
  }, []);

  const handleSaleAdded = useCallback(() => { mutate(); }, [mutate]);

  useEffect(() => {
    if (showAddSale) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [showAddSale]);

  if (isLoading && !data) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-current border-t-transparent opacity-20" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      {/* ---- HERO: Swipeable Month Card ---- */}
      <MonthHero
        month={month}
        data={data}
        currency={currency}
        lang={lang}
        onPrev={handlePrev}
        onNext={handleNext}
        canGoNext={canGoNext}
      />

      {/* ---- ADD SALE BUTTON (only current month) ---- */}
      {isCurrentMonth(month) && (
        <button
          onClick={() => setShowAddSale(true)}
          className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
          style={{ backgroundColor: "var(--client-primary, #3b82f6)" }}
        >
          <Plus className="h-4 w-4" />
          Add a sale
        </button>
      )}

      {/* ---- CATEGORY BREAKDOWN ---- */}
      {byCategory.length > 0 && (
        <div
          className="flex flex-col gap-3 rounded-2xl p-4"
          style={{ backgroundColor: "var(--surface-1)" }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider opacity-40">{"What\u2019s selling"}</h3>
          <div className="flex flex-col gap-2.5">
            {byCategory.map((cat) => {
              const catPct = totalRevenue > 0 ? (cat.total / totalRevenue) * 100 : 0;
              return (
                <div key={cat.name}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium">{cat.name}</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(cat.total, currency)}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--surface-3)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${catPct}%`,
                        backgroundColor: "var(--client-primary, #3b82f6)",
                        opacity: 0.7,
                      }}
                    />
                  </div>
                  <span className="mt-0.5 text-[10px] opacity-30">{cat.count} sale{cat.count !== 1 ? "s" : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- SOURCE BREAKDOWN ---- */}
      {Object.keys(bySource).length > 0 && (
        <div
          className="flex flex-col gap-3 rounded-2xl p-4"
          style={{ backgroundColor: "var(--surface-1)" }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider opacity-40">Where sales come from</h3>
          <div className="flex flex-col gap-2">
            {Object.entries(bySource)
              .sort(([, a], [, b]) => b - a)
              .map(([source, amount]) => {
                const Icon = SOURCE_ICONS[source] || Globe;
                return (
                  <div key={source} className="flex items-center gap-3">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-lg"
                      style={{ backgroundColor: "var(--surface-2)" }}
                    >
                      <Icon className="h-4 w-4 opacity-50" />
                    </div>
                    <span className="flex-1 text-sm">{SOURCE_LABELS[source] || source}</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {formatCurrency(amount, currency)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ---- EMPTY STATE ---- */}
      {byCategory.length === 0 && !isLoading && (
        <div
          className="flex flex-col items-center gap-3 rounded-2xl px-4 py-10 text-center"
          style={{ backgroundColor: "var(--surface-1)" }}
        >
          <TrendingUp className="h-8 w-8 opacity-20" />
          <div>
            <p className="text-sm font-medium opacity-60">No sales recorded this month</p>
            <p className="mt-0.5 text-xs opacity-30">Tap "Add a sale" to log your first one</p>
          </div>
        </div>
      )}

      {/* ---- ADD SALE SHEET ---- */}
      {showAddSale && (
        <AddSaleSheet
          clientId={clientId}
          currency={currency}
          categories={categories}
          onClose={() => setShowAddSale(false)}
          onAdded={handleSaleAdded}
        />
      )}
    </div>
  );
}
