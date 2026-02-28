"use client";

import { useState, useMemo } from "react";
import { t } from "@/lib/i18n";
import type { WebsiteData, SiteTreeNode, SEOPage } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import {
  buildSiteTree,
  computeWebsiteStats,
  getLocationSegments,
  PAGE_STATUSES,
  fmtVol,
} from "@/lib/website-utils";
import { ChevronDown, ExternalLink } from "lucide-react";

interface Props {
  data?: Record<string, unknown>;
  baseData?: Record<string, unknown>;
  lang: string;
  translations: Record<string, Record<string, Record<string, string>>>;
}

/* ── Color helpers ── */
function getStatusColor(status: string): string {
  const info = PAGE_STATUSES.find((s) => s.value === status);
  return info?.color || "#94a3b8";
}

function getIntentColor(intent: string): { bg: string; text: string } {
  const i = intent.toLowerCase();
  if (i.includes("transactional")) return { bg: "#059669", text: "#fff" };
  if (i.includes("commercial")) return { bg: "#d97706", text: "#fff" };
  if (i.includes("navigational")) return { bg: "#6366f1", text: "#fff" };
  return { bg: "var(--client-text, #1a2536)", text: "#fff" };
}

function getPageTypeStyle(pt: string): { bg: string; text: string } {
  const t = pt.toLowerCase();
  if (t.includes("pillar")) return { bg: "var(--client-primary, #3b82f6)", text: "#fff" };
  if (t.includes("service")) return { bg: "#059669", text: "#fff" };
  if (t.includes("comparison")) return { bg: "#d97706", text: "#fff" };
  if (t.includes("trust")) return { bg: "#8b5cf6", text: "#fff" };
  if (t.includes("category")) return { bg: "#e11d48", text: "#fff" };
  return { bg: "var(--client-text, #1a2536)", text: "#fff" };
}

function getStatusLabel(status: string): string {
  const info = PAGE_STATUSES.find((s) => s.value === status);
  return info?.label || status;
}

/* ── Progress ring (SVG) ── */
function ProgressRing({
  percent,
  size = 72,
  stroke = 5,
  liveLabel = "live",
}: {
  percent: number;
  size?: number;
  stroke?: number;
  liveLabel?: string;
}) {
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--client-text, #1a2536)"
          strokeOpacity={0.06}
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#059669"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-sm font-bold leading-none">{percent}%</span>
        <span className="mt-0.5 text-[7px] uppercase tracking-wider opacity-40">{liveLabel}</span>
      </div>
    </div>
  );
}

/* ── Stats row ── */
function StatsBar({
  stats,
  lang,
  translations,
}: {
  stats: ReturnType<typeof computeWebsiteStats>;
  lang: string;
  translations: Record<string, Record<string, Record<string, string>>>;
}) {
  return (
    <div className="flex items-center gap-3">
      <ProgressRing percent={stats.progressPercent} liveLabel={t("website.live", lang, translations)} />
      <div className="flex flex-1 flex-col gap-1.5">
        {/* Status row breakdown */}
        <div className="flex items-center gap-1">
          {PAGE_STATUSES.map((s) => {
            const count =
              s.value === "planned"
                ? stats.planned
                : s.value === "live"
                ? stats.live
                : s.value === "copy_ready" || s.value === "in_design" || s.value === "in_dev"
                ? (stats.byType as Record<string, number>)[s.value] ?? 0
                : 0;
            // Compute from the stats object
            const actualCount =
              s.value === "planned"
                ? stats.planned
                : s.value === "live"
                ? stats.live
                : s.value === "in_design" || s.value === "in_dev" || s.value === "copy_ready"
                ? stats.inProgress
                : 0;
            return null; // We'll use a bar instead
          })}
        </div>
        {/* Progress bar segmented */}
        <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--client-text, #1a2536)", opacity: 0.04 }}>
          {stats.total > 0 && (
            <>
              <div
                className="h-full transition-all"
                style={{
                  width: `${(stats.live / stats.total) * 100}%`,
                  backgroundColor: "#059669",
                }}
              />
              <div
                className="h-full transition-all"
                style={{
                  width: `${(stats.inProgress / stats.total) * 100}%`,
                  backgroundColor: "var(--client-primary, #3b82f6)",
                }}
              />
            </>
          )}
        </div>
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
          <LegendDot color="#059669" label={t("website.live", lang, translations)} count={stats.live} />
          <LegendDot color="var(--client-primary, #3b82f6)" label={t("website.in_progress", lang, translations)} count={stats.inProgress} />
          <LegendDot color="#94a3b8" label={t("website.planned", lang, translations)} count={stats.planned} />
        </div>
        {/* Volume */}
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold leading-none">{fmtVol(stats.totalVolume)}</span>
          <span className="text-[9px] opacity-40">{t("website.monthly_searches", lang, translations)}</span>
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label, count }: { color: string; label: string; count: number }) {
  return (
    <div className="flex items-center gap-1 min-w-0 overflow-hidden">
      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="truncate text-[8px] opacity-50">{label}</span>
      <span className="shrink-0 text-[10px] font-semibold">{count}</span>
    </div>
  );
}

