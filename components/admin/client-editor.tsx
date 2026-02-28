"use client";

import { useCallback, useEffect, useState } from "react";
import useSWR from "swr";
import type { ClientRow, ClientType } from "@/lib/types";
import { CLIENT_TYPES, CLIENT_TYPE_LABELS } from "@/lib/types";
import {
  ArrowLeft,
  Save,
  Trash2,
  Eye,
  ExternalLink,
  AlertTriangle,
  ChevronDown,
  RotateCcw,
  ShieldAlert,
  Check,
  Settings2,
  Palette,
  CreditCard,
  ShoppingBag,
  Brain,
  LayoutGrid,
} from "lucide-react";
import { TabDataEditor } from "@/components/admin/tab-data-editor";
import { KnowledgeBank } from "@/components/admin/knowledge-bank";
import { BrandingEditor } from "@/components/admin/branding-editor";
import { SubscriptionsManager } from "@/components/admin/subscriptions-manager";
import { SalesEditor } from "@/components/admin/editors/sales-editor";
import { AdminThemeToggle } from "./admin-theme-toggle";

interface ClientResponse {
  client: ClientRow;
  tabs: unknown[];
  translations: unknown[];
  tabTranslations: unknown[];
}

interface ClientEditorProps {
  clientId: string;
  token: string;
  onBack: () => void;
  onSave: () => void;
  onDelete: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

type EditorSection = "general" | "branding" | "subscriptions" | "sales" | "knowledge" | "tabs";

const SECTIONS: { key: EditorSection; label: string; icon: React.ElementType }[] = [
  { key: "general", label: "General", icon: Settings2 },
  { key: "branding", label: "Branding", icon: Palette },
  { key: "subscriptions", label: "Billing", icon: CreditCard },
  { key: "sales", label: "Sales", icon: ShoppingBag },
  { key: "knowledge", label: "Knowledge", icon: Brain },
  { key: "tabs", label: "Tab Data", icon: LayoutGrid },
];

export function ClientEditor({ clientId, token, onBack, onSave, onDelete, theme, toggleTheme }: ClientEditorProps) {
  const authFetcher = useCallback(
    (url: string) =>
      fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    [token]
  );

  const { data: response, mutate } = useSWR<ClientResponse>(
    `/api/admin/clients/${clientId}`,
    authFetcher
  );
  const client = response?.client;
  const [section, setSection] = useState<EditorSection>("general");
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [pin, setPin] = useState("");
  const [objective, setObjective] = useState("");
  const [defaultLang, setDefaultLang] = useState("en");
  const [languages, setLanguages] = useState("en");
  const [clientType, setClientType] = useState<ClientType>("service_outbound");

  useEffect(() => {
    if (client) {
      setName(client.name);
      setSlug(client.slug);
      setPin(client.pin);
      setObjective(client.project_objective ?? "");
      setDefaultLang(client.default_language);
      setLanguages(client.available_languages.join(", "));
      setClientType(client.client_type ?? "service_outbound");
    }
  }, [client]);

  const handleSaveGeneral = useCallback(async () => {
    setSaving(true);
    const langs = languages.split(",").map((l) => l.trim()).filter(Boolean);
    await fetch(`/api/admin/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name,
        slug,
        pin,
        client_type: clientType,
        project_objective: objective,
        default_language: defaultLang,
        available_languages: langs,
      }),
    });
    await mutate();
    setSaving(false);
    onSave();
  }, [clientId, name, slug, pin, clientType, objective, defaultLang, languages, mutate, onSave, token]);

  if (!client) {
    return (
      <div className="flex min-h-dvh items-center justify-center" style={{ backgroundColor: "var(--adm-bg)" }}>
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--adm-accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh" style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text)" }}>
      {/* -- Header -- */}
      <header
        className="sticky top-0 z-30"
        style={{ borderBottom: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
      >
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--adm-surface-2)]"
              style={{ color: "var(--adm-text-secondary)" }}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2.5">
              {client.primary_color && (
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: client.primary_color }} />
              )}
              <div>
                <h1 className="text-sm font-bold">{client.name}</h1>
                <p className="text-[11px]" style={{ color: "var(--adm-text-muted)" }}>/{client.slug}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AdminThemeToggle theme={theme} toggle={toggleTheme} />
            <a
              href={`/${client.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors hover:opacity-80"
              style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-secondary)" }}
            >
              <Eye className="h-3.5 w-3.5" />
              Preview
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* -- Section tabs as pills -- */}
        <div className="mx-auto max-w-4xl px-5 pb-2">
          <div
            className="flex gap-1 overflow-x-auto rounded-lg p-1"
            style={{ backgroundColor: "var(--adm-surface-2)" }}
          >
            {SECTIONS.map((s) => {
              const Icon = s.icon;
              const active = section === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setSection(s.key)}
                  className="flex flex-shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all"
                  style={{
                    backgroundColor: active ? "var(--adm-surface)" : "transparent",
                    color: active ? "var(--adm-text)" : "var(--adm-text-muted)",
                    boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                  }}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {/* -- Content -- */}
      <main className="mx-auto max-w-4xl px-5 py-6">
        {section === "general" && (
          <div className="flex flex-col gap-6">
            {/* Project Objective */}
            <div
              className="rounded-xl border p-5"
              style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
            >
              <label className="mb-1.5 block text-xs font-bold" style={{ color: "var(--adm-text)" }}>
                Project Objective
              </label>
              <p className="mb-3 text-[11px] leading-relaxed" style={{ color: "var(--adm-text-muted)" }}>
                The core business goal this project serves. This anchors all AI-generated questions, autofill content, and gap analysis. Write it from the client{"'"}s perspective.
              </p>
              <textarea
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder='e.g. "Bring dental implant patients from across Europe to our clinic in Moldova. We offer premium quality at 60% lower cost than Western Europe."'
                rows={3}
                className="w-full resize-none rounded-lg border px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors focus:ring-1"
                style={{
                  borderColor: "var(--adm-border)",
                  backgroundColor: "var(--adm-bg)",
                  color: "var(--adm-text)",
                  "--tw-ring-color": "var(--adm-accent)",
                } as React.CSSProperties}
              />
            </div>

            {/* Identity */}
            <SectionCard title="Identity">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Client Name" value={name} onChange={setName} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>Client Type</label>
                  <select
                    value={clientType}
                    onChange={(e) => setClientType(e.target.value as ClientType)}
                    className="h-9 rounded-lg border px-3 text-sm outline-none focus:ring-1"
                    style={{
                      borderColor: "var(--adm-border)",
                      backgroundColor: "var(--adm-surface)",
                      color: "var(--adm-text)",
                      "--tw-ring-color": "var(--adm-accent)",
                    } as React.CSSProperties}
                  >
                    {CLIENT_TYPES.map((ct) => (
                      <option key={ct} value={ct}>{CLIENT_TYPE_LABELS[ct]}</option>
                    ))}
                  </select>
                  <p className="text-[10px]" style={{ color: "var(--adm-text-placeholder)" }}>Affects channel presets and dashboard UI</p>
                </div>
              </div>
            </SectionCard>

            {/* Access */}
            <SectionCard title="Access">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="URL Slug" value={slug} onChange={setSlug} hint="Used in the URL: /your-slug" />
                <Field label="PIN Code" value={pin} onChange={setPin} hint="6-digit access code for client" />
                <Field label="Default Language" value={defaultLang} onChange={setDefaultLang} hint="e.g. en, ro, da" />
                <Field label="Available Languages" value={languages} onChange={setLanguages} hint="Comma-separated: en, ro, da" />
              </div>
            </SectionCard>

            {/* Save button */}
            <div className="flex justify-end">
              <button
                onClick={handleSaveGeneral}
                disabled={saving}
                className="flex h-9 items-center gap-1.5 rounded-lg px-5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: "var(--adm-accent)" }}
              >
                <Save className="h-3.5 w-3.5" />
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>

            <DangerZone
              clientName={client.name}
              clientId={clientId}
              token={token}
              onReset={() => { mutate(); }}
              onDelete={onDelete}
            />
          </div>
        )}
        {section === "branding" && (
          <BrandingEditor client={client} token={token} onSave={() => { mutate(); onSave(); }} />
        )}
        {section === "subscriptions" && (
          <SubscriptionsManager clientId={clientId} token={token} />
        )}
        {section === "sales" && (
          <SalesEditor
            clientId={clientId}
            clientSlug={client.slug}
            clientName={client.name}
            currency={client.currency ?? "DKK"}
            token={token}
          />
        )}
        {section === "knowledge" && (
          <KnowledgeBank clientId={clientId} token={token} />
        )}
        {section === "tabs" && (
          <TabDataEditor
            clientId={clientId}
            token={token}
            defaultLanguage={client.default_language}
            availableLanguages={client.available_languages}
          />
        )}
      </main>
    </div>
  );
}

/* -- Reusable section card wrapper -- */
function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl border p-5"
      style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
    >
      <h3 className="mb-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--adm-text-muted)" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

/* -- Danger Zone (unchanged logic, slightly cleaner) -- */
function DangerZone({
  clientName,
  clientId,
  token,
  onReset,
  onDelete,
}: {
  clientName: string;
  clientId: string;
  token: string;
  onReset: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [resetting, setResetting] = useState(false);
  const [done, setDone] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteCountdown, setDeleteCountdown] = useState(0);
  const [deleting, setDeleting] = useState(false);

  const nameMatches = confirmText.trim().toLowerCase() === clientName.trim().toLowerCase();
  const deleteNameMatches = deleteConfirmText.trim().toLowerCase() === clientName.trim().toLowerCase();

  useEffect(() => {
    if (nameMatches && countdown === 0 && !done) setCountdown(5);
    if (!nameMatches) setCountdown(0);
  }, [nameMatches, done]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (deleteNameMatches && deleteCountdown === 0 && !deleting) setDeleteCountdown(5);
    if (!deleteNameMatches) setDeleteCountdown(0);
  }, [deleteNameMatches, deleting]);

  useEffect(() => {
    if (deleteCountdown <= 0) return;
    const timer = setTimeout(() => setDeleteCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [deleteCountdown]);

  const handleReset = async () => {
    if (!nameMatches || countdown > 0) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/reset-tabs`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ confirm_name: confirmText }),
      });
      if (res.ok) { setDone(true); setConfirmText(""); onReset(); }
    } finally { setResetting(false); }
  };

  const handleDeleteProject = async () => {
    if (!deleteNameMatches || deleteCountdown > 0) return;
    setDeleting(true);
    onDelete();
  };

  return (
    <div className="mt-4 rounded-xl border" style={{ borderColor: "var(--adm-danger-text)" }}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-5 py-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" style={{ color: "var(--adm-danger-text)" }} />
          <span className="text-xs font-semibold" style={{ color: "var(--adm-danger-text)" }}>Danger Zone</span>
        </div>
        <ChevronDown className="h-4 w-4 transition-transform" style={{ color: "var(--adm-danger-text)", transform: open ? "rotate(180deg)" : "rotate(0deg)" }} />
      </button>

      {open && (
        <div className="border-t px-5 py-5" style={{ borderColor: "var(--adm-danger-text)" }}>
          <div className="flex flex-col gap-5">
            {/* Reset */}
            <div className="rounded-lg border p-4" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}>
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: "var(--adm-danger-text)" }} />
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold">Reset All Tab Data</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--adm-text-secondary)" }}>
                    Permanently erase all tab data and translations. Knowledge Bank entries are preserved.
                  </p>
                  {done ? (
                    <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: "color-mix(in srgb, var(--adm-success) 12%, transparent)" }}>
                      <Check className="h-4 w-4" style={{ color: "var(--adm-success)" }} />
                      <span className="text-xs font-medium" style={{ color: "var(--adm-success)" }}>Tab data reset. Knowledge Bank preserved.</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-medium" style={{ color: "var(--adm-text-muted)" }}>
                          Type <strong style={{ color: "var(--adm-text)" }}>{clientName}</strong> to confirm
                        </label>
                        <input
                          type="text" value={confirmText} onChange={(e) => { setConfirmText(e.target.value); setDone(false); }} placeholder={clientName}
                          className="h-9 rounded-lg border px-3 text-sm outline-none focus:ring-1"
                          style={{ borderColor: nameMatches ? "var(--adm-danger-text)" : "var(--adm-border)", backgroundColor: "var(--adm-bg)", color: "var(--adm-text)", "--tw-ring-color": "var(--adm-danger-text)" } as React.CSSProperties}
                        />
                      </div>
                      <button onClick={handleReset} disabled={!nameMatches || countdown > 0 || resetting}
                        className="flex h-9 w-fit items-center gap-2 rounded-lg px-4 text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{ backgroundColor: "var(--adm-danger-text)" }}
                      >
                        <RotateCcw className={`h-3.5 w-3.5 ${resetting ? "animate-spin" : ""}`} />
                        {resetting ? "Resetting..." : countdown > 0 ? `Wait ${countdown}s...` : "Reset All Tab Data"}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
            {/* Delete */}
            <div className="rounded-lg border p-4" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}>
              <div className="flex items-start gap-3">
                <Trash2 className="mt-0.5 h-5 w-5 flex-shrink-0" style={{ color: "var(--adm-danger-text)" }} />
                <div className="flex flex-col gap-2">
                  <h3 className="text-sm font-semibold">Delete Project</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--adm-text-secondary)" }}>
                    Permanently delete this project and <strong>all associated data</strong>. Cannot be undone.
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium" style={{ color: "var(--adm-text-muted)" }}>
                      Type <strong style={{ color: "var(--adm-text)" }}>{clientName}</strong> to confirm
                    </label>
                    <input
                      type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder={clientName}
                      className="h-9 rounded-lg border px-3 text-sm outline-none focus:ring-1"
                      style={{ borderColor: deleteNameMatches ? "var(--adm-danger-text)" : "var(--adm-border)", backgroundColor: "var(--adm-bg)", color: "var(--adm-text)", "--tw-ring-color": "var(--adm-danger-text)" } as React.CSSProperties}
                    />
                  </div>
                  <button onClick={handleDeleteProject} disabled={!deleteNameMatches || deleteCountdown > 0 || deleting}
                    className="flex h-9 w-fit items-center gap-2 rounded-lg px-4 text-xs font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "var(--adm-danger-text)" }}
                  >
                    <Trash2 className={`h-3.5 w-3.5 ${deleting ? "animate-spin" : ""}`} />
                    {deleting ? "Deleting..." : deleteCountdown > 0 ? `Wait ${deleteCountdown}s...` : "Delete Project Permanently"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>{label}</label>
      <input
        type="text" value={value} onChange={(e) => onChange(e.target.value)}
        className="h-9 rounded-lg border px-3 text-sm outline-none focus:ring-1"
        style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)", color: "var(--adm-text)", "--tw-ring-color": "var(--adm-accent)" } as React.CSSProperties}
      />
      {hint && <p className="text-[10px]" style={{ color: "var(--adm-text-placeholder)" }}>{hint}</p>}
    </div>
  );
}
