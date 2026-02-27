"use client";

import { t } from "@/lib/i18n";
import type { BriefData, FunnelStage } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";
import { FunnelVisualization } from "@/components/funnel-visualization";
import {
  MapPin,
  Clock,
  Users,
  Search,
  Target,
  TrendingUp,
  Crosshair,
} from "lucide-react";

interface BriefTabProps {
  data?: Record<string, unknown>;
  lang: string;
  translations: Record<string, Record<string, Record<string, string>>>;
}

/* ── Tag chips ── */
function TagList({ items, variant = "primary" }: { items: string[]; variant?: "primary" | "muted" }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, i) => (
        <span
          key={i}
          className="rounded-full px-2.5 py-1 text-[11px] font-medium leading-none"
          style={
            variant === "primary"
              ? {
                  backgroundColor: "var(--client-primary-light, #3b82f610)",
                  color: "var(--client-primary, #3b82f6)",
                }
              : {
                  backgroundColor: "var(--surface-2)",
                  color: "var(--client-text, #1a2536)",
                  opacity: 0.7,
                }
          }
        >
          {item}
        </span>
      ))}
    </div>
  );
}

/* ── Small icon + label + value row ── */
function InfoRow({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  label: string;
  value: string;
  color?: string;
}) {
  const iconColor = color || "var(--client-primary, #3b82f6)";
  return (
    <div className="flex items-center gap-3 py-1.5">
      <div
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${iconColor}12` }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color: iconColor }} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-[10px] uppercase tracking-wider opacity-40">{label}</span>
        <span className="text-xs font-medium">{value}</span>
      </div>
    </div>
  );
}

export function BriefTab({ data, lang, translations }: BriefTabProps) {
  if (!data) return <EmptyState lang={lang} translations={translations} />;

  const d = data as unknown as BriefData;
  const { service_provider: sp, icp, funnel_diagram, kpis } = d;

  if (!sp) return <EmptyState lang={lang} translations={translations} />;

  return (
    <div className="flex flex-col gap-3 px-4 py-3">

      {/* ────── SERVICE PROVIDER: Hero card ────── */}
      <div
        className="relative overflow-hidden"
        style={{ borderRadius: "var(--client-radius, 0.75rem)" }}
      >
        {/* Top accent gradient */}
        <div
          className="h-1.5"
          style={{
            background: `linear-gradient(90deg, var(--client-primary, #3b82f6), var(--client-primary, #3b82f6)80, var(--client-primary, #3b82f6)40)`,
          }}
        />

        <div className="p-4" style={{ backgroundColor: "var(--surface-1)" }}>
          {/* Company name */}
          <h2
            className="text-lg font-bold leading-tight"
            style={{ fontFamily: "var(--client-font-heading, inherit)" }}
          >
            {sp.company_name}
          </h2>

          {/* Short brief as mission statement (translated via mergeTranslation) */}
          {sp.short_brief && (
            <p
              className="mt-2 text-sm font-medium leading-relaxed"
              style={{ color: "var(--client-primary, #3b82f6)", opacity: 0.85 }}
            >
              {sp.short_brief}
            </p>
          )}

          {/* Location */}
          <div className="mt-3">
            <InfoRow
              icon={MapPin}
              label={t("brief.location", lang, translations)}
              value={sp.location}
              color="#10b981"
            />
          </div>

          {/* Services */}
          <div className="mt-3 flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-wider opacity-40">
              {t("brief.services", lang, translations)}
            </span>
            <TagList items={sp.services} variant="primary" />
          </div>
        </div>
      </div>

      {/* ────── ICP: Persona card ────── */}
      {icp && (
        <div
          className="overflow-hidden"
          style={{ borderRadius: "var(--client-radius, 0.75rem)", backgroundColor: "var(--surface-1)" }}
        >
          {/* Header with persona icon */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: "var(--surface-2)" }}>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: "var(--client-primary, #3b82f6)15" }}
            >
              <Crosshair className="h-4 w-4" style={{ color: "var(--client-primary, #3b82f6)" }} />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider opacity-70">
                {t("brief.icp", lang, translations)}
              </h3>
            </div>
          </div>

          <div className="flex flex-col gap-3.5 p-4">
            {/* Demographics row */}
            <div className="grid grid-cols-2 gap-2">
              <InfoRow
                icon={Users}
                label={t("brief.age_group", lang, translations)}
                value={icp.age_group}
              />
              <InfoRow
                icon={Clock}
                label={t("brief.timeframe", lang, translations)}
                value={icp.timeframe}
              />
            </div>

            <InfoRow
              icon={MapPin}
              label={t("brief.habitant_location", lang, translations)}
              value={icp.habitant_location}
              color="#10b981"
            />

            {/* Pains */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Target className="h-3 w-3 opacity-40" />
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-40">
                  {t("brief.pains", lang, translations)}
                </span>
              </div>
              <TagList items={icp.pains} variant="primary" />
            </div>

            {/* Search methods */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <Search className="h-3 w-3 opacity-40" />
                <span className="text-[10px] font-semibold uppercase tracking-wider opacity-40">
                  {t("brief.search_methods", lang, translations)}
                </span>
              </div>
              <TagList items={icp.search_methods} variant="muted" />
            </div>
          </div>
        </div>
      )}

      {/* ────── FUNNEL (untouched -- it's genius) ────── */}
      {funnel_diagram && (() => {
        const stages: FunnelStage[] = funnel_diagram.stages?.length
          ? funnel_diagram.stages
          : (funnel_diagram.nodes ?? []).map((name) => ({
              name,
              description: "",
              user_action: "",
              business_action: "",
              drop_off: "",
            }));

        return stages.length > 0 ? (
          <FunnelVisualization
            stages={stages}
            lang={lang}
            translations={translations}
          />
        ) : null;
      })()}

      {/* ────── KPIs: Scorecard ────── */}
      {kpis?.items && (
        <div
          className="overflow-hidden"
          style={{ borderRadius: "var(--client-radius, 0.75rem)", backgroundColor: "var(--surface-1)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3" style={{ backgroundColor: "var(--surface-2)" }}>
            <div
              className="flex h-8 w-8 items-center justify-center rounded-full"
              style={{ backgroundColor: "#10b98115" }}
            >
              <TrendingUp className="h-4 w-4" style={{ color: "#10b981" }} />
            </div>
            <h3 className="text-xs font-bold uppercase tracking-wider opacity-70">
              {t("brief.kpis", lang, translations)}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-px" style={{ backgroundColor: "var(--surface-2)" }}>
            {kpis.items.map((kpi, i) => (
              <div
                key={i}
                className="flex flex-col justify-between p-3.5"
                style={{ backgroundColor: "var(--surface-1)" }}
              >
                {/* Label */}
                <p className="text-[10px] font-semibold uppercase tracking-wider opacity-35">
                  {kpi.label}
                </p>

                {/* Big value */}
                <p
                  className="mt-1.5 text-xl font-bold leading-none"
                  style={{ fontFamily: "var(--client-font-heading, inherit)" }}
                >
                  {kpi.value}
                </p>

                {/* Target + note */}
                <div className="mt-2 flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="h-1 flex-1 rounded-full"
                      style={{ backgroundColor: "var(--client-primary, #3b82f6)15" }}
                    >
                      <div
                        className="h-1 rounded-full"
                        style={{
                          backgroundColor: "var(--client-primary, #3b82f6)",
                          width: "60%",
                          opacity: 0.6,
                        }}
                      />
                    </div>
                  </div>
                  <p className="text-[10px] opacity-40">
                    {t("brief.target", lang, translations)}: {kpi.target}
                  </p>
                  {kpi.note && (
                    <p className="text-[9px] leading-snug opacity-30">{kpi.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
