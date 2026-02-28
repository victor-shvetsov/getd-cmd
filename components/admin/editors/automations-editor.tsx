"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import {
  Plus, Trash2, ChevronDown, ChevronUp, Zap, ZapOff,
  Copy, ExternalLink, RotateCcw, GripVertical, Pencil, Check, X,
} from "lucide-react";

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
  counter_label: string;
  counter_value: number;
  webhook_url: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

interface Props {
  clientId: string;
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
  },
  {
    automation_key: "email_sequence",
    name: "Email sequence",
    description: "Drip email campaign triggered by lead actions",
    counter_label: "emails sent",
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

  // Existing automation keys for this client
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

  /* -- Webhook URL --------------------------------------------------- */

  const webhookBase = typeof window !== "undefined" ? window.location.origin : "";
  const inboundUrl = `${webhookBase}/api/webhooks/automation`;

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
            {automations.length} automation{automations.length !== 1 ? "s" : ""} configured --{" "}
            {automations.filter((a) => a.is_enabled).length} active
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setShowPresets(!showPresets); setAddingCustom(false); }}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors"
            style={{
              backgroundColor: "var(--adm-accent)",
              color: "white",
            }}
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
                onClick={() => createAutomation(preset)}
                className="flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-[var(--adm-accent)]"
                style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
              >
                <Zap className="h-4 w-4 flex-shrink-0" style={{ color: "var(--adm-accent)" }} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold" style={{ color: "var(--adm-text)" }}>{preset.name}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "var(--adm-text-secondary)" }}>{preset.description}</div>
                </div>
                <span className="rounded-md px-2 py-0.5 text-[9px] font-mono" style={{ backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text-muted)" }}>
                  {preset.automation_key}
                </span>
              </button>
            ))}

            {PRESETS.filter((p) => !existingKeys.has(p.automation_key)).length === 0 && (
              <p className="text-[11px] text-center py-2" style={{ color: "var(--adm-text-secondary)" }}>
                All presets already added
              </p>
            )}

            {/* Custom add toggle */}
            <button
              onClick={() => setAddingCustom(!addingCustom)}
              className="flex items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-[11px] font-medium transition-colors hover:border-[var(--adm-accent)]"
              style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-muted)" }}
            >
              <Plus className="h-3.5 w-3.5" />
              Create custom automation
            </button>
          </div>

          {/* Custom form */}
          {addingCustom && (
            <div className="mt-3 flex flex-col gap-2 border-t pt-3" style={{ borderColor: "var(--adm-border)" }}>
              <div className="grid grid-cols-2 gap-2">
                <input
                  value={customKey}
                  onChange={(e) => setCustomKey(e.target.value)}
                  placeholder="automation_key (e.g. invoice_sender)"
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
                <button
                  onClick={() => setAddingCustom(false)}
                  className="rounded-md px-3 py-1.5 text-[11px] font-medium"
                  style={{ color: "var(--adm-text-secondary)" }}
                >
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
        <div
          className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-12"
          style={{ borderColor: "var(--adm-border)" }}
        >
          <ZapOff className="h-8 w-8 opacity-20" />
          <p className="text-xs" style={{ color: "var(--adm-text-secondary)" }}>No automations configured yet</p>
          <button
            onClick={() => setShowPresets(true)}
            className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white"
            style={{ backgroundColor: "var(--adm-accent)" }}
          >
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
          />
        ))}
      </div>

      {/* n8n Integration info */}
      {automations.length > 0 && (
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)" }}
        >
          <p className="mb-2 text-[11px] font-bold" style={{ color: "var(--adm-text)" }}>
            n8n Webhook Endpoint
          </p>
          <p className="mb-2 text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>
            n8n workflows can increment counters by POSTing to this endpoint.
            Send <code className="rounded bg-[var(--adm-surface)] px-1 py-0.5 text-[9px] font-mono">{'{ "client_id": "...", "automation_key": "lead_reply" }'}</code> to increment by 1,
            or add <code className="rounded bg-[var(--adm-surface)] px-1 py-0.5 text-[9px] font-mono">{'"increment": 5'}</code> for custom amounts.
          </p>
          <div className="flex items-center gap-2">
            <code
              className="flex-1 truncate rounded-md border px-2.5 py-1.5 text-[10px] font-mono"
              style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)", color: "var(--adm-text-muted)" }}
            >
              POST {inboundUrl}
            </code>
            <button
              onClick={() => navigator.clipboard.writeText(inboundUrl)}
              className="flex items-center gap-1 rounded-md border px-2 py-1.5 text-[10px] font-medium transition-colors hover:bg-[var(--adm-surface)]"
              style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-muted)" }}
            >
              <Copy className="h-3 w-3" /> Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Single row                                                         */
/* ------------------------------------------------------------------ */

