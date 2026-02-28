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
  ExternalLink,
} from "lucide-react";
import { t } from "@/lib/i18n";

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
/*  Radius helpers                                                     */
/* ------------------------------------------------------------------ */

const R = "var(--client-radius, 0.75rem)";
const R_SM = "calc(var(--client-radius, 0.75rem) * 0.65)";

/* ------------------------------------------------------------------ */
/*  Source tag config (labels resolved at render time via i18n)         */
/* ------------------------------------------------------------------ */
const SOURCE_TAG_KEYS = [
  { key: "online", i18nKey: "source_online", icon: Globe, color: "#3b82f6" },
  { key: "networking", i18nKey: "source_networking", icon: Users, color: "#8b5cf6" },
  { key: "walk_in", i18nKey: "source_walk_in", icon: Footprints, color: "#f59e0b" },
  { key: "referral", i18nKey: "source_referral", icon: UserPlus, color: "#10b981" },
  { key: "trade_show", i18nKey: "source_trade_show", icon: Store, color: "#ec4899" },
  { key: "manual", i18nKey: "source_manual", icon: PenLine, color: "#6b7280" },
] as const;

function getSourceConfig(key: string | null) {
  return SOURCE_TAG_KEYS.find((s) => s.key === key) ?? null;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

type Tx = Record<string, unknown>;
const fetcher = (url: string) => fetch(url).then((r) => r.json());

function s(key: string, lang: string, translations: Tx, fallback: string): string {
  return t(`sales.${key}`, lang, translations as Record<string, Record<string, Record<string, string>>>) || fallback;
}

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
  const locale = lang === "da" ? "da-DK" : lang === "de" ? "de-DE" : lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : lang === "ro" ? "ro-RO" : lang === "ru" ? "ru-RU" : "en-US";
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
  lang,
  translations,
}: {
  onSelect: (source: string) => void;
  onClose: () => void;
  lang: string;
  translations: Tx;
}) {
  return (
    <div
      className="flex flex-wrap gap-1.5 p-2"
      style={{ backgroundColor: "var(--surface-2, #f5f5f5)", border: "1px solid var(--border-1, #e5e7eb)", borderRadius: R_SM }}
    >
      {SOURCE_TAG_KEYS.filter((t) => t.key !== "manual").map((tag) => {
        const Icon = tag.icon;
        return (
          <button
            key={tag.key}
            onClick={() => onSelect(tag.key)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-all hover:scale-105 active:scale-95"
            style={{ backgroundColor: `${tag.color}18`, color: tag.color, borderRadius: R_SM }}
          >
            <Icon className="h-3 w-3" />
            {s(tag.i18nKey, lang, translations, tag.key)}
          </button>
        );
      })}
      <button
        onClick={onClose}
        className="flex items-center gap-1 px-2 py-1.5 text-xs opacity-40 hover:opacity-70"
        style={{ borderRadius: R_SM }}
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
  lang,
  translations,
}: {
  entry: SaleEntry;
  currency: string;
  onTag: (id: string, source: string) => void;
  lang: string;
  translations: Tx;
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [justTagged, setJustTagged] = useState(false);
  const isUntagged = !entry.source;
  const src = getSourceConfig(entry.source);
  const Icon = src?.icon ?? Tag;

  const locale = lang === "da" ? "da-DK" : lang === "de" ? "de-DE" : lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : lang === "ro" ? "ro-RO" : lang === "ru" ? "ru-RU" : "en-US";
  const dateStr = new Date(entry.sold_at).toLocaleDateString(locale, {
    day: "numeric",
    month: "short",
  });

  const handleSelect = (source: string) => {
    onTag(entry.id, source);
    setShowPicker(false);
    setJustTagged(true);
    setTimeout(() => setJustTagged(false), 1500);
  };

  const sourceLabel = src ? s(src.i18nKey, lang, translations, src.key) : entry.source;

  return (
    <div
      className="flex flex-col gap-2 p-3 transition-all duration-300"
      style={{
        borderRadius: R_SM,
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
        <TagPicker onSelect={handleSelect} onClose={() => setShowPicker(false)} lang={lang} translations={translations} />
      ) : justTagged ? (
        <span className="flex items-center gap-1 self-start text-xs font-medium" style={{ color: "#22c55e" }}>
          <Check className="h-3 w-3" /> {s("tagged", lang, translations, "Tagged")}
        </span>
      ) : (
        <button
          onClick={() => setShowPicker(true)}
          className="flex items-center gap-1.5 self-start px-2 py-1 text-xs font-medium transition-all hover:scale-105 active:scale-95"
          style={{
            borderRadius: R_SM,
            ...(isUntagged
              ? {
                  backgroundColor: "var(--client-primary, #3b82f6)12",
                  color: "var(--client-primary, #3b82f6)",
                  border: "1px dashed var(--client-primary, #3b82f6)40",
                }
              : {
                  backgroundColor: `${src?.color || "#6b7280"}12`,
                  color: src?.color || "#6b7280",
                }),
          }}
        >
          <Icon className="h-3 w-3" />
          {isUntagged ? s("tag_this_sale", lang, translations, "Tag this sale") : sourceLabel}
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
  lang,
  translations,
}: {
  clientId: string;
  currency: string;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onAdded: () => void;
  lang: string;
  translations: Tx;
}) {
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0]?.name || s("other", lang, translations, "Other"));
  const [customerName, setCustomerName] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const otherLabel = s("other", lang, translations, "Other");

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
        className="relative z-10 w-full max-w-lg animate-in slide-in-from-bottom p-5 pb-8"
        style={{ backgroundColor: "var(--surface-1, #fff)", color: "inherit", borderTopLeftRadius: R, borderTopRightRadius: R }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 opacity-20" style={{ backgroundColor: "currentColor", borderRadius: 9999 }} />
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-semibold">{s("add_a_sale", lang, translations, "Add a sale")}</h3>
          <button onClick={onClose} className="p-1.5 hover:opacity-70" style={{ borderRadius: R_SM }}><X className="h-5 w-5" /></button>
        </div>
        <div className="flex flex-col gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium opacity-50">{s("amount", lang, translations, "Amount")} ({currency})</label>
            <input
              type="number" inputMode="numeric" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0" autoFocus
              className="w-full border px-4 py-3 text-2xl font-bold tabular-nums outline-none focus:ring-2"
              style={{ backgroundColor: "var(--surface-2, #eee)", borderColor: "var(--border-1, #ddd)", color: "inherit", borderRadius: R_SM }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium opacity-50">{s("customer_name", lang, translations, "Customer name (optional)")}</label>
            <input
              type="text" value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="..."
              className="w-full border px-4 py-2.5 text-sm outline-none focus:ring-2"
              style={{ backgroundColor: "var(--surface-2, #eee)", borderColor: "var(--border-1, #ddd)", color: "inherit", borderRadius: R_SM }}
            />
          </div>
          {categories.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium opacity-50">{s("category", lang, translations, "Category")}</label>
              <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id} onClick={() => setCategory(cat.name)}
                    className="px-3 py-1.5 text-xs font-medium transition-all"
                    style={{
                      borderRadius: R_SM,
                      backgroundColor: category === cat.name ? "var(--client-primary, #3b82f6)" : "var(--surface-2, #eee)",
                      color: category === cat.name ? "#fff" : "inherit",
                      opacity: category === cat.name ? 1 : 0.6,
                    }}
                  >{cat.name}</button>
                ))}
                <button
                  onClick={() => setCategory(otherLabel)}
                  className="px-3 py-1.5 text-xs font-medium transition-all"
                  style={{
                    borderRadius: R_SM,
                    backgroundColor: category === otherLabel ? "var(--client-primary, #3b82f6)" : "var(--surface-2, #eee)",
                    color: category === otherLabel ? "#fff" : "inherit",
                    opacity: category === otherLabel ? 1 : 0.6,
                  }}
                >{otherLabel}</button>
              </div>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-medium opacity-50">{s("note_optional", lang, translations, "Note (optional)")}</label>
            <input
              type="text" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder={s("note_placeholder", lang, translations, "Trade show sale, walk-in...")}
              className="w-full border px-4 py-2.5 text-sm outline-none focus:ring-2"
              style={{ backgroundColor: "var(--surface-2, #eee)", borderColor: "var(--border-1, #ddd)", color: "inherit", borderRadius: R_SM }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!amount || Number(amount) <= 0 || saving}
            className="mt-1 w-full py-3.5 text-sm font-bold text-white transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-30"
            style={{ backgroundColor: "var(--client-primary, #3b82f6)", borderRadius: R_SM }}
          >
            {saving ? s("saving", lang, translations, "Saving...") : `${s("add_amount", lang, translations, "Add")} ${amount ? fmtCurrency(Number(amount), currency) : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Sales Tab                                                     */
/* ------------------------------------------------------------------ */

export function SalesTab({ clientId, currency, lang, translations: rawTx }: SalesTabProps) {
  const tx: Tx = (rawTx ?? {}) as Tx;
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
      if (revenueGoal === 0) return `${fmtCurrency(totalRevenue, currency)} ${s("total", lang, tx, "total")}`;
      return progressPct >= 100
        ? s("goal_reached", lang, tx, "Goal reached!")
        : `${Math.round(progressPct)}% ${s("pct_of_goal", lang, tx, "of goal")}`;
    }
    if (revenueGoal === 0) return "";
    if (progressPct >= 100) return s("goal_reached_keep", lang, tx, "Goal reached! Keep going!");
    const ratio = timePct > 0 ? progressPct / timePct : 0;
    if (ratio >= 1.0) return s("ahead_of_schedule", lang, tx, "Ahead of schedule");
    if (ratio >= 0.7) return s("slightly_behind", lang, tx, "Slightly behind, but close");
    return s("push_harder", lang, tx, "Time to push harder");
  }, [isCurrent, revenueGoal, totalRevenue, progressPct, timePct, currency, lang, tx]);

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
        <div className="h-10 w-10 animate-spin border-2 border-current border-t-transparent opacity-20" style={{ borderRadius: 9999 }} />
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
        className="relative flex flex-col items-center gap-1 px-4 pb-5 pt-4"
        style={{ backgroundColor: "var(--surface-1)", borderRadius: R, transition: "background-color 0.3s" }}
      >
        {/* Month nav */}
        <div className="mb-2 flex w-full items-center justify-between">
          <button
            onClick={handlePrev}
            className="flex h-8 w-8 items-center justify-center transition-colors hover:opacity-70"
            style={{ backgroundColor: "var(--surface-2)", borderRadius: R_SM }}
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
            className="flex h-8 w-8 items-center justify-center transition-colors hover:opacity-70 disabled:opacity-15"
            style={{ backgroundColor: "var(--surface-2)", borderRadius: R_SM }}
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        {/* Ring */}
        <div
          className="flex items-center justify-center p-2 transition-colors duration-700"
          style={{ backgroundColor: paceBg, borderRadius: 9999 }}
        >
          <ProgressRing pct={progressPct} color={paceColor} size={190} stroke={12}>
            <span className="text-center text-2xl font-bold tabular-nums leading-tight" style={{ maxWidth: 130 }}>
              {fmtCompact(totalRevenue, currency)}
            </span>
            {revenueGoal > 0 && (
              <span className="mt-0.5 text-center text-[11px] opacity-40">
                {s("of_goal", lang, tx, "of")} {fmtCompact(revenueGoal, currency)}
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
              <span>{s("day", lang, tx, "Day")} {daysInfo.dayOfMonth}</span>
              <span>{daysInfo.daysInMonth} {s("days", lang, tx, "days")}</span>
            </div>
            <div className="mt-0.5 h-1.5 w-full overflow-hidden" style={{ backgroundColor: "var(--surface-3)", borderRadius: 9999 }}>
              <div
                className="h-full transition-all duration-700"
                style={{ width: `${daysInfo.pct}%`, backgroundColor: paceColor, opacity: 0.35, borderRadius: 9999 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* ---- UNTAGGED BANNER ---- */}
      {(data?.untagged_count ?? 0) > 0 && (
        <div
          className="flex items-center gap-2.5 px-3.5 py-2.5"
          style={{
            borderRadius: R_SM,
            backgroundColor: "var(--client-primary, #3b82f6)08",
            border: "1px solid var(--client-primary, #3b82f6)18",
          }}
        >
          <Tag className="h-4 w-4 shrink-0" style={{ color: "var(--client-primary, #3b82f6)" }} />
          <span className="text-xs" style={{ color: "var(--client-primary, #3b82f6)" }}>
            <strong>{data!.untagged_count}</strong>{" "}
            {data!.untagged_count === 1
              ? s("invoice_needs_tagging", lang, tx, "invoice needs tagging")
              : s("invoices_need_tagging", lang, tx, "invoices need tagging")}
          </span>
        </div>
      )}

      {/* ---- UNTAGGED TRANSACTIONS ---- */}
      {untaggedEntries.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">
            {s("needs_tagging", lang, tx, "Needs tagging")}
          </span>
          {untaggedEntries.map((entry) => (
            <SaleRow key={entry.id} entry={entry} currency={currency} onTag={handleTag} lang={lang} translations={tx} />
          ))}
        </div>
      )}

      {/* ---- CATEGORY BREAKDOWN ---- */}
      {byCategory.length > 0 && (
        <div className="flex flex-col gap-3 p-4" style={{ backgroundColor: "var(--surface-1)", borderRadius: R }}>
          <h3 className="text-xs font-semibold uppercase tracking-wider opacity-40">
            {s("whats_selling", lang, tx, "What\u2019s selling")}
          </h3>
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
                  <div className="h-1.5 overflow-hidden" style={{ backgroundColor: "var(--surface-3, #eee)", borderRadius: 9999 }}>
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${catPct}%`, backgroundColor: "var(--client-primary, #3b82f6)", opacity: 0.55, borderRadius: 9999 }}
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
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">
            {s("where_from", lang, tx, "Where sales come from")}
          </span>
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
                    className="flex items-center gap-1.5 px-2.5 py-1.5"
                    style={{ backgroundColor: `${cfg?.color || "#6b7280"}12`, borderRadius: R_SM }}
                  >
                    <SrcIcon className="h-3 w-3" style={{ color: cfg?.color || "#6b7280" }} />
                    <span className="text-xs font-medium" style={{ color: cfg?.color || "#6b7280" }}>
                      {cfg ? s(cfg.i18nKey, lang, tx, cfg.key) : src}
                    </span>
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
          <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">
            {s("all_transactions", lang, tx, "All transactions")}
          </span>
          {taggedEntries.map((entry) => (
            <SaleRow key={entry.id} entry={entry} currency={currency} onTag={handleTag} lang={lang} translations={tx} />
          ))}
        </div>
      )}

      {/* ---- EMPTY STATE ---- */}
      {data && data.entry_count === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 opacity-30">
          <Store className="h-8 w-8" />
          <span className="text-sm">{s("no_sales", lang, tx, "No sales this month")}</span>
        </div>
      )}

      {/* ---- ADD SALE FAB (current month only) ---- */}
      {isCurrent && (
        <button
          onClick={() => setShowAddSale(true)}
          className="fixed bottom-24 right-5 z-50 flex h-12 w-12 items-center justify-center text-white shadow-lg transition-all hover:scale-110 active:scale-95"
          style={{ backgroundColor: "var(--client-primary, #3b82f6)", borderRadius: 9999 }}
          aria-label={s("add_a_sale", lang, tx, "Add a sale")}
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
          lang={lang}
          translations={tx}
        />
      )}
    </div>
  );
}
