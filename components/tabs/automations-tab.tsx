"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { Zap, Mail, MessageCircle, Star, Bot } from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Automation {
  id: string;
  name: string;
  description: string;
  automation_key: string;
  is_enabled: boolean;
  counter_label: string;
  counter_value: number;
  sort_order: number;
}

interface AutomationsTabProps {
  data: unknown;
  lang: string;
  translations: Record<string, Record<string, Record<string, string>>>;
  clientId: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const R = "var(--client-radius, 0.75rem)";
const R_SM = "calc(var(--client-radius, 0.75rem) * 0.65)";

// Map automation keys to icons for the 3 core automations
const KEY_ICONS: Record<string, typeof Zap> = {
  lead_reply: Mail,
  social_poster: MessageCircle,
  review_collector: Star,
};

/* ------------------------------------------------------------------ */
/*  Toggle Switch                                                       */
/* ------------------------------------------------------------------ */

function Toggle({
  enabled,
  loading,
  onToggle,
}: {
  enabled: boolean;
  loading: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      className="relative flex h-7 w-12 flex-shrink-0 items-center transition-colors duration-200"
      style={{
        backgroundColor: enabled ? "var(--client-primary, #3b82f6)" : "var(--surface-3, #ccc)",
        opacity: loading ? 0.5 : 1,
        borderRadius: 9999,
      }}
      role="switch"
      aria-checked={enabled}
    >
      <span
        className="block h-[22px] w-[22px] bg-white shadow transition-transform duration-200"
        style={{
          borderRadius: 9999,
          transform: enabled ? "translateX(23px)" : "translateX(3px)",
        }}
      />
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Automation Card                                                     */
/* ------------------------------------------------------------------ */

function AutomationCard({
  automation,
  onToggle,
}: {
  automation: Automation;
  onToggle: (id: string, enabled: boolean) => Promise<void>;
}) {
  const [loading, setLoading] = useState(false);
  const [optimisticEnabled, setOptimisticEnabled] = useState(automation.is_enabled);

  const Icon = KEY_ICONS[automation.automation_key] || Bot;

  const handleToggle = async () => {
    const newState = !optimisticEnabled;
    setOptimisticEnabled(newState);
    setLoading(true);
    try {
      await onToggle(automation.id, newState);
    } catch {
      // Revert on failure
      setOptimisticEnabled(!newState);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="flex flex-col gap-3 p-4"
      style={{ backgroundColor: "var(--surface-1)", borderRadius: R }}
    >
      {/* Header row: icon + name + toggle */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 flex-shrink-0 items-center justify-center transition-colors"
          style={{
            borderRadius: R_SM,
            backgroundColor: optimisticEnabled
              ? "var(--client-primary, #3b82f6)"
              : "var(--surface-2)",
          }}
        >
          <Icon
            className="h-5 w-5 transition-colors"
            style={{ color: optimisticEnabled ? "#fff" : "currentColor", opacity: optimisticEnabled ? 1 : 0.4 }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold leading-snug">{automation.name}</h3>
          <p className="mt-0.5 text-xs leading-relaxed opacity-50">{automation.description}</p>
        </div>
        <Toggle enabled={optimisticEnabled} loading={loading} onToggle={handleToggle} />
      </div>

      {/* Counter */}
      {automation.counter_value > 0 && (
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ backgroundColor: "var(--surface-2)", borderRadius: R_SM }}
        >
          <span
            className="text-lg font-bold tabular-nums"
            style={{ color: optimisticEnabled ? "var(--client-primary, #3b82f6)" : "inherit", opacity: optimisticEnabled ? 1 : 0.4 }}
          >
            {automation.counter_value}
          </span>
          <span className="text-xs opacity-40">{automation.counter_label} this month</span>
        </div>
      )}

      {/* Status indicator */}
      <div className="flex items-center gap-1.5">
        <div
          className="h-1.5 w-1.5"
          style={{
            borderRadius: 9999,
            backgroundColor: optimisticEnabled ? "#16a34a" : "var(--surface-3)",
          }}
        />
        <span className="text-[10px] font-medium" style={{ opacity: optimisticEnabled ? 0.6 : 0.3 }}>
          {optimisticEnabled ? "Running" : "Paused"}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Automations Tab                                                */
/* ------------------------------------------------------------------ */

export function AutomationsTab({ clientId }: AutomationsTabProps) {
  const { data, isLoading, mutate } = useSWR<{ automations: Automation[] }>(
    `/api/automations?clientId=${clientId}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  const automations = data?.automations ?? [];

  const handleToggle = useCallback(
    async (automationId: string, enabled: boolean) => {
      await fetch("/api/automations", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automationId, enabled }),
      });
      mutate();
    },
    [mutate]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20">
        <div className="h-10 w-10 animate-spin border-2 border-current border-t-transparent opacity-20" style={{ borderRadius: 9999 }} />
      </div>
    );
  }

  if (automations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center"
          style={{ backgroundColor: "var(--surface-2)", borderRadius: R }}
        >
          <Zap className="h-8 w-8 opacity-30" />
        </div>
        <div>
          <p className="text-sm font-medium opacity-60">No automations set up yet</p>
          <p className="mt-0.5 text-xs opacity-30">Your automated workflows will appear here</p>
        </div>
      </div>
    );
  }

  // Count active automations and total counter
  const activeCount = automations.filter((a) => a.is_enabled).length;
  const totalActions = automations.reduce((sum, a) => sum + a.counter_value, 0);

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      {/* Summary bar */}
      <div
        className="flex items-center gap-4 p-4"
        style={{ backgroundColor: "var(--surface-1)", borderRadius: R }}
      >
        <div
          className="flex h-10 w-10 items-center justify-center"
          style={{ backgroundColor: "var(--client-primary, #3b82f6)", borderRadius: R_SM }}
        >
          <Zap className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium">
            {activeCount} of {automations.length} active
          </p>
          {totalActions > 0 && (
            <p className="text-xs opacity-40">{totalActions} automated actions this month</p>
          )}
        </div>
      </div>

      {/* Automation cards */}
      <div className="flex flex-col gap-3">
        {automations.map((automation) => (
          <AutomationCard key={automation.id} automation={automation} onToggle={handleToggle} />
        ))}
      </div>
    </div>
  );
}
