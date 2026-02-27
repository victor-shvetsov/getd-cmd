"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  Plus,
  Store,
  Globe,
  PenLine,
  X,
  ChevronLeft,
  ChevronRight,
  Tag,
  Users,
  Footprints,
  UserPlus,
  Check,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SaleEntry {
  id: string;
  amount: number;
  category_name: string;
  customer_name: string | null;
  description: string | null;
  external_ref: string | null;
  source: string | null;
  sold_at: string;
}

interface CategoryBreakdown {
  name: string;
  total: number;
  count: number;
}

interface SalesResponse {
  month: string;
  revenue_goal: number;
  total_revenue: number;
  untagged_count: number;
  product_categories: { id: string; name: string; sort_order: number }[];
  by_category: CategoryBreakdown[];
  by_source: Record<string, number>;
  entries: SaleEntry[];
  entry_count: number;
}

interface SalesTabProps {
  data: unknown;
  lang: string;
  translations?: Record<string, unknown>;
  clientId: string;
  currency: string;
}

/* ------------------------------------------------------------------ */
/*  Source tag config                                                   */
/* ------------------------------------------------------------------ */
const SOURCE_TAGS = [
  { key: "online", label: "Online", icon: Globe, color: "#3b82f6" },
  { key: "networking", label: "Networking", icon: Users, color: "#8b5cf6" },
  { key: "walk_in", label: "Walk-in", icon: Footprints, color: "#f59e0b" },
  { key: "referral", label: "Referral", icon: UserPlus, color: "#10b981" },
  { key: "trade_show", label: "Trade show", icon: Store, color: "#ec4899" },
  { key: "manual", label: "Manual", icon: PenLine, color: "#6b7280" },
] as const;

