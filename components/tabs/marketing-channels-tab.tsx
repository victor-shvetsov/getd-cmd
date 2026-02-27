"use client";

import { t } from "@/lib/i18n";
import type { MarketingChannelsData } from "@/lib/types";
import { EmptyState } from "@/components/empty-state";

interface Props {
  data?: Record<string, unknown>;
  baseData?: Record<string, unknown>;
  lang: string;
  translations: Record<string, Record<string, Record<string, string>>>;
}

function StatusBadge({ status, baseStatus }: { status: string; baseStatus?: string }) {
  // Use base (English) status for color matching, fall back to display status
  const key = (baseStatus ?? status).toLowerCase();
  const colorMap: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-700",
    "in progress": "bg-amber-100 text-amber-700",
    planned: "bg-blue-100 text-blue-700",
    paused: "bg-red-100 text-red-700",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${
        colorMap[key] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {status}
    </span>
  );
}

export function MarketingChannelsTab({ data, baseData, lang, translations }: Props) {
  const d = data as unknown as MarketingChannelsData | undefined;
  const base = (baseData ?? data) as unknown as MarketingChannelsData | undefined;
  if (!d?.channel_prioritization?.items?.length) {
    return <EmptyState lang={lang} translations={translations} />;
  }

  const baseItems = base?.channel_prioritization?.items ?? [];

  return (
    <div className="flex flex-col gap-3 px-4 py-3">
      <h2 className="text-[11px] font-bold uppercase tracking-wider opacity-45">
        {t("marketing_channels.channel_prioritization", lang, translations)}
      </h2>
      {d.channel_prioritization.items.map((item, i) => (
        <div
          key={i}
          className="overflow-hidden"
          style={{ borderRadius: "var(--client-radius, 0.75rem)", backgroundColor: "var(--surface-1)" }}
        >
          <div className="flex items-center justify-between px-4 py-2.5" style={{ backgroundColor: "var(--surface-2)" }}>
            <span className="text-sm font-semibold">{item.channel}</span>
            <StatusBadge status={item.status} baseStatus={baseItems[i]?.status} />
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 p-4">
            {[
              { key: "marketing_channels.allocated_budget", val: `${item.allocated_budget} ${item.currency}` },
              { key: "marketing_channels.objective", val: item.objective },
              { key: "marketing_channels.funnel_stage", val: item.funnel_stage },
              { key: "marketing_channels.primary_kpi", val: item.primary_kpi },
              { key: "marketing_channels.primary_offer", val: item.primary_offer },
              { key: "marketing_channels.audience_segment", val: item.audience_segment },
            ].map(({ key, val }) => (
              <div key={key}>
                <p className="text-[10px] uppercase tracking-wide" style={{ opacity: 0.5 }}>{t(key, lang, translations)}</p>
                <p className="text-xs font-medium">{val}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
