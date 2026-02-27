"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import type { DemandData, PPCKeyword } from "@/lib/types";
import { aggregateDemand, fmtCurrency, fmtVolume } from "@/lib/demand-utils";
import { EmptyState } from "@/components/empty-state";
import {
  ExternalLink,
  ChevronDown,
  Search,
  Globe,
} from "lucide-react";

interface Props {
  data?: Record<string, unknown>;
  baseData?: Record<string, unknown>;
  lang: string;
  translations: Record<string, Record<string, Record<string, string>>>;
}

/* ── Helper: derive a friendly service name from landing page URL ── */
function pageToServiceName(url: string): string {
  if (!url || url === "(no page assigned)") return "General";
  // /adas-calibration-miami → "Adas Calibration Miami"
  const path = url.replace(/^https?:\/\/[^/]+/, "").replace(/^\//, "").replace(/\/$/, "");
  if (!path) return "Homepage";
  return path
    .split("/")
    .pop()!
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── Main tab ── */
export function DemandTab({ data, lang, translations }: Props) {
  const d = data as unknown as DemandData | undefined;
  const keywords = d?.keyword_research?.keywords ?? [];
  const ppcSheetLink = d?.keyword_research?.ppc_sheet_link ?? "";
  const currency = d?.keyword_research?.currency ?? "USD";

  if (keywords.length === 0) {
    return <EmptyState lang={lang} translations={translations} />;
  }

  const summary = aggregateDemand(keywords);

  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[11px] font-bold uppercase tracking-wider opacity-45">
          {t("demand.market_opportunity", lang, translations) || "Your Market"}
        </h2>
        {ppcSheetLink && (
          <a
            href={ppcSheetLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[11px] font-medium hover:underline"
            style={{ color: "var(--client-primary, #3b82f6)" }}
          >
            {t("demand.full_research", lang, translations) || "Full Research"}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {/* Hero -- "How many people need what you sell?" */}
      <div
        className="flex flex-col gap-3 rounded-2xl p-4"
        style={{
          backgroundColor: "var(--surface-1)",
          borderRadius: "var(--client-radius, 0.75rem)",
        }}
      >
        <span className="text-xs font-medium opacity-40">
          {t("demand.people_searching", lang, translations) || "People searching for your products every month"}
        </span>
        <div className="flex items-baseline gap-2">
          <span
            className="text-4xl font-bold tabular-nums"
            style={{ color: "var(--client-primary, #3b82f6)" }}
          >
            {fmtVolume(summary.total_monthly_searches)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <MiniStat
            icon={Globe}
            value={summary.pages_targeted.toString()}
            label={t("demand.your_products", lang, translations) || "Your products"}
          />
          <MiniStat
            icon={Search}
            value={summary.total_keywords.toString()}
            label={t("demand.search_terms", lang, translations) || "Search terms"}
          />
        </div>
      </div>

      {/* Service breakdown -- grouped by landing page */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest opacity-35">
          {t("demand.by_service", lang, translations) || "What people are looking for"}
        </span>

          {summary.by_page.map((page, pi) => (
          <ServiceCard
            key={pi}
            page={page}
            totalVolume={summary.total_monthly_searches}
            currency={currency}
            lang={lang}
            translations={translations}
          />
        ))}
      </div>
    </div>
  );
}

/* ── Mini stat in the hero area ── */
function MiniStat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ElementType;
  value: string;
  label: string;
}) {
  return (
    <div
      className="flex flex-col items-center gap-0.5 overflow-hidden rounded-xl px-1 py-2"
      style={{ backgroundColor: "var(--surface-1)" }}
    >
      <Icon className="h-3 w-3 shrink-0" style={{ opacity: 0.35 }} />
      <span className="max-w-full truncate text-center text-[12px] font-bold tabular-nums leading-tight">{value}</span>
      <span className="max-w-full truncate text-center text-[8px] uppercase tracking-wide opacity-40 leading-tight">{label}</span>
    </div>
  );
}

/* ── Service card (one per landing page) ── */
function ServiceCard({
  page,
  totalVolume,
  currency,
  lang,
  translations,
}: {
  page: import("@/lib/types").DemandByPage;
  totalVolume: number;
  currency: string;
  lang: string;
  translations: Record<string, Record<string, Record<string, string>>>;
}) {
  const [expanded, setExpanded] = useState(false);
  const serviceName = pageToServiceName(page.landing_page);
  const sharePercent = totalVolume > 0 ? Math.round((page.total_volume / totalVolume) * 100) : 0;

  return (
    <div
      className="overflow-hidden"
      style={{
        backgroundColor: "var(--surface-1)",
        borderRadius: "var(--client-radius, 0.75rem)",
      }}
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-black/[0.02]"
      >
        {/* Volume share indicator */}
        <div
          className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
          style={{
            backgroundColor: "var(--client-primary, #3b82f6)12",
          }}
        >
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color: "var(--client-primary, #3b82f6)" }}
          >
            {sharePercent}%
          </span>
        </div>

        <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
          <span className="truncate text-[13px] font-semibold leading-tight">
            {serviceName}
          </span>
          <div className="flex items-center gap-1.5 text-[10px] opacity-45 min-w-0 overflow-hidden">
            <span className="shrink-0">{page.keyword_count} {t("demand.keywords", lang, translations) || "keywords"}</span>
            {page.avg_cpc_high > 0 && (
              <>
                <span className="shrink-0">{"·"}</span>
                <span className="truncate">{fmtCurrency(page.avg_cpc_low, currency)}-{fmtCurrency(page.avg_cpc_high, currency)} CPC</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex flex-col items-end">
            <span
              className="text-sm font-bold tabular-nums"
              style={{ color: "var(--client-primary, #3b82f6)" }}
            >
              {fmtVolume(page.total_volume)}
            </span>
            <span className="text-[9px] opacity-35">/mo</span>
          </div>
          <ChevronDown
            className="h-3.5 w-3.5 transition-transform duration-200"
            style={{
              opacity: 0.25,
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </div>
      </button>

      {/* Volume bar */}
      <div className="px-4 pb-2">
        <div
          className="h-1 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "var(--client-primary, #3b82f6)10" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${sharePercent}%`,
              backgroundColor: "var(--client-primary, #3b82f6)",
              opacity: 0.6,
            }}
          />
        </div>
      </div>

      {/* Expanded keyword list */}
      {expanded && (
        <div
          className="flex flex-col"
          style={{ borderTop: "1px solid var(--client-text, #1a2536)08" }}
        >
          {/* Ad groups summary */}
          {page.ad_groups.length > 0 && (
            <div className="flex flex-wrap gap-1 px-4 py-2">
              {page.ad_groups.map((ag, i) => (
                <span
                  key={i}
                  className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                  style={{
                    backgroundColor: "var(--client-primary, #3b82f6)0a",
                    color: "var(--client-primary, #3b82f6)",
                    opacity: 0.75,
                  }}
                >
                  {ag}
                </span>
              ))}
            </div>
          )}

          {/* Keywords table */}
          {page.keywords.map((kw, ki) => (
            <KeywordRow
              key={ki}
              kw={kw}
              currency={currency}
              isLast={ki === page.keywords.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Individual keyword row ── */
function KeywordRow({
  kw,
  currency,
  isLast,
}: {
  kw: PPCKeyword;
  currency: string;
  isLast: boolean;
}) {
  return (
    <div
      className="flex items-center gap-2 px-4 py-1.5"
      style={{
        borderBottom: isLast ? "none" : "1px solid var(--client-text, #1a2536)06",
      }}
    >
      <span className="h-1 w-1 flex-shrink-0 rounded-full" style={{ backgroundColor: "var(--client-primary, #3b82f6)", opacity: 0.3 }} />
      <span className="min-w-0 flex-1 truncate text-[11px]">{kw.keyword}</span>
      <span className="shrink-0 tabular-nums text-[10px] font-semibold" style={{ color: "var(--client-primary, #3b82f6)", opacity: 0.8 }}>
        {kw.avg_monthly_searches.toLocaleString()}
      </span>
      {(kw.top_bid_low > 0 || kw.top_bid_high > 0) && (
        <span className="hidden shrink-0 text-[9px] tabular-nums opacity-35 sm:inline">
          {fmtCurrency(kw.top_bid_low, currency)}-{fmtCurrency(kw.top_bid_high, currency)}
        </span>
      )}
    </div>
  );
}