/* ── Tree node (client-facing, visual) ── */
function TreeBranch({
  node,
  depth,
  lang,
  translations,
  isMultiLocation,
  isLast,
}: {
  node: SiteTreeNode;
  depth: number;
  lang: string;
  translations: Record<string, Record<string, Record<string, string>>>;
  isMultiLocation: boolean;
  isLast: boolean;
}) {
  const hasChildren = node.children.length > 0;
  const isPage = !!node.page;
  const [expanded, setExpanded] = useState(depth < 2);
  const [detailOpen, setDetailOpen] = useState(false);

  // For location-level nodes (depth 0 in multi-location), show as prominent section
  const isLocationNode = isMultiLocation && depth === 0 && !isPage;

  if (isLocationNode) {
    return (
      <div className="flex flex-col">
        {/* Location header */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 px-3 py-2"
        >
          <span
            className="flex h-5 items-center rounded px-1.5 text-[10px] font-bold uppercase tracking-widest"
            style={{
              backgroundColor: "var(--client-primary, #3b82f6)",
              color: "#fff",
              opacity: 0.85,
            }}
          >
            /{node.segment}
          </span>
          <span className="text-[10px] opacity-30">
            {node.total_pages} {t("website.pages_count", lang, translations)} -- {fmtVol(node.total_volume)}{t("demand.per_month_short", lang, translations)}
          </span>
          <ChevronDown
            className="ml-auto h-3 w-3 transition-transform"
            style={{ opacity: 0.2, transform: expanded ? "rotate(180deg)" : "rotate(0)" }}
          />
        </button>
        {expanded && (
          <div className="pb-1 pl-2">
            {node.children.map((child, ci) => (
              <TreeBranch
                key={child.full_path}
                node={child}
                depth={depth + 1}
                lang={lang}
                translations={translations}
                isMultiLocation={isMultiLocation}
                isLast={ci === node.children.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Volume bar width relative to max possible (pillar pages tend to be biggest)
  const maxVol = isPage ? node.page!.search_volume : node.total_volume;
  const volBarWidth = Math.min(100, Math.max(8, (maxVol / 500) * 100));

  return (
    <div className="flex flex-col">
      {/* Node row */}
      <div className="relative flex items-center">
        {/* Connector lines */}
        {depth > 0 && (
          <div
            className="absolute top-0 h-full"
            style={{
              left: `${(depth - 1) * 16 + 12}px`,
              width: "1px",
              backgroundColor: "var(--client-text, #1a2536)",
              opacity: 0.06,
              ...(isLast ? { height: "50%" } : {}),
            }}
          />
        )}
        {depth > 0 && (
          <div
            className="absolute"
            style={{
              left: `${(depth - 1) * 16 + 12}px`,
              top: "50%",
              width: "8px",
              height: "1px",
              backgroundColor: "var(--client-text, #1a2536)",
              opacity: 0.06,
            }}
          />
        )}

        <button
          onClick={() => {
            if (hasChildren) setExpanded(!expanded);
            if (isPage) setDetailOpen(!detailOpen);
          }}
          className="flex w-full items-center gap-1.5 py-1 pr-3 text-left"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
          {/* Status indicator */}
          {isPage ? (
            <span
              className="h-2 w-2 flex-shrink-0 rounded-full"
              style={{ backgroundColor: getStatusColor(node.page!.status) }}
            />
          ) : (
            /* Folder node -- mini count badge */
            hasChildren && (
              <span
                className="flex h-4 min-w-[16px] flex-shrink-0 items-center justify-center rounded-sm px-0.5 text-[8px] font-bold"
                style={{
                  backgroundColor: "var(--client-text, #1a2536)",
                  color: "var(--client-bg, #fff)",
                  opacity: 0.12,
                }}
              >
                <span style={{ opacity: 1, color: "var(--client-text, #1a2536)" }}>
                  {node.total_pages}
                </span>
              </span>
            )
          )}

          {/* URL segment */}
          <span
            className={`min-w-0 flex-shrink truncate text-[11px] leading-tight ${
              isPage ? "font-mono font-medium" : "font-semibold"
            }`}
          >
            {hasChildren && !isPage ? node.segment + "/" : node.segment}
          </span>

          {/* Page type badge (only for pages) */}
          {isPage && node.page!.page_type && (
            <span
              className="flex-shrink-0 rounded px-1 py-0.5 text-[7px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: getPageTypeStyle(node.page!.page_type).bg,
                color: getPageTypeStyle(node.page!.page_type).text,
                opacity: 0.8,
              }}
            >
              {node.page!.page_type}
            </span>
          )}

          {/* Spacer */}
          <span className="flex-1" />

          {/* Volume mini-bar + number */}
          <span className="flex flex-shrink-0 items-center gap-1.5">
            <span
              className="h-1 rounded-full"
              style={{
                width: `${volBarWidth * 0.4}px`,
                minWidth: "4px",
                backgroundColor: isPage
                  ? getStatusColor(node.page!.status)
                  : "var(--client-primary, #3b82f6)",
                opacity: isPage ? 0.4 : 0.15,
              }}
            />
            <span className="text-[9px] tabular-nums opacity-35">
              {fmtVol(isPage ? node.page!.search_volume : node.total_volume)}
            </span>
          </span>

          {/* Expand icon for folder / detail chevron for page */}
          {(hasChildren || isPage) && (
            <ChevronDown
              className="h-2.5 w-2.5 flex-shrink-0 transition-transform"
              style={{
                opacity: 0.15,
                transform: (hasChildren ? expanded : detailOpen) ? "rotate(180deg)" : "rotate(0)",
              }}
            />
          )}
        </button>
      </div>

      {/* Page detail expanded panel */}
      {isPage && detailOpen && (
        <PageDetail page={node.page!} lang={lang} translations={translations} depth={depth} />
      )}

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child, ci) => (
            <TreeBranch
              key={child.full_path}
              node={child}
              depth={depth + 1}
              lang={lang}
              translations={translations}
              isMultiLocation={isMultiLocation}
              isLast={ci === node.children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Page detail panel (expanded) ── */
function PageDetail({
  page,
  lang,
  translations,
  depth,
}: {
  page: SEOPage;
  lang: string;
  translations: Record<string, Record<string, Record<string, string>>>;
  depth: number;
}) {
  const statusColor = getStatusColor(page.status);
  const intentStyle = getIntentColor(page.intent);

  return (
    <div
      className="flex flex-col gap-2 py-2"
      style={{ paddingLeft: `${depth * 16 + 28}px`, paddingRight: "12px" }}
    >
      {/* Badges */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
          style={{ backgroundColor: statusColor, color: "#fff", opacity: 0.85 }}
        >
          {getStatusLabel(page.status)}
        </span>
        {page.intent && (
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-semibold"
            style={{ backgroundColor: intentStyle.bg, color: intentStyle.text, opacity: 0.8 }}
          >
            {page.intent}
          </span>
        )}
        {page.priority === "P1" && (
          <span
            className="rounded px-1.5 py-0.5 text-[9px] font-bold"
            style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
          >
            P1
          </span>
        )}
      </div>

      {/* Info rows */}
      <div
        className="flex flex-col divide-y px-2.5 py-1"
        style={{
          backgroundColor: "var(--surface-2)",
          borderRadius: "var(--client-radius, 0.75rem)",
        }}
      >
        <InfoRow
          label={t("website.primary_keyword", lang, translations)}
          value={page.primary_keyword}
        />
        <InfoRow
          label={t("website.search_volume", lang, translations)}
          value={`${page.search_volume.toLocaleString()}${t("demand.per_month_short", lang, translations)}`}
        />
        <InfoRow
          label={t("website.cluster", lang, translations)}
          value={page.cluster_name}
        />
        <InfoRow
          label={t("website.full_url", lang, translations)}
          value={page.full_url_path}
          mono
        />
      </div>

      {/* Secondary keywords */}
      {page.secondary_keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {page.secondary_keywords.slice(0, 6).map((kw, i) => (
            <span
              key={i}
              className="rounded px-1.5 py-0.5 text-[9px]"
              style={{
                backgroundColor: "var(--client-text, #1a2536)",
                color: "var(--client-text, #1a2536)",
                opacity: 0.5,
                background: "var(--surface-1)",
              }}
            >
              {kw}
            </span>
          ))}
          {page.secondary_keywords.length > 6 && (
            <span className="px-1 text-[9px] opacity-30">
              +{page.secondary_keywords.length - 6} {t("website.more_keywords", lang, translations)}
            </span>
          )}
        </div>
      )}

      {/* Live link */}
      {page.status === "live" && page.full_url_path && (
        <a
          href={page.full_url_path.startsWith("http") ? page.full_url_path : `#`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 self-start px-2 py-1 text-[10px] font-semibold transition-opacity hover:opacity-80"
          style={{
            backgroundColor: "var(--client-primary, #3b82f6)12",
            color: "var(--client-primary, #3b82f6)",
            borderRadius: "calc(var(--client-radius, 0.75rem) * 0.5)",
          }}
        >
          <ExternalLink className="h-3 w-3" />
          {t("website.open_link", lang, translations)}
        </a>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className="shrink-0 text-[10px] opacity-40">{label}</span>
      <span className={`text-right text-[10px] font-medium ${mono ? "font-mono" : ""}`}>
        {value || "-"}
      </span>
    </div>
  );
}

/* ── Page type distribution mini-chart ── */
function TypeDistribution({ stats }: { stats: ReturnType<typeof computeWebsiteStats> }) {
  const types = Object.entries(stats.byType).sort((a, b) => b[1] - a[1]);
  if (types.length === 0) return null;
  const maxCount = Math.max(...types.map(([, c]) => c));

  return (
    <div className="flex flex-col gap-1 px-1">
      {types.map(([type, count]) => {
        const style = getPageTypeStyle(type);
        return (
          <div key={type} className="flex items-center gap-2">
            <span className="w-20 truncate text-right text-[9px] opacity-40">{type}</span>
            <div className="relative h-3 flex-1 overflow-hidden rounded-sm" style={{ backgroundColor: "var(--client-text, #1a2536)", opacity: 0.03 }}>
              <div
                className="absolute inset-y-0 left-0 rounded-sm"
                style={{
                  width: `${(count / maxCount) * 100}%`,
                  backgroundColor: style.bg,
                  opacity: 0.7,
                }}
              />
            </div>
            <span className="w-5 text-right text-[9px] font-semibold opacity-50">{count}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════ */
/*  Main WebsiteTab                                                   */
/* ═══════════════════════════════════════════════════════════════════ */
export function WebsiteTab({ data, baseData, lang, translations }: Props) {
  const d = data as unknown as WebsiteData | undefined;
  const arch = d?.website_architecture;

  if (!arch?.pages?.length) {
    return <EmptyState lang={lang} translations={translations} />;
  }

  const pages = arch.pages;
  const isMultiLocation = arch.multi_location ?? false;
  const stats = computeWebsiteStats(pages);
  const tree = buildSiteTree(pages);
  const locationSegments = getLocationSegments(pages);

  const [activeLocation, setActiveLocation] = useState("all");

  const filteredTree = useMemo(() => {
    if (!isMultiLocation || activeLocation === "all") return tree;
    return tree.filter((n) => n.segment === activeLocation);
  }, [tree, activeLocation, isMultiLocation]);

  return (
    <div className="flex flex-col gap-4 px-4 py-3">
      {/* Header */}
      <h2 className="text-[11px] font-bold uppercase tracking-wider opacity-45">
        {t("website.website_architecture", lang, translations)}
      </h2>

      {/* Stats overview */}
      <div
        className="overflow-hidden p-3"
        style={{
          backgroundColor: "var(--surface-1)",
          borderRadius: "var(--client-radius, 0.75rem)",
        }}
      >
        <StatsBar stats={stats} lang={lang} translations={translations} />
      </div>

      {/* Page type distribution */}
      <div
        className="overflow-hidden p-3"
        style={{
          backgroundColor: "var(--surface-1)",
          borderRadius: "var(--client-radius, 0.75rem)",
        }}
      >
        <span className="mb-2 block text-[9px] font-bold uppercase tracking-wider opacity-30">
          {t("website.page_types", lang, translations)}
        </span>
        <TypeDistribution stats={stats} />
      </div>

      {/* Location tabs (multi-location only) */}
      {isMultiLocation && locationSegments.length > 1 && (
        <div className="flex items-center gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveLocation("all")}
            className="flex-shrink-0 px-2.5 py-1 text-[10px] font-semibold transition-colors"
            style={{
              backgroundColor: activeLocation === "all" ? "var(--client-primary, #3b82f6)" : "var(--surface-1)",
              color: activeLocation === "all" ? "#fff" : "inherit",
              opacity: activeLocation === "all" ? 1 : 0.5,
              borderRadius: "calc(var(--client-radius, 0.75rem) * 0.5)",
            }}
          >
            All
          </button>
          {locationSegments.map((seg) => (
            <button
              key={seg}
              onClick={() => setActiveLocation(seg)}
              className="flex-shrink-0 px-2.5 py-1 text-[10px] font-semibold transition-colors"
              style={{
                backgroundColor: activeLocation === seg ? "var(--client-primary, #3b82f6)" : "var(--surface-1)",
                color: activeLocation === seg ? "#fff" : "inherit",
                opacity: activeLocation === seg ? 1 : 0.5,
                borderRadius: "calc(var(--client-radius, 0.75rem) * 0.5)",
              }}
            >
              /{seg}
            </button>
          ))}
        </div>
      )}

      {/* Site tree */}
      <div
        className="overflow-hidden"
        style={{
          backgroundColor: "var(--surface-1)",
          borderRadius: "var(--client-radius, 0.75rem)",
        }}
      >
        <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: "var(--surface-2)" }}>
          <span className="text-[10px] font-bold uppercase tracking-wider opacity-35">
            {t("website.sitemap", lang, translations)}
          </span>
          <span className="text-[9px] opacity-25">
            {stats.total} {t("website.pages_count", lang, translations)}
          </span>
        </div>

        <div className="py-1">
          {filteredTree.map((node, ni) => (
            <TreeBranch
              key={node.full_path}
              node={node}
              depth={0}
              lang={lang}
              translations={translations}
              isMultiLocation={isMultiLocation}
              isLast={ni === filteredTree.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
