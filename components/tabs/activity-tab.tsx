"use client";

import useSWR from "swr";
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

const CATEGORY_CONFIG: Record<string, { icon: typeof Globe; label: string }> = {
  seo: { icon: Search, label: "SEO" },
  ads: { icon: BarChart3, label: "Ads" },
  website: { icon: Globe, label: "Website" },
  automation: { icon: Zap, label: "Automation" },
  general: { icon: Layers, label: "General" },
};

function getRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "Last week";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function groupByMonth(entries: ActivityEntry[]): Record<string, ActivityEntry[]> {
  const groups: Record<string, ActivityEntry[]> = {};
  for (const entry of entries) {
    const date = new Date(entry.created_at);
    const key = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  }
  return groups;
}

/* ------------------------------------------------------------------ */
/*  Main Activity Tab                                                   */
/* ------------------------------------------------------------------ */

export function ActivityTab({ clientId }: ActivityTabProps) {
  const { data, isLoading } = useSWR<{ entries: ActivityEntry[] }>(
    `/api/activity?clientId=${clientId}`,
    fetcher,
    { refreshInterval: 60000 }
  );

  const entries = data?.entries ?? [];
  const grouped = groupByMonth(entries);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-current border-t-transparent opacity-20" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: "var(--surface-2)" }}
        >
          <ClipboardList className="h-8 w-8 opacity-30" />
        </div>
        <div>
          <p className="text-sm font-medium opacity-60">Nothing to show yet</p>
          <p className="mt-0.5 text-xs opacity-30">Activity updates will appear here as work progresses</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-4 py-5">
      {/* Summary bar */}
      <div
        className="flex items-center gap-3 rounded-2xl p-4"
        style={{ backgroundColor: "var(--surface-1)" }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: "var(--client-primary, #3b82f6)" }}
        >
          <ClipboardList className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-xl font-bold tabular-nums">{entries.length}</p>
          <p className="text-xs opacity-40">things we did for you</p>
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
              const cat = CATEGORY_CONFIG[entry.category || "general"] || CATEGORY_CONFIG.general;
              const Icon = cat.icon;
              return (
                <div
                  key={entry.id}
                  className="flex gap-3 rounded-xl p-3"
                  style={{ backgroundColor: "var(--surface-1)" }}
                >
                  {/* Category icon */}
                  <div
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: "var(--surface-2)" }}
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
                        className="rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: "var(--surface-2)", opacity: 0.6 }}
                      >
                        {cat.label}
                      </span>
                      <span className="text-[10px] opacity-30">{getRelativeDate(entry.created_at)}</span>
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
