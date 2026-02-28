"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import useSWR from "swr";
import type { ClientRow, ClientType, TabKey } from "@/lib/types";
import { CLIENT_TYPES, CLIENT_TYPE_LABELS, TAB_KEYS } from "@/lib/types";
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
  FileText,
  Megaphone,
  TrendingUp,
  Globe,
  FolderOpen,
  ListChecks,
  Activity,
} from "lucide-react";
import { SingleTabEditor, TAB_LABELS } from "@/components/admin/tab-data-editor";
import { KnowledgeBank } from "@/components/admin/knowledge-bank";
import { BrandingEditor } from "@/components/admin/branding-editor";
import { SubscriptionsManager } from "@/components/admin/subscriptions-manager";
import { SalesEditor } from "@/components/admin/editors/sales-editor";
import { ActivityEditor } from "@/components/admin/editors/activity-editor";
import { AdminThemeToggle } from "./admin-theme-toggle";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ClientResponse {
  client: ClientRow;
  tabs: { tab_key: TabKey; sort_order: number; is_visible: boolean }[];
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

/* ------------------------------------------------------------------ */
/*  Section definitions -- flat, one level                             */
/* ------------------------------------------------------------------ */

// "fixed" sections always present; "content" sections come from client_tabs
type SectionKind = "fixed" | "content";

interface SectionDef {
  key: string;
  label: string;
  icon: React.ElementType;
  kind: SectionKind;
  group: "setup" | "content" | "revenue" | "ai";
  tabKey?: TabKey; // for content sections
}

const FIXED_SECTIONS: SectionDef[] = [
  { key: "general",  label: "General",  icon: Settings2, kind: "fixed", group: "setup" },
  { key: "branding", label: "Branding", icon: Palette,   kind: "fixed", group: "setup" },
];

const CONTENT_TAB_ICONS: Record<TabKey, React.ElementType> = {
  brief:              FileText,
  marketing_channels: Megaphone,
  demand:             TrendingUp,
  website:            Globe,
  assets:             FolderOpen,
  execution:          ListChecks,
};

const ACTIVITY_SECTIONS: SectionDef[] = [
  { key: "activity", label: "Activity", icon: Activity, kind: "fixed", group: "activity" },
];

const REVENUE_SECTIONS: SectionDef[] = [
  { key: "sales", label: "Sales", icon: ShoppingBag, kind: "fixed", group: "revenue" },
];

const AI_SECTIONS: SectionDef[] = [
  { key: "knowledge", label: "Knowledge", icon: Brain, kind: "fixed", group: "ai" },
];

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export function ClientEditor({ clientId, token, onBack, onSave, onDelete, theme, toggleTheme }: ClientEditorProps) {
  const authFetcher = useCallback(
    (url: string) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    [token]
  );

  const { data: response, mutate } = useSWR<ClientResponse>(`/api/admin/clients/${clientId}`, authFetcher);
  const client = response?.client;
  const [activeSection, setActiveSection] = useState("general");
  const [saving, setSaving] = useState(false);
  const tabBarRef = useRef<HTMLDivElement>(null);

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

  // Build the flat section list from client tabs
  const contentSections: SectionDef[] = (response?.tabs ?? [])
    .filter((t) => t.tab_key !== "sales" && t.tab_key !== "activity") // these have dedicated editors
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((t) => ({
      key: `tab:${t.tab_key}`,
      label: TAB_LABELS[t.tab_key] ?? t.tab_key,
      icon: CONTENT_TAB_ICONS[t.tab_key] ?? FileText,
      kind: "content" as const,
      group: "content" as const,
      tabKey: t.tab_key,
    }));

  // Also add any missing tabs that can be created
  const existingTabKeys = new Set((response?.tabs ?? []).map((t) => t.tab_key));
  const creatableTabKeys = TAB_KEYS.filter((k) => !existingTabKeys.has(k) && k !== "sales" && k !== "activity");
  const creatableSections: SectionDef[] = creatableTabKeys.map((k) => ({
    key: `tab:${k}`,
    label: TAB_LABELS[k] ?? k,
    icon: CONTENT_TAB_ICONS[k] ?? FileText,
    kind: "content" as const,
    group: "content" as const,
    tabKey: k,
  }));

  const allSections = [
    ...FIXED_SECTIONS,
    ...ACTIVITY_SECTIONS,
    ...contentSections,
    ...creatableSections,
    ...REVENUE_SECTIONS,
    ...AI_SECTIONS,
  ];

  // Scroll the active tab into view
  useEffect(() => {
    if (!tabBarRef.current) return;
    const btn = tabBarRef.current.querySelector(`[data-section="${activeSection}"]`) as HTMLElement | null;
    if (btn) btn.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  }, [activeSection]);

  const handleSaveGeneral = useCallback(async () => {
    setSaving(true);
    const langs = languages.split(",").map((l) => l.trim()).filter(Boolean);
    await fetch(`/api/admin/clients/${clientId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        name, slug, pin, client_type: clientType, project_objective: objective,
        default_language: defaultLang, available_languages: langs,
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

  // Determine if activeSection is a content tab
  const isContentTab = activeSection.startsWith("tab:");
  const activeTabKey = isContentTab ? activeSection.replace("tab:", "") as TabKey : null;

  return (
    <div className="min-h-dvh" style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text)" }}>
      {/* ---- Header ---- */}
      <header className="sticky top-0 z-30" style={{ borderBottom: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface)" }}>
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
              href={`/${client.slug}`} target="_blank" rel="noopener noreferrer"
              className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors hover:opacity-80"
              style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-secondary)" }}
            >
              <Eye className="h-3.5 w-3.5" /> Preview <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* ---- Flat tab bar ---- */}
        <div className="mx-auto max-w-4xl px-5 pb-2">
          <div
            ref={tabBarRef}
            className="flex gap-0.5 overflow-x-auto rounded-lg p-1 scrollbar-none"
            style={{ backgroundColor: "var(--adm-surface-2)", msOverflowStyle: "none", scrollbarWidth: "none" }}
          >
            {allSections.map((s, i) => {
              const Icon = s.icon;
              const active = activeSection === s.key;
              // Add a visual divider between groups
              const prevGroup = i > 0 ? allSections[i - 1].group : s.group;
              const showDivider = i > 0 && prevGroup !== s.group;

              return (
                <div key={s.key} className="flex items-center">
                  {showDivider && (
                    <div className="mx-1 h-4 w-px flex-shrink-0" style={{ backgroundColor: "var(--adm-border)" }} />
                  )}
                  <button
                    data-section={s.key}
                    onClick={() => setActiveSection(s.key)}
                    className="flex flex-shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition-all"
                    style={{
                      backgroundColor: active ? "var(--adm-surface)" : "transparent",
                      color: active ? "var(--adm-text)" : "var(--adm-text-muted)",
                      boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                    }}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{s.label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* ---- Content ---- */}
      <main className="mx-auto max-w-4xl px-5 py-6">
        {/* General */}
        {activeSection === "general" && (
          <div className="flex flex-col gap-6">
            <div className="rounded-xl border p-5" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}>
              <label className="mb-1.5 block text-xs font-bold" style={{ color: "var(--adm-text)" }}>Project Objective</label>
              <p className="mb-3 text-[11px] leading-relaxed" style={{ color: "var(--adm-text-muted)" }}>
                The core business goal this project serves. This anchors all AI-generated content and gap analysis.
              </p>
              <textarea
                value={objective} onChange={(e) => setObjective(e.target.value)}
                placeholder='e.g. "Bring dental implant patients from across Europe to our clinic in Moldova."'
                rows={3}
                className="w-full resize-none rounded-lg border px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors focus:ring-1"
                style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-bg)", color: "var(--adm-text)", "--tw-ring-color": "var(--adm-accent)" } as React.CSSProperties}
              />
            </div>
            <SectionCard title="Identity">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Client Name" value={name} onChange={setName} />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>Client Type</label>
                  <select
                    value={clientType} onChange={(e) => setClientType(e.target.value as ClientType)}
                    className="h-9 rounded-lg border px-3 text-sm outline-none focus:ring-1"
                    style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)", color: "var(--adm-text)", "--tw-ring-color": "var(--adm-accent)" } as React.CSSProperties}
                  >
                    {CLIENT_TYPES.map((ct) => <option key={ct} value={ct}>{CLIENT_TYPE_LABELS[ct]}</option>)}
                  </select>
                  <p className="text-[10px]" style={{ color: "var(--adm-text-placeholder)" }}>Affects channel presets and dashboard UI</p>
                </div>
              </div>
            </SectionCard>
            <SectionCard title="Access">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="URL Slug" value={slug} onChange={setSlug} hint="Used in the URL: /your-slug" />
                <Field label="PIN Code" value={pin} onChange={setPin} hint="6-digit access code for client" />
                <Field label="Default Language" value={defaultLang} onChange={setDefaultLang} hint="e.g. en, ro, da" />
                <Field label="Available Languages" value={languages} onChange={setLanguages} hint="Comma-separated: en, ro, da" />
              </div>
            </SectionCard>
            <div className="flex justify-end">
              <button
                onClick={handleSaveGeneral} disabled={saving}
                className="flex h-9 items-center gap-1.5 rounded-lg px-5 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                style={{ backgroundColor: "var(--adm-accent)" }}
              >
                <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
            <DangerZone clientName={client.name} clientId={clientId} token={token} onReset={() => { mutate(); }} onDelete={onDelete} />
          </div>
        )}

        {/* Branding */}
        {activeSection === "branding" && (
          <BrandingEditor client={client} token={token} onSave={() => { mutate(); onSave(); }} />
        )}

        {/* Content tabs -- each renders SingleTabEditor inline */}
        {/* Execution also includes Subscriptions (billing) below the tab editor */}
        {isContentTab && activeTabKey && (
          <div className="flex flex-col gap-6">
            <SingleTabEditor
              key={activeTabKey}
              clientId={clientId}
              token={token}
              tabKey={activeTabKey}
              defaultLanguage={client.default_language}
              availableLanguages={client.available_languages}
            />
            {activeTabKey === "execution" && (
              <>
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1" style={{ backgroundColor: "var(--adm-border)" }} />
                  <span className="flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: "var(--adm-text-muted)" }}>
                    <CreditCard className="h-3.5 w-3.5" /> Recurring Services
                  </span>
                  <div className="h-px flex-1" style={{ backgroundColor: "var(--adm-border)" }} />
                </div>
                <SubscriptionsManager clientId={clientId} token={token} />
              </>
            )}
          </div>
        )}

        {/* Activity */}
        {activeSection === "activity" && (
          <ActivityEditor clientId={clientId} token={token} />
        )}

        {/* Sales */}
        {activeSection === "sales" && (
          <SalesEditor
            clientId={clientId}
            clientSlug={client.slug}
            clientName={client.name}
            currency={client.currency ?? "DKK"}
            token={token}
          />
        )}

        {/* Knowledge */}
        {activeSection === "knowledge" && (
          <KnowledgeBank clientId={clientId} token={token} />
        )}
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reusable pieces                                                    */
/* ------------------------------------------------------------------ */

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border p-5" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}>
      <h3 className="mb-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--adm-text-muted)" }}>{title}</h3>
      {children}
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

/* ------------------------------------------------------------------ */
/*  Danger Zone                                                        */
/* ------------------------------------------------------------------ */

function DangerZone({
  clientName, clientId, token, onReset, onDelete,
}: {
  clientName: string; clientId: string; token: string; onReset: () => void; onDelete: () => void;
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
