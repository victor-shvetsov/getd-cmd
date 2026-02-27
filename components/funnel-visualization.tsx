"use client";

import { useState } from "react";
import { t } from "@/lib/i18n";
import type { FunnelStage } from "@/lib/types";
import { User, Briefcase, AlertTriangle, ChevronDown } from "lucide-react";

interface FunnelVisualizationProps {
  stages: FunnelStage[];
  lang: string;
  translations: Record<string, Record<string, Record<string, string>>>;
}

/* Funnel zone labels */
function getZoneLabel(index: number, total: number, lang: string, tr: FunnelVisualizationProps["translations"]) {
  const third = total / 3;
  if (index < third) return t("brief.funnel_top", lang, tr);
  if (index < third * 2) return t("brief.funnel_middle", lang, tr);
  return t("brief.funnel_bottom", lang, tr);
}

function getZoneIndex(index: number, total: number): number {
  const third = total / 3;
  if (index < third) return 0;
  if (index < third * 2) return 1;
  return 2;
}

export function FunnelVisualization({ stages, lang, translations }: FunnelVisualizationProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const total = stages.length;

  return (
    <div className="flex flex-col">
      {/* Section header */}
      <div className="px-4 py-2.5" style={{ backgroundColor: "var(--surface-2)", borderRadius: "var(--client-radius, 0.75rem) var(--client-radius, 0.75rem) 0 0" }}>
        <h3 className="text-[11px] font-bold uppercase tracking-wider opacity-45">
          {t("brief.user_journey", lang, translations)}
        </h3>
      </div>

      <div className="relative flex flex-col items-center overflow-hidden pb-2 pt-4" style={{ backgroundColor: "var(--surface-1)", borderRadius: "0 0 var(--client-radius, 0.75rem) var(--client-radius, 0.75rem)" }}>
        {/* Vertical timeline line */}
        <div
          className="absolute left-1/2 -translate-x-1/2"
          style={{
            top: "2.5rem",
            bottom: "1rem",
            width: "1px",
            background: "linear-gradient(to bottom, var(--client-primary, #3b82f6)30, var(--client-primary, #3b82f6)08)",
          }}
        />

        {stages.map((stage, i) => {
          const hasContent = !!(stage.description || stage.user_action || stage.business_action);
          const isExpanded = expandedIndex === i && hasContent;
          const zone = getZoneIndex(i, total);
          const prevZone = i > 0 ? getZoneIndex(i - 1, total) : -1;
          const showZoneLabel = zone !== prevZone;

          // Funnel width: widest at top (94%), narrowest at bottom (58%)
          const widthPct = total > 1 ? 94 - (i / (total - 1)) * 36 : 94;
          const opacity = 1 - i * 0.04;

          return (
            <div key={i} className="relative z-10 flex w-full flex-col items-center">
              {/* Zone label */}
              {showZoneLabel && (
                <div className="mb-2 mt-1 flex items-center gap-2">
                  <div className="h-px w-6" style={{ backgroundColor: "var(--client-text, #1a2536)", opacity: 0.08 }} />
                  <span className="text-[9px] font-bold uppercase tracking-widest" style={{ opacity: 0.25 }}>
                    {getZoneLabel(i, total, lang, translations)}
                  </span>
                  <div className="h-px w-6" style={{ backgroundColor: "var(--client-text, #1a2536)", opacity: 0.08 }} />
                </div>
              )}

              {/* Funnel bar */}
              <button
                onClick={() => hasContent && setExpandedIndex(isExpanded ? null : i)}
                className="group relative mb-1.5 flex items-center justify-center transition-all duration-300 ease-out"
                style={{
                  width: `${widthPct}%`,
                  minHeight: "2.25rem",
                  borderRadius: "var(--client-radius, 0.5rem)",
                  backgroundColor: "var(--client-primary, #3b82f6)",
                  opacity,
                }}
              >
                {/* Step number */}
                <span
                  className="absolute left-2.5 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                  style={{ backgroundColor: "rgba(255,255,255,0.2)", color: "#fff" }}
                >
                  {i + 1}
                </span>

                {/* Stage name */}
                <span className="text-[12px] font-semibold text-white">{stage.name}</span>

                {/* Expand icon */}
                {hasContent && (
                  <ChevronDown
                    className="absolute right-2.5 h-3.5 w-3.5 text-white/60 transition-transform duration-200"
                    style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                  />
                )}
              </button>

              {/* Expanded detail card */}
              <div
                className="overflow-hidden transition-all duration-300 ease-out"
                style={{
                  maxHeight: isExpanded ? "24rem" : "0",
                  opacity: isExpanded ? 1 : 0,
                  width: `${Math.min(widthPct + 8, 96)}%`,
                }}
              >
                <div
                  className="mx-auto mb-3 mt-1 flex flex-col gap-2.5 rounded-xl p-3"
                  style={{ backgroundColor: "var(--surface-2)" }}
                >
                  {/* Description */}
                  <p className="text-center text-[11px] leading-relaxed opacity-60">{stage.description}</p>

                  {/* Info cards */}
                  <div className="flex flex-col gap-1.5">
                    {/* User action */}
                    <div className="flex gap-2 rounded-lg p-2" style={{ backgroundColor: "var(--surface-3)" }}>
                      <div
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                        style={{ backgroundColor: "var(--client-primary, #3b82f6)20" }}
                      >
                        <User className="h-3 w-3" style={{ color: "var(--client-primary, #3b82f6)" }} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-35">
                          {t("brief.funnel_user_action", lang, translations)}
                        </span>
                        <span className="text-[11px] leading-relaxed opacity-70">{stage.user_action}</span>
                      </div>
                    </div>

                    {/* Business action */}
                    <div className="flex gap-2 rounded-lg p-2" style={{ backgroundColor: "var(--surface-3)" }}>
                      <div
                        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                        style={{ backgroundColor: "#10b98120" }}
                      >
                        <Briefcase className="h-3 w-3" style={{ color: "#10b981" }} />
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider opacity-35">
                          {t("brief.funnel_business_action", lang, translations)}
                        </span>
                        <span className="text-[11px] leading-relaxed opacity-70">{stage.business_action}</span>
                      </div>
                    </div>

                    {/* Drop-off risk */}
                    {stage.drop_off && stage.drop_off !== "N/A" && (
                      <div className="flex gap-2 rounded-lg p-2" style={{ backgroundColor: "#ef444410" }}>
                        <div
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md"
                          style={{ backgroundColor: "#ef444420" }}
                        >
                          <AlertTriangle className="h-3 w-3" style={{ color: "#ef4444" }} />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: "#ef4444", opacity: 0.6 }}>
                            {t("brief.funnel_drop_off", lang, translations)}
                          </span>
                          <span className="text-[11px] leading-relaxed opacity-70">{stage.drop_off}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Connector dot between stages */}
              {i < total - 1 && !isExpanded && (
                <div
                  className="mb-1 h-1 w-1 rounded-full"
                  style={{ backgroundColor: "var(--client-primary, #3b82f6)", opacity: 0.2 }}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
