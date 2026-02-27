"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import {
  Copy,
  Check,
  Webhook,
  Clock,
  ShieldCheck,
  ChevronDown,
  Tag,
  AlertCircle,
} from "lucide-react";

interface IntegrationsEditorProps {
  clientId: string;
  clientSlug: string;
  clientName: string;
  currency: string;
  token: string;
}

interface SyncInfo {
  total_entries: number;
  untagged_count: number;
  last_entry_at: string | null;
  sources: { source: string; count: number }[];
}

export function IntegrationsEditor({ clientId, clientSlug, clientName, currency, token }: IntegrationsEditorProps) {
  const authFetcher = useCallback(
    (url: string) =>
      fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    [token]
  );

  const { data: syncInfo } = useSWR<SyncInfo>(
    `/api/admin/clients/${clientId}/sync-info`,
    authFetcher
  );

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [payloadOpen, setPayloadOpen] = useState(false);
  const [sourceTagsOpen, setSourceTagsOpen] = useState(false);

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/sales`
    : "/api/webhooks/sales";

  const handleCopy = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const samplePayload = JSON.stringify({
    client_slug: clientSlug,
    entries: [
      {
        amount: 45000,
        currency: currency || "DKK",
        category_name: "Product / Service name",
        customer_name: "Customer Name",
        description: "Invoice description",
        external_ref: "INV-2026-001",
        sold_at: new Date().toISOString(),
        source: null,
      },
    ],
  }, null, 2);

  const batchPayload = JSON.stringify({
    client_slug: clientSlug,
    entries: [
      {
        amount: 45000,
        currency: currency || "DKK",
        category_name: "Espresso Machines",
        customer_name: "Lars Hansen",
        description: "Fully automatic espresso machine",
        external_ref: "INV-2026-041",
        sold_at: "2026-02-25T10:00:00Z",
        source: null,
      },
      {
        amount: 3500,
        currency: currency || "DKK",
        category_name: "Coffee Beans",
        customer_name: "Mette Andersen",
        description: "Premium blend 1kg x3",
        external_ref: "INV-2026-042",
        sold_at: "2026-02-25T14:30:00Z",
        source: "online",
      },
    ],
  }, null, 2);

  const n8nHeaders = JSON.stringify({
    "Content-Type": "application/json",
    "Authorization": "Bearer YOUR_SALES_WEBHOOK_SECRET",
  }, null, 2);

  const CopyButton = ({ text, field, label }: { text: string; field: string; label?: string }) => (
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
      {copiedField === field ? (
        <>
          <Check className="h-3 w-3" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3 w-3" />
          {label || "Copy"}
        </>
      )}
    </button>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Webhook Endpoint */}
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
      >
        <div className="mb-3 flex items-center gap-2">
          <Webhook className="h-4 w-4" style={{ color: "var(--adm-accent-text)" }} />
          <h3 className="text-sm font-semibold">Sales Webhook</h3>
        </div>
        <p className="mb-4 text-xs leading-relaxed" style={{ color: "var(--adm-text-muted)" }}>
          Push invoices from any source (e-conomic, Stripe, Shopify, etc.) via n8n.
          Duplicates are automatically skipped based on <code className="rounded px-1 py-0.5 text-[10px]" style={{ backgroundColor: "var(--adm-surface-2)" }}>external_ref</code>.
        </p>

        <div className="flex flex-col gap-3">
          {/* URL */}
          <div>
            <label className="mb-1 block text-[11px] font-medium" style={{ color: "var(--adm-text-muted)" }}>
              Endpoint URL
            </label>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 truncate rounded-md px-3 py-2 text-xs"
                style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text)", border: "1px solid var(--adm-border)" }}
              >
                POST {webhookUrl}
              </code>
              <CopyButton text={webhookUrl} field="url" />
            </div>
          </div>

          {/* Client Slug */}
          <div>
            <label className="mb-1 block text-[11px] font-medium" style={{ color: "var(--adm-text-muted)" }}>
              Client Slug (use in payload as <code className="font-mono">client_slug</code>)
            </label>
            <div className="flex items-center gap-2">
              <code
                className="flex-1 truncate rounded-md px-3 py-2 text-xs font-mono"
                style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text)", border: "1px solid var(--adm-border)" }}
              >
                {clientSlug}
              </code>
              <CopyButton text={clientSlug} field="clientSlug" />
            </div>
            <p className="mt-1 text-[10px]" style={{ color: "var(--adm-text-placeholder)" }}>
              In n8n, inject this dynamically per client in your loop
            </p>
          </div>

          {/* Auth header */}
          <div>
            <label className="mb-1 block text-[11px] font-medium" style={{ color: "var(--adm-text-muted)" }}>
              Authentication Header
            </label>
            <div className="flex items-center gap-2">
              <div
                className="flex flex-1 items-center gap-2 rounded-md px-3 py-2"
                style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)" }}
              >
                <ShieldCheck className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--adm-success)" }} />
                <code className="text-xs" style={{ color: "var(--adm-text)" }}>
                  Authorization: Bearer {'$'}{'{'}<span style={{ color: "var(--adm-accent-text)" }}>SALES_WEBHOOK_SECRET</span>{'}'} 
                </code>
              </div>
              <CopyButton text="Authorization: Bearer YOUR_SALES_WEBHOOK_SECRET" field="auth" />
            </div>
            <p className="mt-1 text-[10px]" style={{ color: "var(--adm-text-placeholder)" }}>
              Set the same secret in both Vercel Vars and your n8n HTTP Request node header
            </p>
          </div>
        </div>
      </div>

      {/* n8n Headers */}
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold">n8n HTTP Request Headers</h3>
          <CopyButton text={n8nHeaders} field="headers" label="Copy Headers" />
        </div>
        <pre
          className="overflow-x-auto rounded-md p-3 text-[11px] leading-relaxed"
          style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text)", border: "1px solid var(--adm-border)" }}
        >
          {n8nHeaders}
        </pre>
      </div>

      {/* Payload Examples (collapsible) */}
      <div
        className="rounded-lg border"
        style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
      >
        <button
          onClick={() => setPayloadOpen(!payloadOpen)}
          className="flex w-full items-center justify-between px-4 py-3"
        >
          <h3 className="text-xs font-semibold">Payload Examples</h3>
          <ChevronDown
            className="h-4 w-4 transition-transform"
            style={{
              color: "var(--adm-text-muted)",
              transform: payloadOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>

        {payloadOpen && (
          <div className="flex flex-col gap-4 border-t px-4 py-4" style={{ borderColor: "var(--adm-border)" }}>
            {/* Single invoice */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium" style={{ color: "var(--adm-text-muted)" }}>
                  Single invoice
                </span>
                <CopyButton text={samplePayload} field="single" label="Copy Payload" />
              </div>
              <pre
                className="overflow-x-auto rounded-md p-3 text-[10px] leading-relaxed"
                style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text)", border: "1px solid var(--adm-border)" }}
              >
                {samplePayload}
              </pre>
            </div>

            {/* Batch */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium" style={{ color: "var(--adm-text-muted)" }}>
                  Batch (multiple invoices)
                </span>
                <CopyButton text={batchPayload} field="batch" label="Copy Payload" />
              </div>
              <pre
                className="overflow-x-auto rounded-md p-3 text-[10px] leading-relaxed"
                style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text)", border: "1px solid var(--adm-border)" }}
              >
                {batchPayload}
              </pre>
            </div>

            {/* Field reference */}
            <div
              className="rounded-md p-3 text-[11px] leading-relaxed"
              style={{ backgroundColor: "var(--adm-bg)", border: "1px solid var(--adm-border)" }}
            >
              <h4 className="mb-2 font-semibold" style={{ color: "var(--adm-text)" }}>Field Reference</h4>
              <div className="flex flex-col gap-1" style={{ color: "var(--adm-text-secondary)" }}>
                <FieldRef name="amount" required desc="Invoice amount in smallest readable unit (e.g. 45000 = kr 45,000)" />
                <FieldRef name="currency" required desc="ISO currency code: DKK, EUR, USD, etc." />
                <FieldRef name="category_name" required desc="Product/service category for grouping" />
                <FieldRef name="customer_name" desc="Client/customer name from the invoice" />
                <FieldRef name="description" desc="Invoice line description" />
                <FieldRef name="external_ref" desc="Invoice number (used for duplicate detection)" />
                <FieldRef name="sold_at" desc="Sale date as ISO string. Defaults to now()" />
                <FieldRef name="source" desc='null = untagged. Options: "online", "networking", "walk_in", "referral", "trade_show"' />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Source Tags Config */}
      <div
        className="rounded-lg border"
        style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
      >
        <button
          onClick={() => setSourceTagsOpen(!sourceTagsOpen)}
          className="flex w-full items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5" style={{ color: "var(--adm-text-muted)" }} />
            <h3 className="text-xs font-semibold">Source Tags</h3>
          </div>
          <ChevronDown
            className="h-4 w-4 transition-transform"
            style={{
              color: "var(--adm-text-muted)",
              transform: sourceTagsOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </button>

        {sourceTagsOpen && (
          <div className="border-t px-4 py-4" style={{ borderColor: "var(--adm-border)" }}>
            <p className="mb-3 text-[11px]" style={{ color: "var(--adm-text-muted)" }}>
              These are the tags {clientName} can use to categorise their sales in the app.
              If your n8n AI node assigns a tag, it should match one of these values exactly.
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { key: "online", label: "Online", color: "#3b82f6" },
                { key: "networking", label: "Networking", color: "#8b5cf6" },
                { key: "walk_in", label: "Walk-in", color: "#f59e0b" },
                { key: "referral", label: "Referral", color: "#10b981" },
                { key: "trade_show", label: "Trade Show", color: "#ec4899" },
              ].map((tag) => (
                <div
                  key={tag.key}
                  className="flex items-center gap-2 rounded-md px-3 py-1.5"
                  style={{ backgroundColor: "var(--adm-surface-2)" }}
                >
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="text-[11px] font-medium" style={{ color: "var(--adm-text)" }}>{tag.label}</span>
                  <code className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>{tag.key}</code>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sync Status */}
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
      >
        <div className="mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" style={{ color: "var(--adm-text-muted)" }} />
          <h3 className="text-xs font-semibold">Sync Status</h3>
        </div>

        {syncInfo ? (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-3 gap-3">
              <StatBox label="Total Sales" value={syncInfo.total_entries.toString()} />
              <StatBox
                label="Untagged"
                value={syncInfo.untagged_count.toString()}
                warn={syncInfo.untagged_count > 0}
              />
              <StatBox
                label="Last Entry"
                value={syncInfo.last_entry_at
                  ? new Date(syncInfo.last_entry_at).toLocaleDateString("da-DK", { day: "numeric", month: "short" })
                  : "Never"
                }
              />
            </div>

            {syncInfo.sources.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {syncInfo.sources.map((s) => (
                  <span
                    key={s.source}
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                    style={{ backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text-secondary)" }}
                  >
                    {s.source || "untagged"}: {s.count}
                  </span>
                ))}
              </div>
            )}

            {syncInfo.total_entries === 0 && (
              <div
                className="flex items-start gap-2 rounded-md p-3"
                style={{ backgroundColor: "color-mix(in srgb, var(--adm-accent) 8%, transparent)" }}
              >
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--adm-accent-text)" }} />
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--adm-text-secondary)" }}>
                  No sales entries yet. Set up your n8n workflow using the webhook details above,
                  or the client can add sales manually from their Sales tab.
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
  );
}

function StatBox({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-md px-3 py-2.5"
      style={{ backgroundColor: "var(--adm-surface-2)" }}
    >
      <span
        className="text-lg font-bold tabular-nums"
        style={{ color: warn ? "var(--adm-danger-text)" : "var(--adm-text)" }}
      >
        {value}
      </span>
      <span className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>{label}</span>
    </div>
  );
}

function FieldRef({ name, desc, required }: { name: string; desc: string; required?: boolean }) {
  return (
    <div className="flex gap-2">
      <code className="shrink-0 font-mono text-[10px]" style={{ color: "var(--adm-accent-text)" }}>
        {name}{required ? "*" : ""}
      </code>
      <span>{desc}</span>
    </div>
  );
}
