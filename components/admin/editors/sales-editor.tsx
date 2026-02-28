"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import {
  Save,
  Check,
  Plus,
  Trash2,
  ChevronDown,
  Target,
  Package,
  ShoppingCart,
  Zap,
  Webhook,
  Database,
  Copy,
  Clock,
  Tag,
  AlertCircle,
  ArrowRight,
  ArrowUpDown,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SalesEditorProps {
  clientId: string;
  clientSlug: string;
  clientName: string;
  currency: string;
  token: string;
}

interface TabRow {
  id: string;
  client_id: string;
  tab_key: string;
  data: Record<string, unknown>;
  sort_order: number;
  is_visible: boolean;
}

interface ProductCategory {
  id: string;
  name: string;
  sort_order: number;
}

interface SalesEntry {
  id: string;
  client_id: string;
  amount: number;
  currency: string;
  category_name: string;
  customer_name: string | null;
  description: string | null;
  source: string | null;
  external_ref: string | null;
  sold_at: string;
}

interface SyncInfo {
  total_entries: number;
  untagged_count: number;
  last_entry_at: string | null;
  sources: { source: string; count: number }[];
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SalesEditor({ clientId, clientSlug, clientName, currency, token }: SalesEditorProps) {
  const authFetcher = useCallback(
    (url: string) =>
      fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    [token]
  );

  // Fetch the "sales" tab row from client_tabs
  const { data: tabs, mutate: mutateTabs } = useSWR<TabRow[]>(
    `/api/admin/clients/${clientId}/tabs`,
    authFetcher
  );
  const salesTab = tabs?.find((t) => t.tab_key === "sales") ?? null;

  // Fetch entries for current month
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`
  );
  const { data: salesData, mutate: mutateSales } = useSWR<{
    entries: SalesEntry[];
    entry_count: number;
    total_revenue: number;
    revenue_goal: number;
    product_categories: ProductCategory[];
  }>(
    `/api/sales?clientId=${clientId}&month=${viewMonth}`,
    authFetcher
  );

  // Sync info
  const { data: syncInfo } = useSWR<SyncInfo>(
    `/api/admin/clients/${clientId}/sync-info`,
    authFetcher
  );

  // Local state for editing config
  const [revenueGoal, setRevenueGoal] = useState<string>("0");
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [configDirty, setConfigDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  // Manual entry form
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [entryAmount, setEntryAmount] = useState("");
  const [entryCategory, setEntryCategory] = useState("");
  const [entryCustomer, setEntryCustomer] = useState("");
  const [entryDescription, setEntryDescription] = useState("");
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split("T")[0]);
  const [addingEntry, setAddingEntry] = useState(false);

  // Pipeline section
  const [pipelineOpen, setPipelineOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [n8nFieldsOpen, setN8nFieldsOpen] = useState(false);
  const [webhookOpen, setWebhookOpen] = useState(false);

  // Sync from API data into local state
  useEffect(() => {
    if (salesData) {
      setRevenueGoal(String(salesData.revenue_goal || 0));
      setCategories(salesData.product_categories || []);
      setConfigDirty(false);
    }
  }, [salesData]);

  /* ---- Config persistence ---- */

  const handleSaveConfig = useCallback(async () => {
    if (!salesTab) {
      // Create the sales tab first
      await fetch(`/api/admin/clients/${clientId}/tabs`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tab_key: "sales",
          data: {
            revenue_goal: Number(revenueGoal) || 0,
            product_categories: categories,
          },
          sort_order: (tabs?.length ?? 0) + 1,
          is_visible: true,
        }),
      });
    } else {
      await fetch(`/api/admin/clients/${clientId}/tabs`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tabId: salesTab.id,
          data: {
            ...salesTab.data,
            revenue_goal: Number(revenueGoal) || 0,
            product_categories: categories,
          },
        }),
      });
    }
    setSaving(false);
    setJustSaved(true);
    setConfigDirty(false);
    setTimeout(() => setJustSaved(false), 2000);
    await mutateTabs();
    await mutateSales();
  }, [salesTab, clientId, token, revenueGoal, categories, tabs, mutateTabs, mutateSales]);

  const handleConfigSave = useCallback(async () => {
    setSaving(true);
    await handleSaveConfig();
  }, [handleSaveConfig]);

  /* ---- Category management ---- */

  const addCategory = () => {
    if (!newCatName.trim()) return;
    const next: ProductCategory = {
      id: crypto.randomUUID(),
      name: newCatName.trim(),
      sort_order: categories.length,
    };
    setCategories([...categories, next]);
    setNewCatName("");
    setConfigDirty(true);
  };

  const removeCategory = (id: string) => {
    setCategories(categories.filter((c) => c.id !== id));
    setConfigDirty(true);
  };

  const renameCategory = (id: string, name: string) => {
    setCategories(categories.map((c) => (c.id === id ? { ...c, name } : c)));
    setConfigDirty(true);
  };

  const moveCategory = (idx: number, dir: -1 | 1) => {
    const next = [...categories];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    next.forEach((c, i) => (c.sort_order = i));
    setCategories(next);
    setConfigDirty(true);
  };

  /* ---- Manual entry ---- */

  const handleAddEntry = useCallback(async () => {
    if (!entryAmount) return;
    setAddingEntry(true);
    await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        amount: Number(entryAmount),
        categoryName: entryCategory || "Other",
        customerName: entryCustomer || null,
        description: entryDescription || null,
        currency,
        soldAt: new Date(entryDate).toISOString(),
        source: "manual",
      }),
    });
    setEntryAmount("");
    setEntryCategory("");
    setEntryCustomer("");
    setEntryDescription("");
    setAddingEntry(false);
    setShowAddEntry(false);
    await mutateSales();
  }, [clientId, entryAmount, entryCategory, entryCustomer, entryDescription, entryDate, currency, mutateSales]);

  const handleDeleteEntry = useCallback(
    async (id: string) => {
      await fetch(`/api/sales?id=${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await mutateSales();
    },
    [token, mutateSales]
  );

