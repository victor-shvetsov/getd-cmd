"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import type { SubscriptionRow } from "@/lib/types";
import { CHANNEL_KEYS, CHANNEL_LABELS } from "@/lib/types";
import { Plus, Pencil, Trash2, X, Save, CreditCard, Clock, FileText } from "lucide-react";

const SERVICE_OPTIONS = [
  ...CHANNEL_KEYS.map((k) => ({ key: k, label: CHANNEL_LABELS[k] })),
  { key: "custom", label: "Custom Service" },
];

const INTERVAL_OPTIONS = [
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
];

const TERMINATION_OPTIONS = [
  { value: 0, label: "No notice" },
  { value: 1, label: "1 month" },
  { value: 3, label: "3 months" },
  { value: 6, label: "6 months" },
  { value: 12, label: "12 months" },
];

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "color-mix(in srgb, var(--adm-text-muted) 15%, transparent)", text: "var(--adm-text-secondary)", label: "Pending" },
  active: { bg: "color-mix(in srgb, var(--adm-success) 15%, transparent)", text: "var(--adm-success)", label: "Active" },
  past_due: { bg: "color-mix(in srgb, var(--adm-danger-text) 15%, transparent)", text: "var(--adm-danger-text)", label: "Past Due" },
  canceled: { bg: "color-mix(in srgb, var(--adm-text-muted) 15%, transparent)", text: "var(--adm-text-muted)", label: "Canceled" },
  terminated: { bg: "color-mix(in srgb, var(--adm-danger-text) 15%, transparent)", text: "var(--adm-danger-text)", label: "Terminated" },
};

interface SubscriptionsManagerProps {
  clientId: string;
  token: string;
}

interface FormData {
  service_key: string;
  service_label: string;
  amount: string;
  currency: string;
  interval: string;
  termination_months: number;
  terms_text: string;
  value_proposition: string;
  includes: string[];
  includeInput: string;
}

const emptyForm: FormData = {
  service_key: "seo",
  service_label: "SEO",
  amount: "",
  currency: "dkk",
  interval: "month",
  termination_months: 0,
  terms_text: "",
  value_proposition: "",
  includes: [],
  includeInput: "",
};

