"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import {
  Copy,
  Check,
  Webhook,
  Clock,
  Database,
  ChevronDown,
  Tag,
  AlertCircle,
  Zap,
  ArrowRight,
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
  const [mappingOpen, setMappingOpen] = useState(false);
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [sourceTagsOpen, setSourceTagsOpen] = useState(false);

  const webhookUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/sales`
    : "/api/webhooks/sales";

  const handleCopy = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  // Column mapping for external services inserting into sales_entries
  const columnMapping = JSON.stringify({
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

  // Webhook payload examples
  const webhookPayload = JSON.stringify({
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
    ],
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

      {/* ── How it works ── */}
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "var(--adm-border)", backgroundColor: "color-mix(in srgb, var(--adm-accent) 5%, var(--adm-surface))" }}
      >
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4" style={{ color: "var(--adm-accent-text)" }} />
          <h3 className="text-sm font-semibold">How Sales Data Flows</h3>
        </div>
        <div className="flex flex-col gap-2">
          {[
            { from: "Accounting Software", to: "Automation / Cron", desc: "Fetches new invoices" },
            { from: "Automation", to: "Tag source", desc: "AI auto-tags online/offline/etc." },
            { from: "Webhook POST", to: "sales_entries", desc: "Upsert with dedup on external_ref" },
            { from: "Client opens app", to: "Sees sales", desc: "Tags untagged entries manually" },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2 text-[11px]">
              <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold" style={{ backgroundColor: "var(--adm-accent)", color: "#fff" }}>
                {i + 1}
              </span>
              <span className="font-medium" style={{ color: "var(--adm-text)" }}>{step.from}</span>
              <ArrowRight className="h-3 w-3 flex-shrink-0" style={{ color: "var(--adm-text-muted)" }} />
              <span className="font-medium" style={{ color: "var(--adm-accent-text)" }}>{step.to}</span>
              <span className="ml-auto hidden text-[10px] sm:block" style={{ color: "var(--adm-text-muted)" }}>{step.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Primary: Supabase Direct ── */}
      <div
        className="rounded-lg border p-4"
        style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
      >
        <div className="mb-1 flex items-center gap-2">
          <Database className="h-4 w-4" style={{ color: "#3ECF8E" }} />
          <h3 className="text-sm font-semibold">Supabase: sales_entries</h3>
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ backgroundColor: "color-mix(in srgb, #3ECF8E 15%, transparent)", color: "#3ECF8E" }}>
            Primary
          </span>
        </div>
        <p className="mb-4 text-xs leading-relaxed" style={{ color: "var(--adm-text-muted)" }}>
          Insert directly into the database from any external service. Fastest, simplest, no middleware.
        </p>

        <div className="flex flex-col gap-3">
          {/* Table name */}
          <div>
            <label className="mb-1 block text-[11px] font-medium" style={{ color: "var(--adm-text-muted)" }}>Table Name</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md px-3 py-2 text-xs font-mono" style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text)", border: "1px solid var(--adm-border)" }}>
                sales_entries
              </code>
              <CopyButton text="sales_entries" field="table" />
            </div>
          </div>

          {/* Operation */}
          <div>
            <label className="mb-1 block text-[11px] font-medium" style={{ color: "var(--adm-text-muted)" }}>Operation</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md px-3 py-2 text-xs font-mono" style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text)", border: "1px solid var(--adm-border)" }}>
                Upsert
              </code>
            </div>
            <p className="mt-1 text-[10px]" style={{ color: "var(--adm-text-placeholder)" }}>
              Conflict columns: <code className="font-mono">client_id, external_ref</code> -- duplicates are automatically skipped
            </p>
          </div>

          {/* Client ID */}
          <div>
            <label className="mb-1 block text-[11px] font-medium" style={{ color: "var(--adm-text-muted)" }}>
              Client ID
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md px-3 py-2 text-[11px] font-mono" style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text)", border: "1px solid var(--adm-border)" }}>
                {clientId}
              </code>
              <CopyButton text={clientId} field="clientId" />
            </div>
          </div>

          {/* Client Slug (alternative identifier) */}
          <div>
            <label className="mb-1 block text-[11px] font-medium" style={{ color: "var(--adm-text-muted)" }}>
              Client Slug <span className="font-normal">(human-readable, for webhook fallback)</span>
            </label>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-md px-3 py-2 text-[11px] font-mono" style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text)", border: "1px solid var(--adm-border)" }}>
                {clientSlug}
              </code>
              <CopyButton text={clientSlug} field="clientSlug" />
            </div>
          </div>
        </div>

        {/* Column mapping reference (collapsible) */}
        <div className="mt-4 rounded-md border" style={{ borderColor: "var(--adm-border)" }}>
          <button
            onClick={() => setMappingOpen(!mappingOpen)}
            className="flex w-full items-center justify-between px-3 py-2.5"
          >
            <span className="text-[11px] font-semibold">Column Mapping</span>
            <ChevronDown
              className="h-3.5 w-3.5 transition-transform"
              style={{ color: "var(--adm-text-muted)", transform: mappingOpen ? "rotate(180deg)" : "rotate(0deg)" }}
            />
          </button>

          {mappingOpen && (
            <div className="flex flex-col gap-3 border-t px-3 py-3" style={{ borderColor: "var(--adm-border)" }}>
              {/* Visual column table */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr style={{ color: "var(--adm-text-muted)" }}>
                      <th className="pb-2 text-left font-semibold">Column</th>
                      <th className="pb-2 text-left font-semibold">Type</th>
                      <th className="pb-2 text-left font-semibold">Required</th>
                      <th className="pb-2 text-left font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody style={{ color: "var(--adm-text-secondary)" }}>
                    {[
                      { col: "client_id", type: "uuid", req: true, desc: "Client UUID (inject from loop)" },
                      { col: "amount", type: "numeric", req: true, desc: "Invoice amount (e.g. 45000)" },
                      { col: "currency", type: "text", req: true, desc: `ISO code: ${currency || "DKK"}` },
                      { col: "category_name", type: "text", req: true, desc: "Product/service category" },
                      { col: "customer_name", type: "text", req: false, desc: "Customer from invoice" },
                      { col: "description", type: "text", req: false, desc: "Invoice line description" },
                      { col: "external_ref", type: "text", req: false, desc: "Invoice number (dedup key)" },
                      { col: "sold_at", type: "timestamptz", req: false, desc: "Sale date (defaults to now)" },
                      { col: "source", type: "text", req: false, desc: "null = untagged, or AI-assigned tag" },
                    ].map((row) => (
                      <tr key={row.col} className="border-t" style={{ borderColor: "var(--adm-border)" }}>
                        <td className="py-1.5 pr-3 font-mono" style={{ color: "var(--adm-accent-text)" }}>{row.col}</td>
                        <td className="py-1.5 pr-3 font-mono opacity-60">{row.type}</td>
                        <td className="py-1.5 pr-3">{row.req ? <span style={{ color: "var(--adm-danger-text)" }}>Yes</span> : "No"}</td>
                        <td className="py-1.5">{row.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Column mapping example */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-medium" style={{ color: "var(--adm-text-muted)" }}>
                    Example mapping
                  </span>
                  <CopyButton text={columnMapping} field="mapping" label="Copy Mapping" />
                </div>
                <pre className="overflow-x-auto rounded-md p-3 text-[10px] leading-relaxed" style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text)", border: "1px solid var(--adm-border)" }}>
                  {columnMapping}
                </pre>
                <p className="mt-1.5 text-[10px]" style={{ color: "var(--adm-text-placeholder)" }}>
                  Replace <code className="font-mono">$json.*</code> expressions with your actual field names from the accounting software node
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Secondary: Webhook Fallback ── */}
      <div
        className="rounded-lg border"
        style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
      >
        <button
          onClick={() => setWebhookOpen(!webhookOpen)}
          className="flex w-full items-center justify-between px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <Webhook className="h-4 w-4" style={{ color: "var(--adm-text-muted)" }} />
            <h3 className="text-xs font-semibold">Webhook Fallback</h3>
            <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text-muted)" }}>
              Alternative
            </span>
          </div>
          <ChevronDown
            className="h-4 w-4 transition-transform"
            style={{ color: "var(--adm-text-muted)", transform: webhookOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>

        {webhookOpen && (
          <div className="flex flex-col gap-3 border-t px-4 py-4" style={{ borderColor: "var(--adm-border)" }}>
            <p className="text-[11px]" style={{ color: "var(--adm-text-muted)" }}>
              Use this when a system can only call HTTP endpoints (no native Supabase support).
              Requires <code className="font-mono">SALES_WEBHOOK_SECRET</code> in Vercel Vars.
            </p>

            {/* Endpoint */}
            <div>
              <label className="mb-1 block text-[11px] font-medium" style={{ color: "var(--adm-text-muted)" }}>Endpoint</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 truncate rounded-md px-3 py-2 text-xs" style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text)", border: "1px solid var(--adm-border)" }}>
                  POST {webhookUrl}
                </code>
                <CopyButton text={webhookUrl} field="webhookUrl" />
              </div>
            </div>

            {/* Auth */}
            <div>
              <label className="mb-1 block text-[11px] font-medium" style={{ color: "var(--adm-text-muted)" }}>Header</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md px-3 py-2 text-[11px]" style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text)", border: "1px solid var(--adm-border)" }}>
                  Authorization: Bearer {"$"}{"{"}SALES_WEBHOOK_SECRET{"}"}
                </code>
                <CopyButton text="Authorization: Bearer YOUR_SALES_WEBHOOK_SECRET" field="webhookAuth" />
              </div>
            </div>

            {/* Payload example */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium" style={{ color: "var(--adm-text-muted)" }}>Payload (uses client_slug)</span>
                <CopyButton text={webhookPayload} field="webhookPayload" label="Copy" />
              </div>
              <pre className="overflow-x-auto rounded-md p-3 text-[10px] leading-relaxed" style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text)", border: "1px solid var(--adm-border)" }}>
                {webhookPayload}
              </pre>
            </div>
          </div>
        )}
      </div>

      {/* ── Source Tags ── */}
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
            style={{ color: "var(--adm-text-muted)", transform: sourceTagsOpen ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </button>

        {sourceTagsOpen && (
          <div className="border-t px-4 py-4" style={{ borderColor: "var(--adm-border)" }}>
            <p className="mb-3 text-[11px]" style={{ color: "var(--adm-text-muted)" }}>
              The automation should output one of these exact values for the <code className="font-mono">source</code> column.
              Send <code className="font-mono">null</code> if unsure -- {clientName} tags it in the app.
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

      {/* ── Sync Status ── */}
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
                label="Last Sync"
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
                  No sales data yet. Connect your accounting software using the details above to start syncing invoices.
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