function getSourceConfig(key: string | null) {
  return SOURCE_TAGS.find((s) => s.key === key) ?? null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function fmtCurrency(amount: number, currency: string): string {
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

function fmtCompact(amount: number, currency: string): string {
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

function getPaceColor(revenuePct: number, timePct: number): string {
  if (revenuePct === 0 && timePct === 0) return "var(--client-primary, #3b82f6)";
  const ratio = timePct > 0 ? revenuePct / timePct : revenuePct > 0 ? 2 : 0;
  if (ratio >= 1.0) return "#22c55e";
  if (ratio >= 0.7) return "#f59e0b";
  return "#ef4444";
}

function getPaceBg(revenuePct: number, timePct: number): string {
  const ratio = timePct > 0 ? revenuePct / timePct : revenuePct > 0 ? 2 : 0;
  if (ratio >= 1.0) return "rgba(34,197,94,0.08)";
  if (ratio >= 0.7) return "rgba(245,158,11,0.08)";
  return "rgba(239,68,68,0.06)";
}

/* ------------------------------------------------------------------ */
/*  Progress Ring                                                      */
/* ------------------------------------------------------------------ */

function ProgressRing({
  pct,
  color,
  size = 190,
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
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke="currentColor" strokeWidth={stroke}
          className="opacity-[0.06]"
        />
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none" stroke={`url(#${gradientId})`}
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Tag Picker                                                         */
/* ------------------------------------------------------------------ */

function TagPicker({
  onSelect,
  onClose,
}: {
  onSelect: (source: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="flex flex-wrap gap-1.5 rounded-xl p-2"
      style={{ backgroundColor: "var(--surface-2, #f5f5f5)", border: "1px solid var(--border-1, #e5e7eb)" }}
    >
      {SOURCE_TAGS.filter((t) => t.key !== "manual").map((tag) => {
        const Icon = tag.icon;
        return (
          <button
            key={tag.key}
            onClick={() => onSelect(tag.key)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: `${tag.color}18`, color: tag.color }}
          >
            <Icon className="h-3 w-3" />
            {tag.label}
          </button>
        );
      })}
      <button
        onClick={onClose}
        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs opacity-40 hover:opacity-70"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sale Row                                                           */
/* ------------------------------------------------------------------ */

function SaleRow({
  entry,
  currency,
  onTag,
}: {
  entry: SaleEntry;
  currency: string;
  onTag: (id: string, source: string) => void;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [justTagged, setJustTagged] = useState(false);
  const isUntagged = !entry.source;
  const src = getSourceConfig(entry.source);
  const Icon = src?.icon ?? Tag;

  const dateStr = new Date(entry.sold_at).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
  });

  const handleSelect = (source: string) => {
    onTag(entry.id, source);
    setShowPicker(false);
    setJustTagged(true);
    setTimeout(() => setJustTagged(false), 1500);
  };

  return (
    <div
      className="flex flex-col gap-2 rounded-xl p-3 transition-all duration-300"
      style={{
        backgroundColor: justTagged
          ? "rgba(34,197,94,0.06)"
          : isUntagged
            ? "var(--client-primary, #3b82f6)05"
            : "var(--surface-1, #fafafa)",
        border: isUntagged
          ? "1px dashed var(--client-primary, #3b82f6)35"
          : justTagged
            ? "1px solid rgba(34,197,94,0.2)"
            : "1px solid var(--border-1, #e5e7eb)20",
      }}
    >
      {/* Top row: info + amount */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="text-sm font-semibold truncate" style={{ color: "var(--text-1)" }}>
            {entry.customer_name || entry.category_name}
          </span>
          <span className="text-xs opacity-40 truncate">
            {entry.description || entry.category_name}
            {entry.external_ref && (
              <span className="ml-1.5 opacity-60">{entry.external_ref}</span>
            )}
          </span>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <span className="text-sm font-bold tabular-nums" style={{ color: "var(--text-1)" }}>
            {fmtCurrency(entry.amount, currency)}
          </span>
          <span className="text-[10px] opacity-30">{dateStr}</span>
        </div>
      </div>

      {/* Source tag / picker */}
      {showPicker ? (
        <TagPicker onSelect={handleSelect} onClose={() => setShowPicker(false)} />
      ) : justTagged ? (
        <span className="flex items-center gap-1 self-start text-xs font-medium" style={{ color: "#22c55e" }}>
          <Check className="h-3 w-3" /> Tagged
        </span>
      ) : (
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-xs font-medium transition-all hover:scale-105 active:scale-95"
          style={
            isUntagged
              ? {
                  backgroundColor: "var(--client-primary, #3b82f6)12",
                  color: "var(--client-primary, #3b82f6)",
                  border: "1px dashed var(--client-primary, #3b82f6)40",
                }
              : {
                  backgroundColor: `${src?.color || "#6b7280"}12`,
                  color: src?.color || "#6b7280",
                }
          }
        >
          <Icon className="h-3 w-3" />
          {isUntagged ? "Tag this sale" : src?.label || entry.source}
          {!isUntagged && <PenLine className="h-2.5 w-2.5 opacity-40" />}
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Add Sale Sheet                                                     */
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
  const [customerName, setCustomerName] = useState("");
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
          customerName: customerName || null,
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
        style={{ backgroundColor: "var(--surface-1, #fff)", color: "inherit" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full opacity-20" style={{ backgroundColor: "currentColor" }} />
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-semibold">Add a sale</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:opacity-70"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium opacity-50">Amount ({currency})</label>
            <input
              type="number" inputMode="numeric" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0" autoFocus
              className="w-full rounded-xl border px-4 py-3 text-2xl font-bold tabular-nums outline-none focus:ring-2"
              style={{ backgroundColor: "var(--surface-2, #eee)", borderColor: "var(--border-1, #ddd)", color: "inherit" }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium opacity-50">Customer name (optional)</label>
            <input
              type="text" value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Name..."
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2"
              style={{ backgroundColor: "var(--surface-2, #eee)", borderColor: "var(--border-1, #ddd)", color: "inherit" }}
            />
          </div>
          {categories.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium opacity-50">Category</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id} onClick={() => setCategory(cat.name)}
                    className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                    style={{
                      backgroundColor: category === cat.name ? "var(--client-primary, #3b82f6)" : "var(--surface-2, #eee)",
                      color: category === cat.name ? "#fff" : "inherit",
                      opacity: category === cat.name ? 1 : 0.6,
                    }}
                  >{cat.name}</button>
                ))}
                <button
                  onClick={() => setCategory("Other")}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    backgroundColor: category === "Other" ? "var(--client-primary, #3b82f6)" : "var(--surface-2, #eee)",
                    color: category === "Other" ? "#fff" : "inherit",
                    opacity: category === "Other" ? 1 : 0.6,
                  }}
                >Other</button>
              </div>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium opacity-50">Note (optional)</label>
            <input
              type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Trade show sale, walk-in..."
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2"
              style={{ backgroundColor: "var(--surface-2, #eee)", borderColor: "var(--border-1, #ddd)", color: "inherit" }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!amount || Number(amount) <= 0 || saving}
            className="mt-1 w-full rounded-xl py-3.5 text-sm font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30"
            style={{ backgroundColor: "var(--client-primary, #3b82f6)" }}
          >
            {saving ? "Saving..." : `Add ${amount ? fmtCurrency(Number(amount), currency) : "sale"}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Sales Tab                                                     */
/* ------------------------------------------------------------------ */

export function SalesTab({ clientId, currency, lang }: SalesTabProps) {
  const [month, setMonth] = useState(getCurrentMonth);
  const [showAddSale, setShowAddSale] = useState(false);

  const { data, mutate, isLoading } = useSWR<SalesResponse>(
    `/api/sales?clientId=${clientId}&month=${month}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  const canGoNext = !isCurrentMonth(month);

  const handlePrev = useCallback(() => setMonth((m) => shiftMonth(m, -1)), []);
  const handleNext = useCallback(() => {
    setMonth((m) => {
      const next = shiftMonth(m, 1);
      return next <= getCurrentMonth() ? next : m;
    });
  }, []);

  const handleTag = useCallback(
    async (id: string, source: string) => {
      // Optimistic update
      if (data) {
        mutate(
          {
            ...data,
            untagged_count: Math.max(0, data.untagged_count - 1),
            entries: data.entries.map((e) => (e.id === id ? { ...e, source } : e)),
          },
          false
        );
      }
      await fetch("/api/sales", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, source }),
      });
      mutate();
    },
    [data, mutate]
  );

  const handleSaleAdded = useCallback(() => mutate(), [mutate]);

  useEffect(() => {
    if (showAddSale) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [showAddSale]);

  // Pace calculations
  const revenueGoal = data?.revenue_goal ?? 0;
  const totalRevenue = data?.total_revenue ?? 0;
  const progressPct = revenueGoal > 0 ? (totalRevenue / revenueGoal) * 100 : 0;
  const isCurrent = isCurrentMonth(month);
  const daysInfo = useMemo(() => getDaysProgress(), []);
  const timePct = isCurrent ? daysInfo.pct : 100;
  const paceColor = revenueGoal > 0 ? getPaceColor(progressPct, timePct) : "var(--client-primary, #3b82f6)";
  const paceBg = revenueGoal > 0 ? getPaceBg(progressPct, timePct) : "transparent";

  const statusMessage = useMemo(() => {
    if (!isCurrent) {
      if (revenueGoal === 0) return `${fmtCurrency(totalRevenue, currency)} total`;
      return progressPct >= 100 ? "Goal reached!" : `${Math.round(progressPct)}% of goal`;
    }
    if (revenueGoal === 0) return "";
    if (progressPct >= 100) return "Goal reached! Keep going!";
    const ratio = timePct > 0 ? progressPct / timePct : 0;
    if (ratio >= 1.0) return "Ahead of schedule";
    if (ratio >= 0.7) return "Slightly behind, but close";
    return "Time to push harder";
  }, [isCurrent, revenueGoal, totalRevenue, progressPct, timePct, currency]);

  // Split entries
  const untaggedEntries = useMemo(() => data?.entries.filter((e) => !e.source) ?? [], [data]);
  const taggedEntries = useMemo(() => data?.entries.filter((e) => !!e.source) ?? [], [data]);
  const byCategory = data?.by_category ?? [];
  const bySource = data?.by_source ?? {};
  const categories = data?.product_categories ?? [];

  // Swipe
  const touchStartX = useRef(0);
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (dx > 60) handlePrev();
    else if (dx < -60 && canGoNext) handleNext();
  };

  if (isLoading && !data) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-current border-t-transparent opacity-20" />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-4 px-4 py-5 pb-24"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* ---- HERO: Revenue Ring ---- */}
      <div
        className="relative flex flex-col items-center gap-1 rounded-2xl px-4 pb-5 pt-4"
        style={{ backgroundColor: "var(--surface-1)", transition: "background-color 0.3s" }}
      >
        {/* Month nav */}
        <div className="mb-2 flex w-full items-center justify-between">
          <button
            onClick={handlePrev}
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
            onClick={handleNext}
            disabled={!canGoNext}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:opacity-70 disabled:opacity-15"
            style={{ backgroundColor: "var(--surface-2)" }}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Ring */}
        <div
          className="flex items-center justify-center rounded-full p-2 transition-colors duration-700"
          style={{ backgroundColor: paceBg }}
        >
          <ProgressRing pct={progressPct} color={paceColor} size={190} stroke={12}>
            <span className="text-center text-2xl font-bold tabular-nums leading-tight" style={{ maxWidth: 130 }}>
              {fmtCompact(totalRevenue, currency)}
            </span>
            {revenueGoal > 0 && (
              <span className="mt-0.5 text-center text-[11px] opacity-40">
                of {fmtCompact(revenueGoal, currency)}
              </span>
            )}
          </ProgressRing>
        </div>

        {/* Status */}
        {statusMessage && (
          <p
            className="mt-1 text-center text-xs font-semibold"
            style={{ color: revenueGoal > 0 ? paceColor : "inherit", opacity: revenueGoal > 0 ? 0.9 : 0.4 }}
          >
            {statusMessage}
          </p>
        )}

        {/* Day progress */}
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

      {/* ---- UNTAGGED BANNER ---- */}
      {(data?.untagged_count ?? 0) > 0 && (
        <div
          className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5"
          style={{
            backgroundColor: "var(--client-primary, #3b82f6)08",
            border: "1px solid var(--client-primary, #3b82f6)18",
          }}
        >
          <Tag className="h-4 w-4 shrink-0" style={{ color: "var(--client-primary, #3b82f6)" }} />
          <span className="text-xs" style={{ color: "var(--client-primary, #3b82f6)" }}>
            <strong>{data!.untagged_count}</strong>{" "}
            {data!.untagged_count === 1 ? "invoice needs" : "invoices need"} tagging
          </span>
        </div>
      )}

      {/* ---- UNTAGGED TRANSACTIONS ---- */}
      {untaggedEntries.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">Needs tagging</span>
          {untaggedEntries.map((entry) => (
            <SaleRow key={entry.id} entry={entry} currency={currency} onTag={handleTag} />
          ))}
        </div>
      )}

      {/* ---- CATEGORY BREAKDOWN ---- */}
      {byCategory.length > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl p-4" style={{ backgroundColor: "var(--surface-1)" }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider opacity-40">{"What\u2019s selling"}</h3>
          <div className="flex flex-col gap-2.5">
            {byCategory.map((cat) => {
              const catPct = totalRevenue > 0 ? (cat.total / totalRevenue) * 100 : 0;
              return (
                <div key={cat.name} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium opacity-70">{cat.name}</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xs font-bold tabular-nums">{fmtCurrency(cat.total, currency)}</span>
                      <span className="text-[10px] opacity-30">{cat.count}x</span>
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: "var(--surface-3, #eee)" }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${catPct}%`, backgroundColor: "var(--client-primary, #3b82f6)", opacity: 0.55 }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- SOURCE BREAKDOWN ---- */}
      {Object.keys(bySource).filter((k) => k !== "untagged").length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">Where sales come from</span>
          <div className="flex flex-wrap gap-2">
            {Object.entries(bySource)
              .filter(([k]) => k !== "untagged")
              .sort(([, a], [, b]) => b - a)
              .map(([src, amount]) => {
                const cfg = getSourceConfig(src);
                const SrcIcon = cfg?.icon ?? Tag;
                return (
                  <div
                    key={src}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                    style={{ backgroundColor: `${cfg?.color || "#6b7280"}12` }}
                  >
                    <SrcIcon className="h-3 w-3" style={{ color: cfg?.color || "#6b7280" }} />
                    <span className="text-xs font-medium" style={{ color: cfg?.color || "#6b7280" }}>{cfg?.label || src}</span>
                    <span className="text-xs font-bold tabular-nums" style={{ color: cfg?.color || "#6b7280" }}>
                      {fmtCurrency(amount, currency)}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ---- ALL TAGGED TRANSACTIONS ---- */}
      {taggedEntries.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">All transactions</span>
          {taggedEntries.map((entry) => (
            <SaleRow key={entry.id} entry={entry} currency={currency} onTag={handleTag} />
          ))}
        </div>
      )}

      {/* ---- EMPTY STATE ---- */}
      {data && data.entry_count === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 opacity-30">
          <Store className="h-8 w-8" />
          <span className="text-sm">No sales this month</span>
        </div>
      )}

      {/* ---- ADD SALE FAB (current month only) ---- */}
      {isCurrent && (
        <button
          onClick={() => setShowAddSale(true)}
          className="fixed bottom-24 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition-all hover:scale-110 active:scale-95"
          style={{ backgroundColor: "var(--client-primary, #3b82f6)" }}
          aria-label="Add a sale"
        >
          <Plus className="h-5 w-5" />
        </button>
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
