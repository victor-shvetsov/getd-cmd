"use client";

import useSWR from "swr";
import { t } from "@/lib/i18n";
import {
  Search,
  BarChart3,
  Globe,
  Zap,
  Layers,
  ClipboardList,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ActivityEntry {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  created_at: string;
}

interface ActivityTabProps {
  data: unknown;
  lang: string;
  translations: Record<string, Record<string, Record<string, string>>>;
  clientId: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function langToLocale(lang: string): string {
  const map: Record<string, string> = {
    da: "da-DK", de: "de-DE", fr: "fr-FR", es: "es-ES",
    ro: "ro-RO", ru: "ru-RU", se: "sv-SE",
  };
  return map[lang] ?? "en-GB";
}

const R = "var(--client-radius, 0.75rem)";
const R_SM = "calc(var(--client-radius, 0.75rem) * 0.65)";

function getCategoryConfig(
  lang: string,
  tr: Record<string, Record<string, Record<string, string>>>
): Record<string, { icon: typeof Globe; label: string }> {
  return {
    seo: { icon: Search, label: t("activity.category_seo", lang, tr) },
    ads: { icon: BarChart3, label: t("activity.category_ads", lang, tr) },
    website: { icon: Globe, label: t("activity.category_website", lang, tr) },
    automation: { icon: Zap, label: t("activity.category_automation", lang, tr) },
    general: { icon: Layers, label: t("activity.category_general", lang, tr) },
  };
}

function getRelativeDate(
  dateStr: string,
  lang: string,
  tr: Record<string, Record<string, Record<string, string>>>
): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t("common.today", lang, tr);
  if (diffDays === 1) return t("common.yesterday", lang, tr);
  if (diffDays < 7) return `${diffDays} ${t("common.days_ago", lang, tr)}`;
  if (diffDays < 14) return t("common.last_week", lang, tr);
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} ${t("common.weeks_ago", lang, tr)}`;

  // Locale-aware month formatting
  return date.toLocaleDateString(langToLocale(lang), { month: "short", day: "numeric" });
}

function groupByMonth(
  entries: ActivityEntry[],
  lang: string
): Record<string, ActivityEntry[]> {
  const locale = langToLocale(lang);
  const groups: Record<string, ActivityEntry[]> = {};
  for (const entry of entries) {
    const date = new Date(entry.created_at);
    const key = date.toLocaleDateString(locale, { month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  }
  return groups;
}

/* ------------------------------------------------------------------ */
/*  Main Activity Tab                                                   */
/* ------------------------------------------------------------------ */

export function ActivityTab({ lang, translations: tr, clientId }: ActivityTabProps) {
  const { data, isLoading } = useSWR<{ entries: ActivityEntry[] }>(
    `/api/activity?clientId=${clientId}`,
    fetcher,
    { refreshInterval: 60000 }
  );

  const entries = data?.entries ?? [];
  const grouped = groupByMonth(entries, lang);
  const categoryConfig = getCategoryConfig(lang, tr);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20">
        <div className="h-10 w-10 animate-spin border-2 border-current border-t-transparent opacity-20" style={{ borderRadius: 9999 }} />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center"
          style={{ backgroundColor: "var(--surface-2)", borderRadius: R }}
        >
          <ClipboardList className="h-8 w-8 opacity-30" />
        </div>
        <div>
          <p className="text-sm font-medium opacity-60">{t("activity.nothing_yet", lang, tr)}</p>
          <p className="mt-0.5 text-xs opacity-30">{t("activity.nothing_yet_sub", lang, tr)}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      {/* Summary bar */}
      <div
        className="flex items-center gap-3 p-4"
        style={{ backgroundColor: "var(--surface-1)", borderRadius: R }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center"
          style={{ backgroundColor: "var(--client-primary, #3b82f6)", borderRadius: R_SM }}
        >
          <ClipboardList className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xl font-bold tabular-nums">{entries.length}</p>
          <p className="text-xs opacity-40">{t("activity.total_actions", lang, tr)}</p>
        </div>
      </div>

      {/* Timeline grouped by month */}
      {Object.entries(grouped).map(([monthLabel, monthEntries]) => (
        <div key={monthLabel}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider opacity-40">
            {monthLabel}
          </h3>
          <div className="flex flex-col gap-2">
            {monthEntries.map((entry) => {
              const cat = categoryConfig[entry.category || "general"] || categoryConfig.general;
              const Icon = cat.icon;
              return (
                <div
                  key={entry.id}
                  className="flex gap-3 p-3"
                  style={{ backgroundColor: "var(--surface-1)", borderRadius: R }}
                >
                  {/* Category icon */}
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center"
                    style={{ backgroundColor: "var(--surface-2)", borderRadius: R_SM }}
                  >
                    <Icon className="h-4 w-4 opacity-50" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug">{entry.title}</p>
                    {entry.description && (
                      <p className="mt-0.5 text-xs leading-relaxed opacity-50">{entry.description}</p>
                    )}
                    <div className="mt-1.5 flex items-center gap-2">
                      <span
                        className="px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: "var(--surface-2)", opacity: 0.6, borderRadius: R_SM }}
                      >
                        {cat.label}
                      </span>
                      <span className="text-[10px] opacity-30">{getRelativeDate(entry.created_at, lang, tr)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