  /* ---- Copy helper ---- */

  const handleCopy = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const CopyBtn = ({ text, field, label }: { text: string; field: string; label?: string }) => (
    <button
      onClick={() => handleCopy(text, field)}
      className="flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium transition-colors"
      style={{
        backgroundColor: copiedField === field
          ? "color-mix(in srgb, var(--adm-success) 15%, transparent)"
          : "var(--adm-surface-2)",
        color: copiedField === field ? "var(--adm-success)" : "var(--adm-text-secondary)",
      }}
    >
      {copiedField === field ? <><Check className="h-3 w-3" /> Copied</> : <><Copy className="h-3 w-3" /> {label || "Copy"}</>}
    </button>
  );

  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/sales` : "/api/webhooks/sales";

  const n8nMapping = JSON.stringify({
    client_id: clientId,
    amount: "={{ $json.invoice_amount }}",
    currency: currency || "DKK",
    category_name: "={{ $json.product_category }}",
    customer_name: "={{ $json.customer_name }}",
    description: "={{ $json.description }}",
    external_ref: "={{ $json.invoice_number }}",
    sold_at: "={{ $json.invoice_date }}",
    source: "={{ $json.ai_tag || null }}",
  }, null, 2);

  const webhookPayload = JSON.stringify({
    client_slug: clientSlug,
    entries: [{
      amount: 45000, currency: currency || "DKK", category_name: "Example Category",
      customer_name: "Example Customer", sold_at: "2026-02-25T10:00:00Z", source: null,
    }],
  }, null, 2);

  /* ---- Month navigation ---- */
  const prevMonth = () => {
    const [y, m] = viewMonth.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const nextMonth = () => {
    const [y, m] = viewMonth.split("-").map(Number);
    const d = new Date(y, m, 1);
    setViewMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  };
  const monthLabel = (() => {
    const [y, m] = viewMonth.split("-").map(Number);
    return new Date(y, m - 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  })();

  return (
    <div className="flex flex-col gap-5">
      {/* ============================================================ */}
      {/*  SECTION 1: Revenue Goal                                     */}
      {/* ============================================================ */}
      <div className="rounded-xl border p-5" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}>
        <div className="mb-4 flex items-center gap-2">
          <Target className="h-4 w-4" style={{ color: "var(--adm-accent-text)" }} />
          <h3 className="text-sm font-bold">Revenue Goal</h3>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-medium" style={{ color: "var(--adm-text-muted)" }}>
              Monthly target ({currency})
            </label>
            <input
              type="number"
              value={revenueGoal}
              onChange={(e) => { setRevenueGoal(e.target.value); setConfigDirty(true); }}
              className="h-10 w-full max-w-xs rounded-lg border px-3 text-sm tabular-nums outline-none focus:ring-1"
              style={{
                borderColor: "var(--adm-border)",
                backgroundColor: "var(--adm-bg)",
                color: "var(--adm-text)",
                "--tw-ring-color": "var(--adm-accent)",
              } as React.CSSProperties}
            />
          </div>
          {salesData && (
            <div className="pb-1 text-right">
              <p className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>Current month</p>
              <p className="text-sm font-bold tabular-nums" style={{ color: "var(--adm-text)" }}>
                {salesData.total_revenue.toLocaleString()} / {Number(revenueGoal).toLocaleString()} {currency}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/*  SECTION 2: Product Categories                               */}
      {/* ============================================================ */}
      <div className="rounded-xl border p-5" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}>
        <div className="mb-4 flex items-center gap-2">
          <Package className="h-4 w-4" style={{ color: "var(--adm-accent-text)" }} />
          <h3 className="text-sm font-bold">Product Categories</h3>
          <span className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
            {categories.length} categor{categories.length === 1 ? "y" : "ies"}
          </span>
        </div>

        {categories.length > 0 && (
          <div className="mb-3 flex flex-col gap-1.5">
            {categories.map((cat, idx) => (
              <div
                key={cat.id}
                className="flex items-center gap-2 rounded-lg border px-3 py-2"
                style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-bg)" }}
              >
                <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded text-[10px] font-bold" style={{ backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text-muted)" }}>
                  {idx + 1}
                </span>
                <input
                  type="text"
                  value={cat.name}
                  onChange={(e) => renameCategory(cat.id, e.target.value)}
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: "var(--adm-text)" }}
                />
                <button onClick={() => moveCategory(idx, -1)} disabled={idx === 0} className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[var(--adm-surface-2)] disabled:opacity-30" style={{ color: "var(--adm-text-muted)" }}>
                  <ArrowUpDown className="h-3 w-3" />
                </button>
                <button onClick={() => removeCategory(cat.id)} className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[var(--adm-surface-2)]" style={{ color: "var(--adm-danger-text)" }}>
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCategory()}
            placeholder="New category name..."
            className="h-9 flex-1 rounded-lg border px-3 text-sm outline-none focus:ring-1"
            style={{
              borderColor: "var(--adm-border)", backgroundColor: "var(--adm-bg)", color: "var(--adm-text)",
              "--tw-ring-color": "var(--adm-accent)",
            } as React.CSSProperties}
          />
          <button
            onClick={addCategory}
            disabled={!newCatName.trim()}
            className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-white transition-colors disabled:opacity-40"
            style={{ backgroundColor: "var(--adm-accent)" }}
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/*  CONFIG SAVE BAR                                              */}
      {/* ============================================================ */}
      {configDirty && (
        <div
          className="sticky bottom-4 z-20 flex items-center justify-between rounded-xl border px-5 py-3 shadow-lg"
          style={{ borderColor: "var(--adm-accent)", backgroundColor: "var(--adm-surface)" }}
        >
          <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>
            Unsaved changes to revenue goal or categories
          </span>
          <button
            onClick={handleConfigSave}
            disabled={saving}
            className="flex h-8 items-center gap-1.5 rounded-lg px-4 text-xs font-semibold text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--adm-accent)" }}
          >
            {justSaved ? <><Check className="h-3.5 w-3.5" /> Saved</> : saving ? <><Save className="h-3.5 w-3.5 animate-pulse" /> Saving...</> : <><Save className="h-3.5 w-3.5" /> Save Config</>}
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/*  SECTION 3: Sales Entries                                     */}
      {/* ============================================================ */}
      <div className="rounded-xl border p-5" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" style={{ color: "var(--adm-accent-text)" }} />
            <h3 className="text-sm font-bold">Sales Entries</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="flex h-7 w-7 items-center justify-center rounded-md text-xs transition-colors hover:bg-[var(--adm-surface-2)]" style={{ color: "var(--adm-text-muted)" }}>{"<"}</button>
            <span className="min-w-[120px] text-center text-xs font-semibold">{monthLabel}</span>
            <button onClick={nextMonth} className="flex h-7 w-7 items-center justify-center rounded-md text-xs transition-colors hover:bg-[var(--adm-surface-2)]" style={{ color: "var(--adm-text-muted)" }}>{">"}</button>
          </div>
        </div>

        {/* Add entry form */}
        <div className="mb-3">
          {!showAddEntry ? (
            <button
              onClick={() => setShowAddEntry(true)}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-dashed px-3 text-xs font-medium transition-colors hover:border-[var(--adm-border-hover)]"
              style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-secondary)" }}
            >
              <Plus className="h-3.5 w-3.5" /> Add manual entry
            </button>
          ) : (
            <div
              className="flex flex-col gap-3 rounded-lg border p-4"
              style={{ borderColor: "var(--adm-accent)", backgroundColor: "var(--adm-bg)" }}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium" style={{ color: "var(--adm-text-muted)" }}>Amount *</label>
                  <input type="number" value={entryAmount} onChange={(e) => setEntryAmount(e.target.value)} placeholder="0" className="h-8 rounded-md border px-2 text-sm outline-none" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)", color: "var(--adm-text)" }} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium" style={{ color: "var(--adm-text-muted)" }}>Category</label>
                  <select value={entryCategory} onChange={(e) => setEntryCategory(e.target.value)} className="h-8 rounded-md border px-2 text-sm outline-none" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)", color: "var(--adm-text)" }}>
                    <option value="">Other</option>
                    {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium" style={{ color: "var(--adm-text-muted)" }}>Customer</label>
                  <input type="text" value={entryCustomer} onChange={(e) => setEntryCustomer(e.target.value)} placeholder="Optional" className="h-8 rounded-md border px-2 text-sm outline-none" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)", color: "var(--adm-text)" }} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-medium" style={{ color: "var(--adm-text-muted)" }}>Date</label>
                  <input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="h-8 rounded-md border px-2 text-sm outline-none" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)", color: "var(--adm-text)" }} />
                </div>
                <div className="flex flex-col gap-1 sm:col-span-2">
                  <label className="text-[10px] font-medium" style={{ color: "var(--adm-text-muted)" }}>Description</label>
                  <input type="text" value={entryDescription} onChange={(e) => setEntryDescription(e.target.value)} placeholder="Optional" className="h-8 rounded-md border px-2 text-sm outline-none" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)", color: "var(--adm-text)" }} />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleAddEntry} disabled={!entryAmount || addingEntry} className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white disabled:opacity-50" style={{ backgroundColor: "var(--adm-accent)" }}>
                  {addingEntry ? "Adding..." : "Add Entry"}
                </button>
                <button onClick={() => setShowAddEntry(false)} className="flex h-8 items-center rounded-lg border px-3 text-xs" style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-muted)" }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Entries table */}
        {salesData && salesData.entries.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ color: "var(--adm-text-muted)" }}>
                  <th className="pb-2 text-left font-semibold">Date</th>
                  <th className="pb-2 text-left font-semibold">Category</th>
                  <th className="pb-2 text-left font-semibold">Customer</th>
                  <th className="pb-2 text-right font-semibold">Amount</th>
                  <th className="pb-2 text-left font-semibold">Source</th>
                  <th className="pb-2 text-right font-semibold sr-only">Actions</th>
                </tr>
              </thead>
              <tbody>
                {salesData.entries.slice(0, 50).map((entry) => (
                  <tr key={entry.id} className="border-t group" style={{ borderColor: "var(--adm-border)" }}>
                    <td className="py-2 pr-3 tabular-nums" style={{ color: "var(--adm-text-secondary)" }}>
                      {new Date(entry.sold_at).toLocaleDateString("da-DK", { day: "numeric", month: "short" })}
                    </td>
                    <td className="py-2 pr-3" style={{ color: "var(--adm-text)" }}>{entry.category_name}</td>
                    <td className="py-2 pr-3" style={{ color: "var(--adm-text-muted)" }}>{entry.customer_name || "-"}</td>
                    <td className="py-2 pr-3 text-right font-medium tabular-nums" style={{ color: "var(--adm-text)" }}>
                      {entry.amount.toLocaleString()} {entry.currency}
                    </td>
                    <td className="py-2 pr-3">
                      {entry.source ? (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text-secondary)" }}>{entry.source}</span>
                      ) : (
                        <span className="text-[10px]" style={{ color: "var(--adm-text-placeholder)" }}>untagged</span>
                      )}
                    </td>
                    <td className="py-2 text-right">
                      <button onClick={() => handleDeleteEntry(entry.id)} className="invisible rounded p-1 transition-colors hover:bg-[var(--adm-surface-2)] group-hover:visible" style={{ color: "var(--adm-danger-text)" }}>
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {salesData.entries.length > 50 && (
              <p className="mt-2 text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
                Showing first 50 of {salesData.entries.length} entries
              </p>
            )}
          </div>
        ) : salesData ? (
          <p className="py-4 text-center text-xs" style={{ color: "var(--adm-text-muted)" }}>
            No entries for {monthLabel}
          </p>
        ) : (
          <div className="flex justify-center py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--adm-accent)", borderTopColor: "transparent" }} />
          </div>
        )}

        {/* Summary */}
        {salesData && salesData.entries.length > 0 && (
          <div className="mt-3 flex items-center gap-4 border-t pt-3" style={{ borderColor: "var(--adm-border)" }}>
            <span className="text-[11px] font-medium" style={{ color: "var(--adm-text-muted)" }}>
              {salesData.entry_count} entries
            </span>
            <span className="text-[11px] font-bold tabular-nums" style={{ color: "var(--adm-text)" }}>
              {salesData.total_revenue.toLocaleString()} {currency}
            </span>
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/*  SECTION 4: Data Pipeline (was Integrations)                 */}
      {/* ============================================================ */}
      <div className="rounded-xl border" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}>
        <button onClick={() => setPipelineOpen(!pipelineOpen)} className="flex w-full items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" style={{ color: "var(--adm-accent-text)" }} />
            <h3 className="text-sm font-bold">Data Pipeline</h3>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text-muted)" }}>
              n8n / Webhook
            </span>
          </div>
          <ChevronDown className="h-4 w-4 transition-transform" style={{ color: "var(--adm-text-muted)", transform: pipelineOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
        </button>

        {pipelineOpen && (
          <div className="flex flex-col gap-5 border-t px-5 py-5" style={{ borderColor: "var(--adm-border)" }}>
            {/* How it works */}
            <div className="rounded-lg p-4" style={{ backgroundColor: "color-mix(in srgb, var(--adm-accent) 5%, var(--adm-bg))" }}>
              <p className="mb-2 text-[11px] font-semibold" style={{ color: "var(--adm-accent-text)" }}>How Sales Data Flows</p>
              <div className="flex flex-col gap-1.5">
                {[
                  { from: "Accounting Software", to: "n8n", desc: "Cron fetches new invoices" },
                  { from: "n8n AI Node", to: "Tag source", desc: "AI auto-tags channel" },
                  { from: "n8n Supabase Node", to: "sales_entries", desc: "Upsert with dedup" },
                  { from: "Client opens app", to: "Sees sales", desc: "Tags untagged entries" },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px]">
                    <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ backgroundColor: "var(--adm-accent)", color: "#fff" }}>{i + 1}</span>
                    <span className="font-medium" style={{ color: "var(--adm-text)" }}>{step.from}</span>
                    <ArrowRight className="h-3 w-3 flex-shrink-0" style={{ color: "var(--adm-text-muted)" }} />
                    <span className="font-medium" style={{ color: "var(--adm-accent-text)" }}>{step.to}</span>
                    <span className="ml-auto hidden text-[10px] sm:block" style={{ color: "var(--adm-text-muted)" }}>{step.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* n8n Supabase Node */}
            <div className="rounded-lg border p-4" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-bg)" }}>
              <div className="mb-3 flex items-center gap-2">
                <Database className="h-4 w-4" style={{ color: "#3ECF8E" }} />
                <span className="text-xs font-bold">n8n Supabase Node</span>
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "color-mix(in srgb, #3ECF8E 15%, transparent)", color: "#3ECF8E" }}>Primary</span>
              </div>
              <div className="flex flex-col gap-3">
                <FieldWithCopy label="Table" value="sales_entries" field="table" CopyBtn={CopyBtn} />
                <FieldWithCopy label="Client ID" value={clientId} field="clientId" CopyBtn={CopyBtn} mono />
                <FieldWithCopy label="Client Slug" value={clientSlug} field="clientSlug" CopyBtn={CopyBtn} />
                <p className="text-[10px]" style={{ color: "var(--adm-text-placeholder)" }}>
                  Operation: <strong>Upsert</strong> -- Conflict columns: client_id, external_ref
                </p>

                {/* Column mapping */}
                <div className="rounded-md border" style={{ borderColor: "var(--adm-border)" }}>
                  <button onClick={() => setN8nFieldsOpen(!n8nFieldsOpen)} className="flex w-full items-center justify-between px-3 py-2">
                    <span className="text-[11px] font-semibold">Column Mapping</span>
                    <ChevronDown className="h-3.5 w-3.5 transition-transform" style={{ color: "var(--adm-text-muted)", transform: n8nFieldsOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
                  </button>
                  {n8nFieldsOpen && (
                    <div className="border-t px-3 py-3" style={{ borderColor: "var(--adm-border)" }}>
                      <div className="mb-2 flex justify-end">
                        <CopyBtn text={n8nMapping} field="mapping" label="Copy JSON" />
                      </div>
                      <pre className="overflow-x-auto rounded-md p-3 text-[10px] leading-relaxed" style={{ backgroundColor: "var(--adm-surface)", color: "var(--adm-text)", border: "1px solid var(--adm-border)" }}>
                        {n8nMapping}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Webhook Fallback */}
            <div className="rounded-lg border" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-bg)" }}>
              <button onClick={() => setWebhookOpen(!webhookOpen)} className="flex w-full items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <Webhook className="h-4 w-4" style={{ color: "var(--adm-text-muted)" }} />
                  <span className="text-xs font-bold">Webhook Fallback</span>
                  <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text-muted)" }}>Alternative</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 transition-transform" style={{ color: "var(--adm-text-muted)", transform: webhookOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
              </button>
              {webhookOpen && (
                <div className="flex flex-col gap-3 border-t px-4 py-4" style={{ borderColor: "var(--adm-border)" }}>
                  <FieldWithCopy label="Endpoint" value={`POST ${webhookUrl}`} field="webhookUrl" CopyBtn={CopyBtn} copyValue={webhookUrl} />
                  <FieldWithCopy label="Header" value={'Authorization: Bearer ${SALES_WEBHOOK_SECRET}'} field="webhookAuth" CopyBtn={CopyBtn} copyValue="Authorization: Bearer YOUR_SALES_WEBHOOK_SECRET" />
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-medium" style={{ color: "var(--adm-text-muted)" }}>Payload example</span>
                      <CopyBtn text={webhookPayload} field="webhookPayload" label="Copy" />
                    </div>
                    <pre className="overflow-x-auto rounded-md p-3 text-[10px] leading-relaxed" style={{ backgroundColor: "var(--adm-surface)", color: "var(--adm-text)", border: "1px solid var(--adm-border)" }}>
                      {webhookPayload}
                    </pre>
                  </div>
                </div>
              )}
            </div>

            {/* Source Tags */}
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Tag className="h-3.5 w-3.5" style={{ color: "var(--adm-text-muted)" }} />
                <span className="text-xs font-bold">Source Tags</span>
              </div>
              <p className="mb-2 text-[11px]" style={{ color: "var(--adm-text-muted)" }}>
                n8n AI node should output one of these for the <code className="font-mono">source</code> column. Send null if unsure.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: "online", label: "Online", color: "#3b82f6" },
                  { key: "networking", label: "Networking", color: "#8b5cf6" },
                  { key: "walk_in", label: "Walk-in", color: "#f59e0b" },
                  { key: "referral", label: "Referral", color: "#10b981" },
                  { key: "trade_show", label: "Trade Show", color: "#ec4899" },
                ].map((tag) => (
                  <div key={tag.key} className="flex items-center gap-2 rounded-md px-3 py-1.5" style={{ backgroundColor: "var(--adm-surface-2)" }}>
                    <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                    <span className="text-[11px] font-medium" style={{ color: "var(--adm-text)" }}>{tag.label}</span>
                    <code className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>{tag.key}</code>
                  </div>
                ))}
              </div>
            </div>

            {/* Sync Status */}
            <div className="rounded-lg border p-4" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-bg)" }}>
              <div className="mb-3 flex items-center gap-2">
                <Clock className="h-4 w-4" style={{ color: "var(--adm-text-muted)" }} />
                <span className="text-xs font-bold">Sync Status</span>
              </div>
              {syncInfo ? (
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-3 gap-3">
                    <StatBox label="Total Sales" value={syncInfo.total_entries.toString()} />
                    <StatBox label="Untagged" value={syncInfo.untagged_count.toString()} warn={syncInfo.untagged_count > 0} />
                    <StatBox label="Last Sync" value={syncInfo.last_entry_at ? new Date(syncInfo.last_entry_at).toLocaleDateString("da-DK", { day: "numeric", month: "short" }) : "Never"} />
                  </div>
                  {syncInfo.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {syncInfo.sources.map((s) => (
                        <span key={s.source} className="rounded-full px-2.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text-secondary)" }}>
                          {s.source || "untagged"}: {s.count}
                        </span>
                      ))}
                    </div>
                  )}
                  {syncInfo.total_entries === 0 && (
                    <div className="flex items-start gap-2 rounded-md p-3" style={{ backgroundColor: "color-mix(in srgb, var(--adm-accent) 8%, transparent)" }}>
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--adm-accent-text)" }} />
                      <p className="text-[11px] leading-relaxed" style={{ color: "var(--adm-text-secondary)" }}>
                        No sales data yet. Set up your n8n node to start syncing invoices.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex justify-center py-4">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--adm-accent)", borderTopColor: "transparent" }} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* -- Helper components -- */

function FieldWithCopy({
  label,
  value,
  field,
  CopyBtn,
  copyValue,
  mono,
}: {
  label: string;
  value: string;
  field: string;
  CopyBtn: React.ComponentType<{ text: string; field: string; label?: string }>;
  copyValue?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-medium" style={{ color: "var(--adm-text-muted)" }}>{label}</label>
      <div className="flex items-center gap-2">
        <code
          className={`flex-1 truncate rounded-md px-3 py-2 text-[11px] ${mono ? "font-mono" : ""}`}
          style={{ backgroundColor: "var(--adm-surface)", color: "var(--adm-text)", border: "1px solid var(--adm-border)" }}
        >
          {value}
        </code>
        <CopyBtn text={copyValue ?? value} field={field} />
      </div>
    </div>
  );
}

function StatBox({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-md px-3 py-2.5" style={{ backgroundColor: "var(--adm-surface-2)" }}>
      <span className="text-lg font-bold tabular-nums" style={{ color: warn ? "var(--adm-danger-text)" : "var(--adm-text)" }}>{value}</span>
      <span className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>{label}</span>
    </div>
  );
}