function AutomationRow({
  automation: a,
  onUpdate,
  onDelete,
  onResetCounter,
}: {
  automation: Automation;
  onUpdate: (id: string, u: Partial<Automation>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onResetCounter: (id: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(a.name);
  const [desc, setDesc] = useState(a.description);
  const [label, setLabel] = useState(a.counter_label);
  const [webhookUrl, setWebhookUrl] = useState(a.webhook_url ?? "");
  const [counterEdit, setCounterEdit] = useState(String(a.counter_value));
  const [busy, setBusy] = useState(false);

  async function handleSave() {
    setBusy(true);
    const updates: Partial<Automation> = {};
    if (name !== a.name) updates.name = name;
    if (desc !== a.description) updates.description = desc;
    if (label !== a.counter_label) updates.counter_label = label;
    if (webhookUrl !== (a.webhook_url ?? "")) updates.webhook_url = webhookUrl || null;
    const cv = parseInt(counterEdit, 10);
    if (!isNaN(cv) && cv !== a.counter_value) updates.counter_value = cv;
    if (Object.keys(updates).length > 0) await onUpdate(a.id, updates);
    setBusy(false);
    setEditing(false);
  }

  function handleCancel() {
    setEditing(false);
    setName(a.name);
    setDesc(a.description);
    setLabel(a.counter_label);
    setWebhookUrl(a.webhook_url ?? "");
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
      <div
        className="flex items-center gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
            style={{
              backgroundColor: a.is_enabled
                ? "color-mix(in srgb, var(--adm-accent) 12%, transparent)"
                : "var(--adm-surface-2)",
            }}
          >
            <Zap
              className="h-3.5 w-3.5"
              style={{
                color: a.is_enabled ? "var(--adm-accent)" : "var(--adm-text-muted)",
                opacity: a.is_enabled ? 1 : 0.4,
              }}
            />
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
          {/* Counter badge */}
          <div
            className="flex items-center gap-1 rounded-md px-2 py-1"
            style={{ backgroundColor: "var(--adm-surface-2)" }}
          >
            <span className="text-[11px] font-bold tabular-nums" style={{ color: "var(--adm-text)" }}>
              {a.counter_value}
            </span>
            <span className="text-[9px]" style={{ color: "var(--adm-text-secondary)" }}>
              {a.counter_label}
            </span>
          </div>

          {/* Toggle */}
          <button
            onClick={(e) => { e.stopPropagation(); onUpdate(a.id, { is_enabled: !a.is_enabled }); }}
            className="relative h-5 w-9 flex-shrink-0 rounded-full transition-colors"
            style={{
              backgroundColor: a.is_enabled ? "var(--adm-accent)" : "var(--adm-surface-2)",
              border: a.is_enabled ? "none" : "1px solid var(--adm-border)",
            }}
          >
            <div
              className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all"
              style={{ left: a.is_enabled ? "calc(100% - 18px)" : "2px" }}
            />
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
        <div className="border-t px-4 py-3" style={{ borderColor: "var(--adm-border)" }}>
          {!editing ? (
            <div className="flex flex-col gap-3">
              <p className="text-[11px]" style={{ color: "var(--adm-text-secondary)" }}>{a.description || "No description"}</p>

              <div className="flex flex-wrap gap-3 text-[10px]">
                <div>
                  <span style={{ color: "var(--adm-text-muted)" }}>Webhook: </span>
                  <span className="font-mono" style={{ color: a.webhook_url ? "var(--adm-accent-text)" : "var(--adm-text-muted)" }}>
                    {a.webhook_url || "Not set"}
                  </span>
                </div>
                <div>
                  <span style={{ color: "var(--adm-text-muted)" }}>Order: </span>
                  <span style={{ color: "var(--adm-text)" }}>{a.sort_order}</span>
                </div>
                <div>
                  <span style={{ color: "var(--adm-text-muted)" }}>Updated: </span>
                  <span style={{ color: "var(--adm-text)" }}>{new Date(a.updated_at).toLocaleDateString()}</span>
                </div>
              </div>

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
                  <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>Name</label>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                    style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>Counter Label</label>
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                    style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>Description</label>
                <input
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                  style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>
                    Outbound Webhook URL
                    <span className="ml-1 font-normal" style={{ color: "var(--adm-text-secondary)" }}>(fires on toggle)</span>
                  </label>
                  <input
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://n8n.example.com/webhook/..."
                    className="w-full rounded-md border px-2.5 py-1.5 text-xs font-mono outline-none"
                    style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>Counter Value</label>
                  <input
                    type="number"
                    value={counterEdit}
                    onChange={(e) => setCounterEdit(e.target.value)}
                    className="w-full rounded-md border px-2.5 py-1.5 text-xs outline-none"
                    style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-1 rounded-md px-3 py-1.5 text-[11px] font-medium"
                  style={{ color: "var(--adm-text-secondary)" }}
                >
                  <X className="h-3 w-3" /> Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={busy}
                  className="flex items-center gap-1 rounded-md px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-50"
                  style={{ backgroundColor: "var(--adm-accent)" }}
                >
                  <Check className="h-3 w-3" /> Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
