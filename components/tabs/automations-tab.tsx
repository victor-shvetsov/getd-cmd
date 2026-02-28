"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { t } from "@/lib/i18n";
import { Zap, Mail, MessageCircle, Star, Bot, Clock, Check, X, ChevronDown, ChevronUp } from "lucide-react";

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

interface DraftRun {
  id: string;
  automation_id: string;
  draft_content: string;
  payload: Record<string, unknown>;
  input_summary: string;
  ran_at: string;
  automations: {
    name: string;
    automation_key: string;
  };
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
/*  Draft card                                                          */
/* ------------------------------------------------------------------ */

function DraftCard({
  draft,
  clientId,
  onDone,
}: {
  draft: DraftRun;
  clientId: string;
  onDone: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(draft.draft_content);
  const [busy, setBusy] = useState(false);

  const recipient =
    (draft.payload?.from_name as string) ||
    (draft.payload?.customer_name as string) ||
    (draft.payload?.from_email as string) ||
    (draft.payload?.customer_email as string) ||
    "Unknown";

  async function act(action: "approve" | "discard") {
    setBusy(true);
    await fetch(`/api/automations/drafts/${draft.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, client_id: clientId, content }),
    });
    setBusy(false);
    onDone();
  }

  return (
    <div
      className="flex flex-col rounded-xl border border-amber-200/60 overflow-hidden"
      style={{ backgroundColor: "var(--surface-1)" }}
    >
      {/* Header */}
      <button
        className="flex items-start gap-3 p-4 text-left"
        onClick={() => setExpanded(!expanded)}
      >
        <div
          className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: "rgba(245, 158, 11, 0.12)" }}
        >
          <Clock className="h-4 w-4 text-amber-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold">{draft.automations?.name}</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-700">
              Pending approval
            </span>
          </div>
          <p className="mt-0.5 text-[11px] opacity-50 truncate">{recipient}</p>
        </div>
        {expanded ? (
          <ChevronUp className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 opacity-30" />
        ) : (
          <ChevronDown className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 opacity-30" />
        )}
      </button>

      {/* Expanded: content + actions */}
      {expanded && (
        <div className="flex flex-col gap-3 border-t border-amber-100/60 px-4 pb-4 pt-3">
          {editing ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="w-full rounded-lg border p-3 text-xs leading-relaxed outline-none resize-y font-mono"
              style={{
                borderColor: "rgba(245, 158, 11, 0.3)",
                backgroundColor: "var(--surface-2)",
              }}
            />
          ) : (
            <pre
              className="whitespace-pre-wrap rounded-lg p-3 text-xs leading-relaxed"
              style={{ backgroundColor: "var(--surface-2)" }}
            >
              {content}
            </pre>
          )}

          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => setEditing(!editing)}
              className="text-[10px] font-medium opacity-40 hover:opacity-70 transition-opacity"
            >
              {editing ? "Done editing" : "Edit"}
            </button>
            <div className="flex gap-2">
              <button
                onClick={() => act("discard")}
                disabled={busy}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-40"
                style={{ backgroundColor: "var(--surface-2)" }}
              >
                <X className="h-3 w-3" /> Discard
              </button>
              <button
                onClick={() => act("approve")}
                disabled={busy}
                className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition-colors disabled:opacity-40"
                style={{ backgroundColor: "var(--client-primary, #3b82f6)" }}
              >
                <Check className="h-3 w-3" /> {editing ? "Save & send" : "Approve & send"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
  lang,
  tr,
}: {
  automation: Automation;
  onToggle: (id: string, enabled: boolean) => Promise<void>;
  lang: string;
  tr: Record<string, Record<string, Record<string, string>>>;
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
          <span className="text-xs opacity-40">{automation.counter_label} {t("automations.this_month", lang, tr)}</span>
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
          {optimisticEnabled ? t("automations.running", lang, tr) : t("automations.paused", lang, tr)}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Automations Tab                                                */
/* ------------------------------------------------------------------ */

export function AutomationsTab({ lang, translations: tr, clientId }: AutomationsTabProps) {
  const { data, isLoading, mutate } = useSWR<{ automations: Automation[] }>(
    `/api/automations?clientId=${clientId}`,
    fetcher,
    { refreshInterval: 30000 }
  );

  const { data: draftsData, mutate: mutateDrafts } = useSWR<{ drafts: DraftRun[] }>(
    `/api/automations/drafts?clientId=${clientId}`,
    fetcher,
    { refreshInterval: 15000 }
  );

  const automations = data?.automations ?? [];
  const drafts = draftsData?.drafts ?? [];

  const handleToggle = useCallback(
    async (automationId: string, enabled: boolean) => {
      await fetch("/api/automations/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ automation_id: automationId, client_id: clientId, is_enabled: enabled }),
      });
      mutate();
    },
    [clientId, mutate]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-4 py-20">
        <div className="h-10 w-10 animate-spin border-2 border-current border-t-transparent opacity-20" style={{ borderRadius: 9999 }} />
      </div>
    );
  }

  if (automations.length === 0 && drafts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
        <div
          className="flex h-16 w-16 items-center justify-center"
          style={{ backgroundColor: "var(--surface-2)", borderRadius: R }}
        >
          <Zap className="h-8 w-8 opacity-30" />
        </div>
        <div>
          <p className="text-sm font-medium opacity-60">{t("automations.no_automations", lang, tr)}</p>
          <p className="mt-0.5 text-xs opacity-30">{t("automations.no_automations_sub", lang, tr)}</p>
        </div>
      </div>
    );
  }

  // Count active automations and total counter
  const activeCount = automations.filter((a) => a.is_enabled).length;
  const totalActions = automations.reduce((sum, a) => sum + a.counter_value, 0);

  return (
    <div className="flex flex-col gap-4 px-4 py-5">
      {/* Pending drafts queue */}
      {drafts.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            <p className="text-sm font-semibold">
              {drafts.length} {drafts.length === 1 ? "draft" : "drafts"} waiting for your approval
            </p>
          </div>
          {drafts.map((draft) => (
            <DraftCard
              key={draft.id}
              draft={draft}
              clientId={clientId}
              onDone={() => { mutateDrafts(); mutate(); }}
            />
          ))}
          <div className="h-px" style={{ backgroundColor: "var(--surface-2)" }} />
        </div>
      )}

      {/* Summary bar */}
      {automations.length > 0 && (
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
              {activeCount} / {automations.length} {t("automations.x_of_y_active", lang, tr)}
            </p>
            {totalActions > 0 && (
              <p className="text-xs opacity-40">{totalActions} {t("automations.automated_actions", lang, tr)}</p>
            )}
          </div>
        </div>
      )}

      {/* Automation cards */}
      <div className="flex flex-col gap-3">
        {automations.map((automation) => (
          <AutomationCard key={automation.id} automation={automation} onToggle={handleToggle} lang={lang} tr={tr} />
        ))}
      </div>
    </div>
  );
}
