"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Plus, TrendingUp, Store, Globe, PenLine, X } from "lucide-react";

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
  // Use locale-aware formatting
  try {
    return new Intl.NumberFormat("da-DK", {
      style: "currency",
      currency: code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback for unknown currencies
    const symbols: Record<string, string> = { DKK: "kr", EUR: "\u20ac", USD: "$", GBP: "\u00a3", SEK: "kr", NOK: "kr" };
    return `${symbols[code] || code} ${amount.toLocaleString("da-DK")}`;
  }
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getMonthLabel(monthStr: string): string {
  const [y, m] = monthStr.split("-").map(Number);
  const date = new Date(y, m - 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function getDaysProgress(): { dayOfMonth: number; daysInMonth: number; pct: number } {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return { dayOfMonth, daysInMonth, pct: (dayOfMonth / daysInMonth) * 100 };
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
/*  Circular Progress Ring                                             */
/* ------------------------------------------------------------------ */

function ProgressRing({ pct, size = 180, stroke = 10 }: { pct: number; size?: number; stroke?: number }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedPct = Math.min(pct, 100);
  const offset = circumference - (clampedPct / 100) * circumference;

  // Color: green if on track (pct >= time pct), amber if behind, primary if no goal
  const timePct = getDaysProgress().pct;
  const color =
    pct === 0
      ? "var(--client-primary, #3b82f6)"
      : pct >= timePct
        ? "#16a34a"
        : pct >= timePct * 0.7
          ? "#f59e0b"
          : "#ef4444";

  return (
    <svg width={size} height={size} className="drop-shadow-sm">
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
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out"
        style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
      />
    </svg>
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      {/* Sheet */}
      <div
        className="relative z-10 w-full max-w-lg animate-in slide-in-from-bottom rounded-t-2xl p-5 pb-8"
        style={{ backgroundColor: "var(--surface-1, #f5f5f5)", color: "inherit" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full opacity-20" style={{ backgroundColor: "currentColor" }} />

        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-semibold">Add a sale</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 transition-colors hover:opacity-70">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Amount */}
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

          {/* Category */}
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

          {/* Note */}
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

          {/* Submit */}
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
/*  Main Sales Tab                                                      */
/* ------------------------------------------------------------------ */

export function SalesTab({ clientId, currency }: SalesTabProps) {
  const [month] = useState(getCurrentMonth);
  const [showAddSale, setShowAddSale] = useState(false);

  const { data, mutate, isLoading } = useSWR<SalesResponse>(
    `/api/sales?clientId=${clientId}&month=${month}`,
    fetcher,
    { refreshInterval: 30000 } // auto-refresh every 30s
  );

  const revenueGoal = data?.revenue_goal ?? 0;
  const totalRevenue = data?.total_revenue ?? 0;
  const progressPct = revenueGoal > 0 ? (totalRevenue / revenueGoal) * 100 : 0;
  const daysInfo = useMemo(() => getDaysProgress(), []);
  const categories = data?.categories ?? [];
  const byCategory = data?.by_category ?? [];
  const bySource = data?.by_source ?? {};

  // Determine status message
  const statusMessage = useMemo(() => {
    if (revenueGoal === 0) return "Set a monthly goal in admin to track progress";
    if (progressPct >= 100) return "Goal reached! Keep going!";
    if (progressPct >= daysInfo.pct) return "You're ahead of schedule";
    if (progressPct >= daysInfo.pct * 0.7) return "Slightly behind, but close";
    return "Time to push harder";
  }, [revenueGoal, progressPct, daysInfo.pct]);

  const handleSaleAdded = useCallback(() => {
    mutate();
  }, [mutate]);

  // Prevent body scroll when sheet is open
  useEffect(() => {
    if (showAddSale) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [showAddSale]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20">
        <div
          className="h-10 w-10 animate-spin rounded-full border-2 border-current border-t-transparent opacity-20"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      {/* ---- HERO: Big Revenue Number + Ring ---- */}
      <div
        className="relative flex flex-col items-center gap-1 rounded-2xl px-4 pb-5 pt-6"
        style={{ backgroundColor: "var(--surface-1)" }}
      >
        {/* Month label */}
        <span className="mb-2 text-xs font-medium uppercase tracking-wider opacity-40">
          {getMonthLabel(month)}
        </span>

        {/* Progress Ring with number inside */}
        <div className="relative">
          <ProgressRing pct={progressPct} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tabular-nums" style={{ fontFamily: "var(--font-heading, inherit)" }}>
              {formatCurrency(totalRevenue, currency)}
            </span>
            {revenueGoal > 0 && (
              <span className="text-xs opacity-40">
                of {formatCurrency(revenueGoal, currency)}
              </span>
            )}
          </div>
        </div>

        {/* Status message */}
        <p className="mt-2 text-center text-xs font-medium opacity-50">
          {statusMessage}
        </p>

        {/* Time progress bar (subtle) */}
        {revenueGoal > 0 && (
          <div className="mt-3 w-full max-w-[200px]">
            <div className="flex items-center justify-between text-[10px] opacity-30">
              <span>Day {daysInfo.dayOfMonth}</span>
              <span>{daysInfo.daysInMonth} days</span>
            </div>
            <div className="mt-0.5 h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--surface-3)" }}>
              <div
                className="h-full rounded-full opacity-30 transition-all"
                style={{ width: `${daysInfo.pct}%`, backgroundColor: "currentColor" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ---- ADD SALE BUTTON ---- */}
      <button
        onClick={() => setShowAddSale(true)}
        className="flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all hover:brightness-110 active:scale-[0.98]"
        style={{ backgroundColor: "var(--client-primary, #3b82f6)" }}
      >
        <Plus className="h-4 w-4" />
        Add a sale
      </button>

      {/* ---- CATEGORY BREAKDOWN ---- */}
      {byCategory.length > 0 && (
        <div
          className="flex flex-col gap-3 rounded-2xl p-4"
          style={{ backgroundColor: "var(--surface-1)" }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider opacity-40">What's selling</h3>
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
            <p className="text-sm font-medium opacity-60">No sales recorded yet this month</p>
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
