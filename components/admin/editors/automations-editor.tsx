"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import {
  Plus, Trash2, ChevronDown, ChevronUp, Zap, ZapOff,
  RotateCcw, Pencil, Check, X, Settings, RefreshCw,
} from "lucide-react";
import { buildSystemPrompt } from "@/lib/automations/lead-reply/workflow";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Automation {
  id: string;
  client_id: string;
  name: string;
  description: string;
  automation_key: string;
  is_enabled: boolean;
  require_approval: boolean;
  counter_label: string;
  counter_value: number;
  sort_order: number;
  config: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface Props {
  clientId: string;
  clientSlug: string;
  token: string;
}

/* ------------------------------------------------------------------ */
/*  Preset templates for quick-add                                     */
/* ------------------------------------------------------------------ */

const PRESETS = [
  {
    automation_key: "lead_reply",
    name: "Auto-reply to new leads",
    description: "Automatically responds to new inquiries with a personalized message",
    counter_label: "leads replied",
  },
  {
    automation_key: "social_poster",
    name: "Social media posting",
    description: "Automatically publishes scheduled content to social media channels",
    counter_label: "posts published",
    comingSoon: true,
  },
  {
    automation_key: "review_collector",
    name: "Review collector",
    description: "Sends review requests to customers and tracks responses",
    counter_label: "reviews collected",
  },
  {
    automation_key: "report_generator",
    name: "Report generator",
    description: "Automatically generates and sends performance reports",
    counter_label: "reports sent",
    comingSoon: true,
  },
  {
    automation_key: "email_sequence",
    name: "Email sequence",
    description: "Drip email campaign triggered by lead actions",
    counter_label: "emails sent",
    comingSoon: true,
  },
];

/* ------------------------------------------------------------------ */
/*  Main                                                               */
/* ------------------------------------------------------------------ */

export function AutomationsEditor({ clientId, token }: Props) {
  const fetcher = useCallback(
    (url: string) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    [token]
  );

  const { data, mutate, isLoading } = useSWR<{ automations: Automation[] }>(
    `/api/automations?clientId=${clientId}`,
    fetcher
  );
  const automations = data?.automations ?? [];

  const [showPresets, setShowPresets] = useState(false);
  const [addingCustom, setAddingCustom] = useState(false);
  const [customKey, setCustomKey] = useState("");
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customLabel, setCustomLabel] = useState("actions completed");

  const existingKeys = new Set(automations.map((a) => a.automation_key));

  /* -- API helpers --------------------------------------------------- */

  async function createAutomation(preset: typeof PRESETS[0]) {
    await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        client_id: clientId,
        ...preset,
        sort_order: automations.length,
      }),
    });
    mutate();
    setShowPresets(false);
  }

  async function createCustom() {
    if (!customKey.trim() || !customName.trim()) return;
    await fetch("/api/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        client_id: clientId,
        automation_key: customKey.trim().toLowerCase().replace(/\s+/g, "_"),
        name: customName.trim(),
        description: customDesc.trim(),
        counter_label: customLabel.trim() || "actions completed",
        sort_order: automations.length,
      }),
    });
    mutate();
    setAddingCustom(false);
    setCustomKey("");
    setCustomName("");
    setCustomDesc("");
    setCustomLabel("actions completed");
  }

  async function updateAutomation(id: string, updates: Partial<Automation>) {
    await fetch("/api/automations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ id, ...updates }),
    });
    mutate();
  }

  async function deleteAutomation(id: string) {
    await fetch(`/api/automations?id=${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    mutate();
  }

  async function resetCounter(id: string) {
    await updateAutomation(id, { counter_value: 0 } as Partial<Automation>);
  }

  /* -- Render -------------------------------------------------------- */

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent opacity-40" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--adm-text)" }}>
            Automations
          </h3>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--adm-text-secondary)" }}>
            {automations.length} automation{automations.length !== 1 ? "s" : ""} configured —{" "}
            {automations.filter((a) => a.is_enabled).length} active
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowPresets(!showPresets); setAddingCustom(false); }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors"
            style={{ backgroundColor: "var(--adm-accent)", color: "white" }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add
          </button>
        </div>
      </div>

      {/* Preset selector */}
      {showPresets && (
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)" }}
        >
          <p className="mb-3 text-[11px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>
            Choose a preset or create custom
          </p>
          <div className="flex flex-col gap-2">
            {PRESETS.filter((p) => !existingKeys.has(p.automation_key)).map((preset) => (
              <button
                key={preset.automation_key}
                onClick={() => !preset.comingSoon && createAutomation(preset)}
                disabled={preset.comingSoon}
                className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 hover:enabled:border-[var(--adm-accent)]"
                style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
              >
                <Zap className="h-4 w-4 flex-shrink-0" style={{ color: preset.comingSoon ? "var(--adm-text-muted)" : "var(--adm-accent)" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold" style={{ color: "var(--adm-text)" }}>{preset.name}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--adm-text-secondary)" }}>{preset.description}</div>
                </div>
                {preset.comingSoon ? (
                  <span className="rounded-md px-2 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text-muted)" }}>
                    coming soon
                  </span>
                ) : (
                  <span className="rounded-md px-2 py-0.5 text-[9px] font-mono" style={{ backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text-muted)" }}>
                    {preset.automation_key}
                  </span>
                )}
              </button>
            ))}

            {PRESETS.filter((p) => !existingKeys.has(p.automation_key)).length === 0 && (
              <p className="text-[11px] text-center py-2" style={{ color: "var(--adm-text-secondary)" }}>
                All presets already added
              </p>
            )}

            <button
              onClick={() => setAddingCustom(!addingCustom)}
              className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-[11px] font-medium transition-colors hover:border-[var(--adm-accent)]"
              style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-muted)" }}
            >
              <Plus className="h-3.5 w-3.5" />
              Create custom automation
            </button>
          </div>

          {addingCustom && (
            <div className="mt-3 flex flex-col gap-2 border-t pt-3" style={{ borderColor: "var(--adm-border)" }}>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="automation_key"
                  className="rounded-md border px-2.5 py-1.5 text-xs font-mono outline-none"
                  style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)", color: "var(--adm-text)" }}
                />
                <input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Display name"
                  className="rounded-md border px-2.5 py-1.5 text-xs outline-none"
                  style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)", color: "var(--adm-text)" }}
                />
              </div>
              <input
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                placeholder="Description (shown to client)"
                className="rounded-md border px-2.5 py-1.5 text-xs outline-none"
                style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)", color: "var(--adm-text)" }}
              />
              <input
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Counter label (e.g. emails sent)"
                className="rounded-md border px-2.5 py-1.5 text-xs outline-none"
                style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)", color: "var(--adm-text)" }}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setAddingCustom(false)} className="rounded-md px-3 py-1.5 text-[11px] font-medium" style={{ color: "var(--adm-text-secondary)" }}>
                  Cancel
                </button>
                <button
                  onClick={createCustom}
                  disabled={!customKey.trim() || !customName.trim()}
                  className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
                  style={{ backgroundColor: "var(--adm-accent)" }}
                >
                  Create
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Automation list */}
      {automations.length === 0 && !showPresets && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12" style={{ borderColor: "var(--adm-border)" }}>
          <ZapOff className="h-8 w-8 opacity-20" />
          <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>No automations configured yet</p>
          <button onClick={() => setShowPresets(true)} className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white" style={{ backgroundColor: "var(--adm-accent)" }}>
            Add first automation
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {automations.map((a) => (
          <AutomationRow
            key={a.id}
            automation={a}
            onUpdate={updateAutomation}
            onDelete={deleteAutomation}
            onResetCounter={resetCounter}
            token={token}
          />
        ))}
      </div>

    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single row                                                         */
/* ------------------------------------------------------------------ */

type RowTab = "info" | "config" | "runs";

function AutomationRow({
  automation: a,
  onUpdate,
  onDelete,
  onResetCounter,
  token,
}: {
  automation: Automation;
  onUpdate: (id: string, u: Partial<Automation>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onResetCounter: (id: string) => Promise<void>;
  token: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<RowTab>("info");
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(a.counter_label);
  const [counterEdit, setCounterEdit] = useState(String(a.counter_value));
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    setBusy(true);
    const updates: Partial<Automation> = {};
    if (label !== a.counter_label) updates.counter_label = label;
    const cv = parseInt(counterEdit, 10);
    if (!isNaN(cv) && cv !== a.counter_value) updates.counter_value = cv;
    if (Object.keys(updates).length > 0) await onUpdate(a.id, updates);
    setBusy(false);
    setEditing(false);
  }

  function handleCancel() {
    setEditing(false);
    setLabel(a.counter_label);
    setCounterEdit(String(a.counter_value));
  }

  return (
    <div
      className="rounded-xl border transition-colors"
      style={{
        borderColor: a.is_enabled ? "color-mix(in srgb, var(--adm-accent) 30%, transparent)" : "var(--adm-border)",
        backgroundColor: "var(--adm-surface)",
      }}
    >
      {/* Collapsed header */}
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: a.is_enabled ? "color-mix(in srgb, var(--adm-accent) 12%, transparent)" : "var(--adm-surface-2)" }}
          >
            <Zap className="h-3.5 w-3.5" style={{ color: a.is_enabled ? "var(--adm-accent)" : "var(--adm-text-muted)", opacity: a.is_enabled ? 1 : 0.4 }} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold truncate" style={{ color: "var(--adm-text)" }}>{a.name}</span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-mono flex-shrink-0" style={{ backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text-muted)" }}>
                {a.automation_key}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-md px-2 py-1" style={{ backgroundColor: "var(--adm-surface-2)" }}>
            <span className="text-[11px] font-bold tabular-nums" style={{ color: "var(--adm-text)" }}>{a.counter_value}</span>
            <span className="text-[9px]" style={{ color: "var(--adm-text-secondary)" }}>{a.counter_label}</span>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); onUpdate(a.id, { is_enabled: !a.is_enabled }); }}
            className="relative h-5 w-9 flex-shrink-0 rounded-full transition-colors"
            style={{
              backgroundColor: a.is_enabled ? "var(--adm-accent)" : "var(--adm-surface-2)",
              border: a.is_enabled ? "none" : "1px solid var(--adm-border)",
            }}
          >
            <div className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all" style={{ left: a.is_enabled ? "calc(100% - 18px)" : "2px" }} />
          </button>

          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--adm-text-muted)" }} />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--adm-text-muted)" }} />
          )}
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t" style={{ borderColor: "var(--adm-border)" }}>
          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: "var(--adm-border)" }}>
            {(["info", "config", "runs"] as RowTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setEditing(false); }}
                className="px-4 py-2 text-[11px] font-semibold capitalize transition-colors"
                style={{
                  color: activeTab === tab ? "var(--adm-accent)" : "var(--adm-text-muted)",
                  borderBottom: activeTab === tab ? "2px solid var(--adm-accent)" : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                {tab === "config" ? (
                  <span className="flex items-center gap-1"><Settings className="h-3 w-3" /> Configure</span>
                ) : tab === "runs" ? "Runs" : "Info"}
              </button>
            ))}
          </div>

          {/* Info tab */}
          {activeTab === "info" && (
            <div className="px-4 py-3">
              {!editing ? (
                <div className="flex flex-col gap-3">
                  <p className="text-[11px]" style={{ color: "var(--adm-text-secondary)" }}>{a.description || "No description"}</p>
                  <div className="flex flex-wrap gap-3 text-[10px]">
                    <div>
                      <span style={{ color: "var(--adm-text-muted)" }}>Order: </span>
                      <span style={{ color: "var(--adm-text)" }}>{a.sort_order}</span>
                    </div>
                    <div>
                      <span style={{ color: "var(--adm-text-muted)" }}>Updated: </span>
                      <span style={{ color: "var(--adm-text)" }}>{new Date(a.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Require approval toggle */}
                  <div
                    className="flex items-center justify-between rounded-lg px-3 py-2.5"
                    style={{ backgroundColor: "var(--adm-surface-2)" }}
                  >
                    <div>
                      <p className="text-[11px] font-semibold" style={{ color: "var(--adm-text)" }}>
                        Require approval before sending
                      </p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--adm-text-muted)" }}>
                        Drafts go to a review queue — client approves before sending
                      </p>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); onUpdate(a.id, { require_approval: !a.require_approval }); }}
                      className="relative h-5 w-9 flex-shrink-0 rounded-full transition-colors"
                      style={{
                        backgroundColor: a.require_approval ? "var(--adm-accent)" : "var(--adm-surface)",
                        border: a.require_approval ? "none" : "1px solid var(--adm-border)",
                      }}
                    >
                      <div
                        className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
                        style={{ left: a.require_approval ? "calc(100% - 18px)" : "2px" }}
                      />
                    </button>
                  </div>

                  {/* Notify email — shown when approval mode is on */}
                  {a.require_approval && (
                    <div className="flex flex-col gap-1 rounded-lg px-3 py-2.5" style={{ backgroundColor: "var(--adm-surface-2)" }}>
                      <label className="text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>
                        Notify email when draft is waiting
                      </label>
                      <input
                        type="email"
                        defaultValue={(a.config.notify_email as string) ?? ""}
                        onBlur={(e) => {
                          const val = e.target.value.trim();
                          if (val !== ((a.config.notify_email as string) ?? "")) {
                            onUpdate(a.id, { config: { ...a.config, notify_email: val || undefined } });
                          }
                        }}
                        placeholder="owner@example.com"
                        className="w-full rounded border px-2 py-1 text-[11px] outline-none focus:ring-1"
                        style={{
                          backgroundColor: "var(--adm-surface)",
                          borderColor: "var(--adm-border)",
                          color: "var(--adm-text)",
                        }}
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[10px] font-medium transition-colors hover:bg-[var(--adm-surface-2)]"
                      style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-muted)" }}
                    >
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button
                      onClick={() => onResetCounter(a.id)}
                      className="flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[10px] font-medium transition-colors hover:bg-[var(--adm-surface-2)]"
                      style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-muted)" }}
                    >
                      <RotateCcw className="h-3 w-3" /> Reset counter
                    </button>
                    <button
                      onClick={() => { if (confirm("Delete this automation?")) onDelete(a.id); }}
                      className="flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-[10px] font-medium text-red-500 transition-colors hover:bg-red-50"
                      style={{ borderColor: "color-mix(in srgb, red 20%, var(--adm-border))" }}
                    >
                      <Trash2 className="h-3 w-3" /> Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>Counter Label</label>
                      <input value={label} onChange={(e) => setLabel(e.target.value)} className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }} />
                    </div>
                    <div>
                      <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>Counter Value</label>
                      <input type="number" value={counterEdit} onChange={(e) => setCounterEdit(e.target.value)} className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }} />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button onClick={handleCancel} className="flex items-center gap-1 rounded-md px-3 py-1.5 text-[11px] font-medium" style={{ color: "var(--adm-text-secondary)" }}>
                      <X className="h-3 w-3" /> Cancel
                    </button>
                    <button onClick={handleSave} disabled={busy} className="flex items-center gap-1 rounded-md px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50" style={{ backgroundColor: "var(--adm-accent)" }}>
                      <Check className="h-3 w-3" /> Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Config tab */}
          {activeTab === "config" && (
            <div className="px-4 py-3">
              {a.automation_key === "lead_reply" ? (
                <LeadReplyConfigPanel automation={a} onUpdate={onUpdate} />
              ) : a.automation_key === "review_collector" ? (
                <ReviewCollectorConfigPanel automation={a} onUpdate={onUpdate} />
              ) : a.automation_key === "social_poster" ? (
                <SocialPosterConfigPanel automation={a} onUpdate={onUpdate} />
              ) : (
                <p className="text-[11px]" style={{ color: "var(--adm-text-muted)" }}>
                  No configurable settings for this automation type.
                </p>
              )}
            </div>
          )}

          {/* Runs tab */}
          {activeTab === "runs" && (
            <RunsLog automationId={a.id} token={token} />
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Lead Reply config panel                                            */
/* ------------------------------------------------------------------ */

function LeadReplyConfigPanel({
  automation,
  onUpdate,
}: {
  automation: Automation;
  onUpdate: (id: string, u: Partial<Automation>) => Promise<void>;
}) {
  const cfg = (automation.config ?? {}) as Record<string, unknown>;

  const [fromName, setFromName] = useState((cfg.from_name as string) ?? "");
  const [fromEmail, setFromEmail] = useState((cfg.from_email as string) ?? "");
  const [ownerName, setOwnerName] = useState((cfg.owner_name as string) ?? "");
  const [businessName, setBusinessName] = useState((cfg.business_name as string) ?? "");
  const [signature, setSignature] = useState((cfg.signature as string) ?? "");
  const [voiceSamples, setVoiceSamples] = useState(
    Array.isArray(cfg.voice_samples) ? (cfg.voice_samples as string[]).join("\n---\n") : ""
  );
  const [emailExample, setEmailExample] = useState((cfg.email_example as string) ?? "");
  const [customInstructions, setCustomInstructions] = useState((cfg.custom_instructions as string) ?? "");
  const [customPrompt, setCustomPrompt] = useState((cfg.custom_prompt as string) ?? "");
  const [showAdvanced, setShowAdvanced] = useState(!!(cfg.custom_prompt as string));
  const [replyDelayMinutes, setReplyDelayMinutes] = useState(
    typeof cfg.reply_delay_minutes === "number" ? cfg.reply_delay_minutes : 0
  );
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setBusy(true);
    // Spread existing config to preserve any fields not in this UI (e.g. IMAP/SMTP credentials)
    await onUpdate(automation.id, {
      config: {
        ...cfg,
        from_name: fromName.trim(),
        from_email: fromEmail.trim(),
        owner_name: ownerName.trim(),
        business_name: businessName.trim(),
        signature: signature.trim(),
        voice_samples: voiceSamples
          .split("---")
          .map((s) => s.trim())
          .filter(Boolean),
        email_example: emailExample.trim() || undefined,
        custom_instructions: customInstructions.trim() || undefined,
        custom_prompt: customPrompt.trim() || undefined,
        reply_delay_minutes: replyDelayMinutes > 0 ? replyDelayMinutes : undefined,
      },
    } as Partial<Automation>);
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Inbound email info */}
      <div className="rounded-lg p-3 text-[10px]" style={{ backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text-secondary)" }}>
        <span className="font-semibold" style={{ color: "var(--adm-text)" }}>Inbound email: </span>
        The client&apos;s email account (IMAP/SMTP) is configured in the{" "}
        <span className="font-semibold" style={{ color: "var(--adm-accent)" }}>Email Account</span>
        {" "}section below. New emails are checked every 5 minutes via IMAP.
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Field label="From Name" value={fromName} onChange={setFromName} placeholder="Jane Smith" />
        <Field label="From Email" value={fromEmail} onChange={setFromEmail} placeholder="jane@business.com" type="email" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Owner Name" value={ownerName} onChange={setOwnerName} placeholder="Jane" />
        <Field label="Business Name" value={businessName} onChange={setBusinessName} placeholder="Acme Ltd" />
      </div>

      <TextareaField
        label="Signature"
        value={signature}
        onChange={setSignature}
        placeholder={"Best regards,\nJane Smith\nAcme Ltd · +1 555 123 4567"}
        rows={3}
      />

      <TextareaField
        label="Voice Samples"
        hint="Paste 7+ example replies the owner would write. More samples = better voice matching. Separate each with --- on its own line."
        value={voiceSamples}
        onChange={setVoiceSamples}
        placeholder={"Hi! Thanks for reaching out — we'd love to help.\n---\nGreat to hear from you! Let me know what you need and we'll sort it out."}
        rows={6}
      />

      <TextareaField
        label="Email Example"
        hint="Paste one real contact form notification email here. Claude uses this to understand the format of incoming emails."
        value={emailExample}
        onChange={setEmailExample}
        placeholder={"From: WordPress <noreply@business.com>\nSubject: New Contact Form Submission\n\nName: John Smith\nEmail: john@example.com\nMessage: Hi, I wanted to ask about..."}
        rows={6}
      />

      <TextareaField
        label="Additional Instructions"
        hint="Extra rules appended to the default prompt. Leave blank if using the full prompt override below."
        value={customInstructions}
        onChange={setCustomInstructions}
        placeholder={"Always mention the free consultation offer.\nNever quote specific prices — invite them to call instead."}
        rows={4}
      />

      {/* Advanced: full prompt override */}
      <div className="rounded-lg border" style={{ borderColor: "var(--adm-border)" }}>
        <button
          type="button"
          onClick={() => {
            if (!showAdvanced && !customPrompt.trim()) {
              // Pre-populate with the real generated default so the user can see and edit it
              const samples = voiceSamples.split("---").map((s) => s.trim()).filter(Boolean);
              setCustomPrompt(buildSystemPrompt({
                businessName: businessName.trim() || "the business",
                ownerName: ownerName.trim() || "the owner",
                voiceSamples: samples.length ? samples : ["(no voice samples yet)"],
                signature: signature.trim(),
                customInstructions: customInstructions.trim() || undefined,
              }));
            }
            setShowAdvanced((v) => !v);
          }}
          className="flex w-full items-center justify-between px-3 py-2.5 text-left"
        >
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold" style={{ color: "var(--adm-text)" }}>
              Advanced: Full Prompt
            </span>
            {customPrompt.trim() && (
              <span
                className="rounded-full px-2 py-0.5 text-[9px] font-semibold"
                style={{ backgroundColor: "color-mix(in srgb, var(--adm-accent) 15%, transparent)", color: "var(--adm-accent)" }}
              >
                Customised
              </span>
            )}
          </div>
          <ChevronDown
            className="h-3.5 w-3.5 transition-transform"
            style={{ color: "var(--adm-text-muted)", transform: showAdvanced ? "rotate(180deg)" : "none" }}
          />
        </button>
        {showAdvanced && (
          <div className="flex flex-col gap-2 border-t px-3 pb-3 pt-2.5" style={{ borderColor: "var(--adm-border)" }}>
            <div className="flex items-center justify-between">
              <p className="text-[10px] leading-relaxed" style={{ color: "var(--adm-text-muted)" }}>
                Edit the prompt directly. Voice samples and additional instructions above are bypassed when this is set.
                Clear entirely to go back to automatic generation.
              </p>
              <button
                type="button"
                onClick={() => {
                  const samples = voiceSamples.split("---").map((s) => s.trim()).filter(Boolean);
                  setCustomPrompt(buildSystemPrompt({
                    businessName: businessName.trim() || "the business",
                    ownerName: ownerName.trim() || "the owner",
                    voiceSamples: samples.length ? samples : ["(no voice samples yet)"],
                    signature: signature.trim(),
                    customInstructions: customInstructions.trim() || undefined,
                  }));
                }}
                className="ml-3 shrink-0 rounded px-2 py-1 text-[10px] font-semibold transition-colors"
                style={{ backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text-muted)" }}
              >
                Reset to default
              </button>
            </div>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              rows={14}
              className="w-full resize-y rounded-md border px-2.5 py-2 font-mono text-[11px] outline-none"
              style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
            />
          </div>
        )}
      </div>

      {/* Reply delay */}
      <div>
        <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>
          Reply Delay (minutes)
        </label>
        <p className="mb-1.5 text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
          Wait this long before sending. Set to 0 to reply immediately. Useful so replies don&apos;t look instant and robotic.
        </p>
        <input
          type="number"
          min={0}
          max={120}
          value={replyDelayMinutes}
          onChange={(e) => setReplyDelayMinutes(Math.max(0, parseInt(e.target.value, 10) || 0))}
          className="w-32 rounded-md border px-2.5 py-1.5 text-xs outline-none"
          style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
        />
      </div>

      <SaveButton busy={busy} saved={saved} onSave={handleSave} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Review Collector config panel                                      */
/* ------------------------------------------------------------------ */

function ReviewCollectorConfigPanel({
  automation,
  onUpdate,
}: {
  automation: Automation;
  onUpdate: (id: string, u: Partial<Automation>) => Promise<void>;
}) {
  const cfg = (automation.config ?? {}) as Record<string, unknown>;

  const [ownerName, setOwnerName] = useState((cfg.owner_name as string) ?? "");
  const [businessName, setBusinessName] = useState((cfg.business_name as string) ?? "");
  const [fromName, setFromName] = useState((cfg.from_name as string) ?? "");
  const [fromEmail, setFromEmail] = useState((cfg.from_email as string) ?? "");
  const [reviewPlatform, setReviewPlatform] = useState((cfg.review_platform as string) ?? "Trustpilot");
  const [reviewLink, setReviewLink] = useState((cfg.review_link as string) ?? "");
  const [voiceSamples, setVoiceSamples] = useState(
    Array.isArray(cfg.voice_samples) ? (cfg.voice_samples as string[]).join("\n---\n") : ""
  );
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setBusy(true);
    await onUpdate(automation.id, {
      config: {
        owner_name: ownerName.trim(),
        business_name: businessName.trim(),
        from_name: fromName.trim(),
        from_email: fromEmail.trim(),
        review_platform: reviewPlatform.trim(),
        review_link: reviewLink.trim(),
        voice_samples: voiceSamples
          .split("---")
          .map((s) => s.trim())
          .filter(Boolean),
      },
    } as Partial<Automation>);
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Owner Name" value={ownerName} onChange={setOwnerName} placeholder="Jane" />
        <Field label="Business Name" value={businessName} onChange={setBusinessName} placeholder="Acme Ltd" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="From Name" value={fromName} onChange={setFromName} placeholder="Jane Smith" />
        <Field label="From Email" value={fromEmail} onChange={setFromEmail} placeholder="jane@business.com" type="email" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="Review Platform" value={reviewPlatform} onChange={setReviewPlatform} placeholder="Trustpilot" />
        <Field label="Review Link" value={reviewLink} onChange={setReviewLink} placeholder="https://trustpilot.com/review/your-business" />
      </div>
      <TextareaField
        label="Voice Samples"
        hint="Paste 7+ example messages the owner would send. More samples = better voice matching. Separate each with --- on its own line."
        value={voiceSamples}
        onChange={setVoiceSamples}
        placeholder={"Thanks so much — it was a pleasure working with you! If you have a moment, a quick review would mean a lot.\n---\nReally glad we could help! We'd love to hear your feedback — it only takes a minute."}
        rows={5}
      />
      <SaveButton busy={busy} saved={saved} onSave={handleSave} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Social Poster config panel                                         */
/* ------------------------------------------------------------------ */

function SocialPosterConfigPanel({
  automation,
  onUpdate,
}: {
  automation: Automation;
  onUpdate: (id: string, u: Partial<Automation>) => Promise<void>;
}) {
  const cfg = (automation.config ?? {}) as Record<string, unknown>;

  const [ownerName, setOwnerName] = useState((cfg.owner_name as string) ?? "");
  const [businessName, setBusinessName] = useState((cfg.business_name as string) ?? "");
  const [platforms, setPlatforms] = useState((cfg.platforms as string) ?? "");
  const [hashtags, setHashtags] = useState((cfg.hashtags as string) ?? "");
  const [voiceSamples, setVoiceSamples] = useState(
    Array.isArray(cfg.voice_samples) ? (cfg.voice_samples as string[]).join("\n---\n") : ""
  );
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setBusy(true);
    await onUpdate(automation.id, {
      config: {
        owner_name: ownerName.trim(),
        business_name: businessName.trim(),
        platforms: platforms.trim(),
        hashtags: hashtags.trim(),
        voice_samples: voiceSamples
          .split("---")
          .map((s) => s.trim())
          .filter(Boolean),
      },
    } as Partial<Automation>);
    setBusy(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Owner Name" value={ownerName} onChange={setOwnerName} placeholder="Jane" />
        <Field label="Business Name" value={businessName} onChange={setBusinessName} placeholder="Acme Ltd" />
      </div>
      <Field
        label="Platforms"
        value={platforms}
        onChange={setPlatforms}
        placeholder="Instagram, Facebook"
      />
      <Field
        label="Hashtags"
        value={hashtags}
        onChange={setHashtags}
        placeholder="#yourbusiness #industry #location"
      />
      <TextareaField
        label="Voice Samples"
        hint="Paste 7+ example posts the owner would write. More samples = better voice matching. Separate each with --- on its own line."
        value={voiceSamples}
        onChange={setVoiceSamples}
        placeholder={"Just finished another great project — so proud of the team 💪 Swipe to see the before & after.\n---\nNew week, new opportunities. Here's what we've been working on lately 👇"}
        rows={6}
      />
      <SaveButton busy={busy} saved={saved} onSave={handleSave} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared field components                                            */
/* ------------------------------------------------------------------ */

function SaveButton({ busy, saved, onSave }: { busy: boolean; saved: boolean; onSave: () => void }) {
  return (
    <div className="flex justify-end pt-1">
      <button
        onClick={onSave}
        disabled={busy}
        className="flex items-center gap-1.5 rounded-md px-4 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50 transition-colors"
        style={{ backgroundColor: saved ? "#22c55e" : "var(--adm-accent)" }}
      >
        <Check className="h-3 w-3" /> {saved ? "Saved" : "Save config"}
      </button>
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
        style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
      />
    </div>
  );
}

function TextareaField({
  label, hint, value, onChange, placeholder, rows = 4,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>{label}</label>
      {hint && <p className="mb-1 text-[10px]" style={{ color: "var(--adm-text-muted)" }}>{hint}</p>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none resize-y font-mono"
        style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Runs log                                                           */
/* ------------------------------------------------------------------ */

interface AutomationRun {
  id: string;
  status: string;
  input_summary: string | null;
  output_summary: string | null;
  error: string | null;
  ran_at: string | null;
  process_after: string | null;
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  success:          { bg: "color-mix(in srgb, #22c55e 12%, transparent)", color: "#16a34a", label: "Success" },
  approved:         { bg: "color-mix(in srgb, #22c55e 12%, transparent)", color: "#16a34a", label: "Approved" },
  error:            { bg: "color-mix(in srgb, #ef4444 12%, transparent)", color: "#dc2626", label: "Error" },
  queued:           { bg: "color-mix(in srgb, #3b82f6 12%, transparent)", color: "#2563eb", label: "Queued" },
  pending_approval: { bg: "color-mix(in srgb, #f59e0b 12%, transparent)", color: "#d97706", label: "Pending approval" },
  discarded:        { bg: "color-mix(in srgb, #6b7280 12%, transparent)", color: "#6b7280", label: "Discarded" },
  pending:          { bg: "color-mix(in srgb, #6b7280 12%, transparent)", color: "#6b7280", label: "Pending" },
  running:          { bg: "color-mix(in srgb, #8b5cf6 12%, transparent)", color: "#7c3aed", label: "Running" },
};

function relativeTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function RunsLog({ automationId, token }: { automationId: string; token: string }) {
  const fetcher = useCallback(
    (url: string) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    [token]
  );
  const { data, isLoading, mutate } = useSWR<{ runs: AutomationRun[] }>(
    `/api/automations/runs?automation_id=${automationId}&limit=20`,
    fetcher,
    { revalidateOnMount: true, dedupingInterval: 0 }
  );

  const runs = data?.runs ?? [];

  return (
    <div className="px-4 py-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--adm-text-muted)" }}>
          Recent runs
        </span>
        <button
          onClick={() => mutate()}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors hover:bg-[var(--adm-surface-2)]"
          style={{ color: "var(--adm-text-muted)" }}
        >
          <RefreshCw className="h-3 w-3" /> Refresh
        </button>
      </div>

      {isLoading && (
        <p className="text-[11px] py-4 text-center" style={{ color: "var(--adm-text-muted)" }}>Loading…</p>
      )}

      {!isLoading && runs.length === 0 && (
        <p className="text-[11px] py-4 text-center" style={{ color: "var(--adm-text-muted)" }}>No runs yet</p>
      )}

      {runs.map((run) => {
        const style = STATUS_STYLES[run.status] ?? STATUS_STYLES.pending;
        const timestamp = run.ran_at ?? run.process_after;
        return (
          <div
            key={run.id}
            className="rounded-lg border p-3 flex flex-col gap-1.5"
            style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)" }}
          >
            <div className="flex items-center justify-between gap-2">
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: style.bg, color: style.color }}
              >
                {style.label}
              </span>
              <span className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
                {relativeTime(timestamp)}
              </span>
            </div>
            {run.input_summary && (
              <p className="text-[11px] leading-snug" style={{ color: "var(--adm-text-secondary)" }}>
                <span className="font-semibold" style={{ color: "var(--adm-text-muted)" }}>In: </span>
                {run.input_summary}
              </p>
            )}
            {run.output_summary && (
              <p className="text-[11px] leading-snug" style={{ color: "var(--adm-text-secondary)" }}>
                <span className="font-semibold" style={{ color: "var(--adm-text-muted)" }}>Out: </span>
                {run.output_summary}
              </p>
            )}
            {run.error && (
              <p className="text-[11px] leading-snug" style={{ color: "#dc2626" }}>
                <span className="font-semibold">Error: </span>
                {run.error}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