export function SubscriptionsManager({ clientId, token }: SubscriptionsManagerProps) {
  const authFetcher = useCallback(
    (url: string) =>
      fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    [token]
  );

  const { data: subs, mutate } = useSWR<SubscriptionRow[]>(
    `/api/admin/clients/${clientId}/subscriptions`,
    authFetcher
  );

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const updateForm = (field: keyof FormData, value: string | number) => {
    setForm((f) => ({ ...f, [field]: value }));
    // Auto-fill label when picking a service
    if (field === "service_key") {
      const opt = SERVICE_OPTIONS.find((o) => o.key === value);
      if (opt && opt.key !== "custom") {
        setForm((f) => ({ ...f, service_key: value as string, service_label: opt.label }));
      }
    }
  };

  const handleAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const handleEdit = (sub: SubscriptionRow) => {
    setEditingId(sub.id);
    setForm({
      service_key: sub.service_key,
      service_label: sub.service_label,
      amount: String(sub.amount),
      currency: sub.currency,
      interval: sub.interval,
      termination_months: sub.termination_months,
      terms_text: sub.terms_text ?? "",
      value_proposition: sub.value_proposition ?? "",
      includes: Array.isArray(sub.includes) ? sub.includes : [],
      includeInput: "",
    });
    setShowForm(true);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSave = async () => {
    if (!form.amount || !form.service_label) return;
    setSaving(true);
    try {
      const url = editingId
        ? `/api/admin/clients/${clientId}/subscriptions/${editingId}`
        : `/api/admin/clients/${clientId}/subscriptions`;
      await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          service_key: form.service_key,
          service_label: form.service_label,
          amount: Math.round(Number(form.amount)),
          currency: form.currency,
          interval: form.interval,
          termination_months: form.termination_months,
          terms_text: form.terms_text || null,
          value_proposition: form.value_proposition || null,
          includes: form.includes.filter(Boolean),
        }),
      });
      await mutate();
      handleCancel();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (subId: string) => {
    setDeletingId(subId);
    try {
      await fetch(`/api/admin/clients/${clientId}/subscriptions/${subId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await mutate();
    } finally {
      setDeletingId(null);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount / 100);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
            Recurring Services
          </h2>
          <p className="mt-0.5 text-xs" style={{ color: "var(--adm-text-muted)" }}>
            Define the services this client subscribes to. Stripe subscriptions will be created when the client accepts terms.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={handleAdd}
            className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-white transition-colors"
            style={{ backgroundColor: "var(--adm-accent)" }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add Service
          </button>
        )}
      </div>

      {/* Form (add or edit) */}
      {showForm && (
        <div
          className="rounded-lg border p-4"
          style={{ borderColor: "var(--adm-accent)", backgroundColor: "var(--adm-surface)" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold" style={{ color: "var(--adm-text)" }}>
              {editingId ? "Edit Service" : "New Service"}
            </h3>
            <button
              onClick={handleCancel}
              className="flex h-6 w-6 items-center justify-center rounded"
              style={{ color: "var(--adm-text-muted)" }}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Service Type */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium" style={{ color: "var(--adm-text-secondary)" }}>
                Service
              </label>
              <select
                value={form.service_key}
                onChange={(e) => updateForm("service_key", e.target.value)}
                className="h-8 rounded-md border px-2 text-xs outline-none"
                style={{
                  borderColor: "var(--adm-border)",
                  backgroundColor: "var(--adm-bg)",
                  color: "var(--adm-text)",
                }}
              >
                {SERVICE_OPTIONS.map((o) => (
                  <option key={o.key} value={o.key}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Service Label (editable, auto-filled) */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium" style={{ color: "var(--adm-text-secondary)" }}>
                Display Name
              </label>
              <input
                type="text"
                value={form.service_label}
                onChange={(e) => updateForm("service_label", e.target.value)}
                placeholder="e.g. SEO Management"
                className="h-8 rounded-md border px-2 text-xs outline-none"
                style={{
                  borderColor: "var(--adm-border)",
                  backgroundColor: "var(--adm-bg)",
                  color: "var(--adm-text)",
                }}
              />
            </div>

            {/* Amount */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium" style={{ color: "var(--adm-text-secondary)" }}>
                Amount (in smallest unit, e.g. cents/oere)
              </label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => updateForm("amount", e.target.value)}
                placeholder="e.g. 500000 = 5,000 DKK"
                className="h-8 rounded-md border px-2 text-xs outline-none"
                style={{
                  borderColor: "var(--adm-border)",
                  backgroundColor: "var(--adm-bg)",
                  color: "var(--adm-text)",
                }}
              />
              {form.amount && (
                <p className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
                  = {formatAmount(Number(form.amount), form.currency)} / {form.interval}
                </p>
              )}
            </div>

            {/* Currency */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium" style={{ color: "var(--adm-text-secondary)" }}>
                Currency
              </label>
              <select
                value={form.currency}
                onChange={(e) => updateForm("currency", e.target.value)}
                className="h-8 rounded-md border px-2 text-xs outline-none"
                style={{
                  borderColor: "var(--adm-border)",
                  backgroundColor: "var(--adm-bg)",
                  color: "var(--adm-text)",
                }}
              >
                <option value="dkk">DKK</option>
                <option value="eur">EUR</option>
                <option value="usd">USD</option>
                <option value="gbp">GBP</option>
              </select>
            </div>

            {/* Interval */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium" style={{ color: "var(--adm-text-secondary)" }}>
                Billing Interval
              </label>
              <div className="flex gap-2">
                {INTERVAL_OPTIONS.map((o) => (
                  <button
                    key={o.value}
                    onClick={() => updateForm("interval", o.value)}
                    className="flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors"
                    style={{
                      borderColor: form.interval === o.value ? "var(--adm-accent)" : "var(--adm-border)",
                      backgroundColor: form.interval === o.value ? "color-mix(in srgb, var(--adm-accent) 12%, transparent)" : "var(--adm-bg)",
                      color: form.interval === o.value ? "var(--adm-accent-text)" : "var(--adm-text-secondary)",
                    }}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Termination Notice */}
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium" style={{ color: "var(--adm-text-secondary)" }}>
                Termination Notice
              </label>
              <select
                value={form.termination_months}
                onChange={(e) => updateForm("termination_months", Number(e.target.value))}
                className="h-8 rounded-md border px-2 text-xs outline-none"
                style={{
                  borderColor: "var(--adm-border)",
                  backgroundColor: "var(--adm-bg)",
                  color: "var(--adm-text)",
                }}
              >
                {TERMINATION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* Terms Text */}
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-[11px] font-medium" style={{ color: "var(--adm-text-secondary)" }}>
                Terms &amp; Conditions (optional)
              </label>
              <textarea
                value={form.terms_text}
                onChange={(e) => updateForm("terms_text", e.target.value)}
                placeholder="e.g. This agreement has a 3-month minimum commitment. Cancellation requires 3 months written notice..."
                rows={2}
                className="resize-none rounded-md border px-2 py-1.5 text-xs outline-none"
                style={{
                  borderColor: "var(--adm-border)",
                  backgroundColor: "var(--adm-bg)",
                  color: "var(--adm-text)",
                }}
              />
            </div>

            {/* Value Proposition */}
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-[11px] font-medium" style={{ color: "var(--adm-text-secondary)" }}>
                Value Proposition (client-facing headline)
              </label>
              <input
                type="text"
                value={form.value_proposition}
                onChange={(e) => updateForm("value_proposition", e.target.value)}
                placeholder='e.g. "Get 5,000+ organic visitors/month within 12 months"'
                className="h-8 rounded-md border px-2 text-xs outline-none"
                style={{
                  borderColor: "var(--adm-border)",
                  backgroundColor: "var(--adm-bg)",
                  color: "var(--adm-text)",
                }}
              />
              <p className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
                The main outcome headline clients see. Leave empty to show service name only.
              </p>
            </div>

            {/* Includes List */}
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-[11px] font-medium" style={{ color: "var(--adm-text-secondary)" }}>
                {"What's Included (client-facing bullet points)"}
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={form.includeInput}
                  onChange={(e) => setForm((f) => ({ ...f, includeInput: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && form.includeInput.trim()) {
                      e.preventDefault();
                      setForm((f) => ({
                        ...f,
                        includes: [...f.includes, f.includeInput.trim()],
                        includeInput: "",
                      }));
                    }
                  }}
                  placeholder='Type and press Enter, e.g. "Technical SEO audits"'
                  className="h-8 flex-1 rounded-md border px-2 text-xs outline-none"
                  style={{
                    borderColor: "var(--adm-border)",
                    backgroundColor: "var(--adm-bg)",
                    color: "var(--adm-text)",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (form.includeInput.trim()) {
                      setForm((f) => ({
                        ...f,
                        includes: [...f.includes, f.includeInput.trim()],
                        includeInput: "",
                      }));
                    }
                  }}
                  className="flex h-8 items-center rounded-md border px-2 text-xs"
                  style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-secondary)" }}
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
              {form.includes.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {form.includes.map((item, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px]"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--adm-accent) 12%, transparent)",
                        color: "var(--adm-accent-text)",
                      }}
                    >
                      {item}
                      <button
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            includes: f.includes.filter((_, idx) => idx !== i),
                          }))
                        }
                        className="ml-0.5 opacity-60 hover:opacity-100"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-3 flex justify-end gap-2">
            <button
              onClick={handleCancel}
              className="flex h-8 items-center rounded-lg border px-3 text-xs font-medium transition-colors"
              style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-secondary)" }}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !form.amount || !form.service_label}
              className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-white transition-colors disabled:opacity-50"
              style={{ backgroundColor: "var(--adm-accent)" }}
            >
              <Save className="h-3 w-3" />
              {saving ? "Saving..." : editingId ? "Update" : "Create"}
            </button>
          </div>
        </div>
      )}

      {/* Subscriptions List */}
      {!subs ? (
        <div className="flex items-center justify-center py-8">
          <div
            className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent"
            style={{ borderColor: "var(--adm-accent)", borderTopColor: "transparent" }}
          />
        </div>
      ) : subs.length === 0 && !showForm ? (
        <div
          className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed py-10"
          style={{ borderColor: "var(--adm-border)" }}
        >
          <CreditCard className="h-8 w-8" style={{ color: "var(--adm-text-muted)" }} />
          <p className="text-xs" style={{ color: "var(--adm-text-muted)" }}>
            No recurring services defined yet.
          </p>
          <button
            onClick={handleAdd}
            className="mt-1 flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-white transition-colors"
            style={{ backgroundColor: "var(--adm-accent)" }}
          >
            <Plus className="h-3.5 w-3.5" />
            Add First Service
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {subs.map((sub) => {
            const status = STATUS_STYLES[sub.status] ?? STATUS_STYLES.pending;
            return (
              <div
                key={sub.id}
                className="rounded-lg border p-3"
                style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-semibold" style={{ color: "var(--adm-text)" }}>
                        {sub.service_label}
                      </h4>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: status.bg, color: status.text }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
                      <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--adm-text-secondary)" }}>
                        <CreditCard className="h-3 w-3" />
                        {formatAmount(sub.amount, sub.currency)} / {sub.interval}
                      </span>
                      {sub.termination_months > 0 && (
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--adm-text-secondary)" }}>
                          <Clock className="h-3 w-3" />
                          {sub.termination_months}mo notice
                        </span>
                      )}
                      {sub.terms_text && (
                        <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--adm-text-secondary)" }}>
                          <FileText className="h-3 w-3" />
                          Has terms
                        </span>
                      )}
                      {sub.invoices.length > 0 && (
                        <span className="text-[11px]" style={{ color: "var(--adm-text-muted)" }}>
                          {sub.invoices.length} invoice{sub.invoices.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(sub)}
                      className="flex h-7 w-7 items-center justify-center rounded-md transition-colors"
                      style={{ color: "var(--adm-text-muted)" }}
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {sub.status !== "active" && (
                      <button
                        onClick={() => handleDelete(sub.id)}
                        disabled={deletingId === sub.id}
                        className="flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-50"
                        style={{ color: "var(--adm-danger-text)" }}
                        title="Delete"
                      >
                        <Trash2 className={`h-3.5 w-3.5 ${deletingId === sub.id ? "animate-spin" : ""}`} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
