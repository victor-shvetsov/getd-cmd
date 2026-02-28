"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { TAB_KEYS, type TabKey } from "@/lib/types";
import {
  BLOCK_TYPES,
  getSectionSchema,
  getDefaultTabData,
} from "@/lib/schema";
import { LANG_FLAGS, mergeTranslation } from "@/lib/i18n";
import { AssetsHubEditor } from "@/components/admin/assets-hub-editor";
import { DemandHubEditor } from "@/components/admin/demand-hub-editor";
import { WebsiteHubEditor } from "@/components/admin/website-hub-editor";
import { BriefFieldsEditor, KpiCardsEditor, FlowEditor } from "./editors/brief-editor";
import { ChannelsEditor } from "./editors/channels-editor";
import { ExecutionEditor } from "./editors/execution-editor";
import { GenericJsonEditor } from "./editors/json-editor";
import { NON_TRANSLATABLE_KEYS } from "./editors/shared";
import {
  Save,
  Check,
  Plus,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Code2,
  Sparkles,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TabRow {
  id: string;
  client_id: string;
  tab_key: TabKey;
  data: Record<string, unknown>;
  sort_order: number;
  is_visible: boolean;
}

interface TabTranslationRow {
  id: string;
  client_tab_id: string;
  language_code: string;
  data: Record<string, unknown>;
  tab_key: TabKey;
}

export const TAB_LABELS: Record<string, string> = {
  brief: "Brief",
  marketing_channels: "Channels",
  demand: "Demand",
  website: "Website",
  assets: "Assets",
  execution: "Execution",
  sales: "Sales",
  activity: "Activity",
};

/* ------------------------------------------------------------------ */
/*  Block-level editor (unchanged logic)                               */
/* ------------------------------------------------------------------ */

interface BlockDef {
  key: string;
  type: string;
  title: string;
  fields: string[];
}

function BlockFieldsEditor({
  type, fields, data, onChange, isTranslationMode, baseData, clientId, token,
}: {
  type: string; fields: string[]; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void;
  isTranslationMode: boolean; baseData: Record<string, unknown>; clientId?: string; token?: string;
}) {
  const tp = { isTranslationMode, baseData };
  switch (type) {
    case BLOCK_TYPES.BRIEF:
      return <BriefFieldsEditor data={data} onChange={onChange} fields={fields} {...tp} />;
    case BLOCK_TYPES.KPI_CARDS:
      return <KpiCardsEditor data={data} onChange={onChange} {...tp} />;
    case BLOCK_TYPES.FLOW:
      return <FlowEditor data={data} onChange={onChange} {...tp} />;
    case BLOCK_TYPES.CHANNELS:
      return <ChannelsEditor data={data} onChange={onChange} {...tp} />;
    case BLOCK_TYPES.DEMAND:
      return <DemandHubEditor data={data} onChange={onChange} />;
    case BLOCK_TYPES.WEBSITE:
      return <WebsiteHubEditor data={data} onChange={onChange} />;
    case BLOCK_TYPES.ASSETS:
      return <AssetsHubEditor data={data} onChange={onChange} clientId={clientId ?? ""} token={token ?? ""} />;
    case BLOCK_TYPES.EXECUTION:
      return <ExecutionEditor data={data} onChange={onChange} {...tp} />;
    default:
      return <GenericJsonEditor data={data} onChange={onChange} />;
  }
}

function BlockEditor({
  block, data, onChange, isTranslationMode, baseData, onTranslateBlock, translating, clientId, token,
}: {
  block: BlockDef; data: Record<string, unknown>; onChange: (d: Record<string, unknown>) => void;
  isTranslationMode: boolean; baseData: Record<string, unknown>;
  onTranslateBlock: (blockKey: string) => void; translating: string | null;
  clientId?: string; token?: string;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const blockData = (data[block.key] ?? {}) as Record<string, unknown>;
  const blockBaseData = (baseData[block.key] ?? {}) as Record<string, unknown>;
  const isBlockTranslating = translating === block.key || translating === "all";

  const updateBlock = (newBlockData: Record<string, unknown>) => {
    onChange({ ...data, [block.key]: newBlockData });
  };

  return (
    <div
      className="rounded-lg border bg-[var(--adm-surface)]"
      style={{ borderColor: isTranslationMode ? "color-mix(in srgb, var(--adm-accent) 13%, transparent)" : "var(--adm-border)" }}
    >
      <div className="flex w-full items-center justify-between px-4 py-3">
        <button onClick={() => setCollapsed(!collapsed)} className="flex flex-1 items-center gap-2">
          <span className="rounded bg-[var(--adm-accent-bg)] px-1.5 py-0.5 text-[10px] font-mono text-[var(--adm-accent-text)]">{block.type}</span>
          <span className="text-xs font-semibold text-[var(--adm-text)]">{block.title}</span>
          {collapsed ? <ChevronDown className="h-3.5 w-3.5 text-[var(--adm-text-muted)]" /> : <ChevronUp className="h-3.5 w-3.5 text-[var(--adm-text-muted)]" />}
        </button>
        {isTranslationMode && (
          <button
            onClick={() => onTranslateBlock(block.key)}
            disabled={translating !== null}
            className="flex items-center gap-1 rounded-md bg-[var(--adm-accent-10)] px-2 py-1 text-[10px] font-medium text-[var(--adm-accent-text)] transition-colors hover:bg-[var(--adm-accent-20)] disabled:opacity-50"
          >
            {isBlockTranslating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Translate
          </button>
        )}
      </div>
      {!collapsed && (
        <div className="border-t border-[var(--adm-border)] p-4">
          <BlockFieldsEditor
            type={block.type} fields={block.fields} data={blockData} onChange={updateBlock}
            isTranslationMode={isTranslationMode} baseData={blockBaseData} clientId={clientId} token={token}
          />
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  SingleTabEditor -- renders ONE tab's content inline                */
/*  Used by the client-editor for each content tab                     */
/* ------------------------------------------------------------------ */

export interface SingleTabEditorProps {
  clientId: string;
  token: string;
  tabKey: TabKey;
  defaultLanguage: string;
  availableLanguages: string[];
}

export function SingleTabEditor({ clientId, token, tabKey, defaultLanguage, availableLanguages }: SingleTabEditorProps) {
  const authFetcher = useCallback(
    (url: string) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    [token]
  );

  const { data: tabs, mutate } = useSWR<TabRow[]>(`/api/admin/clients/${clientId}/tabs`, authFetcher);
  const { data: allTranslations, mutate: mutateTranslations } = useSWR<TabTranslationRow[]>(
    `/api/admin/clients/${clientId}/tab-translations`, authFetcher
  );

  const currentTab = tabs?.find((t) => t.tab_key === tabKey) ?? null;
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [savedSnapshot, setSavedSnapshot] = useState<string>("{}");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [jsonMode, setJsonMode] = useState(false);
  const [jsonText, setJsonText] = useState("");
  const [jsonError, setJsonError] = useState("");
  const [editLang, setEditLang] = useState(defaultLanguage);
  const [translating, setTranslating] = useState<string | null>(null);
  const [translateError, setTranslateError] = useState<string | null>(null);
  const [autoFilling, setAutoFilling] = useState(false);
  const [autoFillError, setAutoFillError] = useState<string | null>(null);

  const isTranslationMode = editLang !== defaultLanguage;
  const otherLanguages = availableLanguages.filter((l) => l !== defaultLanguage);
  const baseData = currentTab ? currentTab.data : {};

  const currentTranslation = allTranslations?.find(
    (tr) => tr.client_tab_id === currentTab?.id && tr.language_code === editLang
  );

  // If the tab doesn't exist yet, offer to create it
  const tabExists = !!currentTab;
  const [creating, setCreating] = useState(false);

  const handleCreateTab = useCallback(async () => {
    setCreating(true);
    const defaultData = getDefaultTabData(tabKey);
    await fetch(`/api/admin/clients/${clientId}/tabs`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        tab_key: tabKey,
        data: defaultData,
        sort_order: (tabs?.length ?? 0) + 1,
        is_visible: true,
      }),
    });
    await mutate();
    setCreating(false);
  }, [clientId, tabKey, tabs, mutate, token]);

  useEffect(() => {
    if (!currentTab) return;
    const tabIsAssets = currentTab.tab_key === "assets";

    if (isTranslationMode && !tabIsAssets) {
      const base = JSON.parse(JSON.stringify(currentTab.data));
      const translationData = currentTranslation?.data;
      if (translationData && Object.keys(translationData).length > 0) {
        const merged = mergeTranslation(base, translationData);
        setEditData(merged as Record<string, unknown>);
      } else {
        setEditData(base);
      }
    } else {
      setEditData(JSON.parse(JSON.stringify(currentTab.data)));
    }

    const baseJson = JSON.stringify(currentTab.data, null, 2);
    if (isTranslationMode && !tabIsAssets && currentTranslation?.data) {
      const merged = mergeTranslation(currentTab.data, currentTranslation.data);
      setJsonText(JSON.stringify(merged, null, 2));
      setSavedSnapshot(JSON.stringify(merged));
    } else {
      setJsonText(baseJson);
      setSavedSnapshot(JSON.stringify(currentTab.data));
    }
    setJsonError("");
    setJustSaved(false);
  }, [currentTab?.id, currentTab?.data, editLang, isTranslationMode, currentTranslation]);

  const isDirty = useMemo(() => {
    const current = jsonMode ? jsonText : JSON.stringify(editData);
    return current !== savedSnapshot;
  }, [editData, jsonText, savedSnapshot, jsonMode]);

  const handleSaveData = useCallback(async () => {
    if (jsonMode && jsonError) return;
    if (!currentTab) return;
    setSaving(true);
    try {
      const dataToSave = jsonMode ? JSON.parse(jsonText) : editData;
      if (isTranslationMode) {
        await fetch(`/api/admin/clients/${clientId}/tab-translations`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ client_tab_id: currentTab.id, language_code: editLang, data: dataToSave }),
        });
        await mutateTranslations();
      } else {
        await fetch(`/api/admin/clients/${clientId}/tabs`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ tabId: currentTab.id, data: dataToSave }),
        });
        await mutate();
      }
    } catch { /* ignore */ }
    const saved = jsonMode ? jsonText : JSON.stringify(editData);
    setSavedSnapshot(saved);
    setSaving(false);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
  }, [clientId, currentTab, editData, jsonMode, jsonText, jsonError, mutate, mutateTranslations, isTranslationMode, editLang, token]);

  const handleAutoFill = useCallback(async () => {
    if (!currentTab) return;
    setAutoFilling(true);
    setAutoFillError(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/knowledge/autofill`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tabKey: currentTab.tab_key }),
      });
      const result = await res.json();
      if (!res.ok) { setAutoFillError(result.error ?? "Auto-fill failed"); return; }
      setEditData(result.suggested);
      if (jsonMode) { setJsonText(JSON.stringify(result.suggested, null, 2)); setJsonError(""); }
    } catch (err) {
      setAutoFillError(err instanceof Error ? err.message : "Auto-fill failed");
    } finally { setAutoFilling(false); }
  }, [currentTab, clientId, token, jsonMode]);

  const handleToggleVisibility = useCallback(async () => {
    if (!currentTab) return;
    await fetch(`/api/admin/clients/${clientId}/tabs`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tabId: currentTab.id, is_visible: !currentTab.is_visible }),
    });
    mutate();
  }, [clientId, currentTab, mutate, token]);

  const toggleJsonMode = useCallback(() => {
    if (jsonMode) {
      try { const parsed = JSON.parse(jsonText); setEditData(parsed); setJsonMode(false); }
      catch { setJsonError("Fix JSON errors before switching to form mode"); }
    } else {
      setJsonText(JSON.stringify(editData, null, 2)); setJsonError(""); setJsonMode(true);
    }
  }, [jsonMode, jsonText, editData]);

  const handleTranslateAll = useCallback(async () => {
    if (!isTranslationMode || !currentTab) return;
    setTranslating("all");
    setTranslateError(null);
    try {
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ data: baseData, sourceLang: defaultLanguage, targetLang: editLang, nonTranslatableKeys: Array.from(NON_TRANSLATABLE_KEYS) }),
      });
      const result = await res.json();
      if (result.error) { setTranslateError(result.error); }
      else if (result.translated) { setEditData(result.translated); setJsonText(JSON.stringify(result.translated, null, 2)); }
    } catch (err) { setTranslateError(err instanceof Error ? err.message : String(err)); }
    finally { setTranslating(null); }
  }, [isTranslationMode, currentTab, baseData, defaultLanguage, editLang, token]);

  const handleTranslateBlock = useCallback(async (blockKey: string) => {
    if (!isTranslationMode) return;
    setTranslating(blockKey);
    setTranslateError(null);
    try {
      const blockBaseData = (baseData as Record<string, unknown>)[blockKey];
      if (!blockBaseData) { setTranslateError(`No base data for "${blockKey}"`); return; }
      const res = await fetch("/api/admin/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ data: blockBaseData, sourceLang: defaultLanguage, targetLang: editLang, nonTranslatableKeys: Array.from(NON_TRANSLATABLE_KEYS) }),
      });
      const result = await res.json();
      if (result.error) { setTranslateError(result.error); }
      else if (result.translated) { setEditData((prev) => ({ ...prev, [blockKey]: result.translated })); }
      else { setTranslateError("API returned unexpected response"); }
    } catch (err) { setTranslateError(err instanceof Error ? err.message : String(err)); }
    finally { setTranslating(null); }
  }, [isTranslationMode, baseData, defaultLanguage, editLang, token]);

  /* ---------- Render ---------- */

  // Loading
  if (!tabs) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" style={{ borderColor: "var(--adm-accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  // Tab doesn't exist yet -- offer to create
  if (!tabExists) {
    return (
      <div className="flex flex-col items-center gap-3 py-12">
        <p className="text-sm font-medium" style={{ color: "var(--adm-text-muted)" }}>
          {TAB_LABELS[tabKey] ?? tabKey} tab not created yet
        </p>
        <button
          onClick={handleCreateTab}
          disabled={creating}
          className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: "var(--adm-accent)" }}
        >
          <Plus className="h-3.5 w-3.5" />
          {creating ? "Creating..." : `Create ${TAB_LABELS[tabKey] ?? tabKey} tab`}
        </button>
      </div>
    );
  }

  const schema = getSectionSchema(tabKey);

  return (
    <div className="flex flex-col gap-4">
      {/* Language bar */}
      {otherLanguages.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--adm-text-secondary)]">Language</span>
          <div className="flex items-center gap-1 rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface)] p-1">
            <button
              onClick={() => setEditLang(defaultLanguage)}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
              style={{
                backgroundColor: !isTranslationMode ? "var(--adm-accent)" : "transparent",
                color: !isTranslationMode ? "#fff" : "var(--adm-text-muted)",
              }}
            >
              <span className="text-sm leading-none">{LANG_FLAGS[defaultLanguage] ?? defaultLanguage}</span>
              <span className="uppercase">{defaultLanguage}</span>
              <span className="text-[9px] opacity-60">(base)</span>
            </button>
            {otherLanguages.map((lang) => (
              <button
                key={lang}
                onClick={() => setEditLang(lang)}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
                style={{
                  backgroundColor: editLang === lang ? "var(--adm-accent)" : "transparent",
                  color: editLang === lang ? "#fff" : "var(--adm-text-muted)",
                }}
              >
                <span className="text-sm leading-none">{LANG_FLAGS[lang] ?? lang}</span>
                <span className="uppercase">{lang}</span>
              </button>
            ))}
          </div>
          {isTranslationMode && (
            <button
              onClick={handleTranslateAll}
              disabled={translating !== null}
              className="ml-auto flex h-7 items-center gap-1.5 rounded-lg bg-[var(--adm-accent-10)] px-2.5 text-[11px] font-medium text-[var(--adm-accent-text)] transition-colors hover:bg-[var(--adm-accent-20)] disabled:opacity-50"
            >
              {translating === "all" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Translate All
            </button>
          )}
        </div>
      )}

      {/* Translation indicator */}
      {isTranslationMode && (
        <div className="flex items-center gap-2 rounded-lg border px-3 py-2"
          style={{ borderColor: "color-mix(in srgb, var(--adm-accent) 20%, transparent)", backgroundColor: "var(--adm-accent-bg)" }}>
          <span className="text-sm leading-none">{LANG_FLAGS[editLang] ?? editLang}</span>
          <span className="text-xs text-[var(--adm-accent-text)]">
            Editing <span className="font-semibold uppercase">{editLang}</span> translation
          </span>
          <span className="text-[10px] text-[var(--adm-text-secondary)]">
            -- Base text ({defaultLanguage.toUpperCase()}) shown above each field
          </span>
        </div>
      )}
      {translateError && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--adm-danger-text)] bg-[var(--adm-danger-bg)] px-3 py-2">
          <span className="text-xs text-[var(--adm-danger-text)]">Translation error: {translateError}</span>
          <button onClick={() => setTranslateError(null)} className="ml-auto text-[10px] text-[var(--adm-danger-text-60)] hover:text-[var(--adm-danger-text)]">dismiss</button>
        </div>
      )}
      {autoFillError && (
        <div className="flex items-center gap-2 rounded-lg border border-[var(--adm-danger-text)] bg-[var(--adm-danger-bg)] px-3 py-2">
          <Sparkles className="h-3 w-3 flex-shrink-0 text-[var(--adm-danger-text)]" />
          <span className="text-xs text-[var(--adm-danger-text)]">{autoFillError}</span>
          <button onClick={() => setAutoFillError(null)} className="ml-auto text-[10px] text-[var(--adm-danger-text-60)] hover:text-[var(--adm-danger-text)]">dismiss</button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!isTranslationMode && (
            <button
              onClick={handleToggleVisibility}
              className="flex items-center gap-1 rounded-md border border-[var(--adm-border)] px-2 py-1 text-[10px] text-[var(--adm-text-secondary)] transition-colors hover:bg-[var(--adm-surface-2)]"
            >
              {currentTab.is_visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {currentTab.is_visible ? "Visible to client" : "Hidden from client"}
            </button>
          )}
          <button
            onClick={toggleJsonMode}
            className="flex items-center gap-1 rounded-md border border-[var(--adm-border)] px-2 py-1 text-[10px] text-[var(--adm-text-secondary)] transition-colors hover:bg-[var(--adm-surface-2)]"
          >
            <Code2 className="h-3 w-3" />
            {jsonMode ? "Form" : "JSON"}
          </button>
        </div>
        {!isTranslationMode && (
          <button
            onClick={handleAutoFill}
            disabled={autoFilling}
            className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors disabled:opacity-50"
            style={{ borderColor: "color-mix(in srgb, var(--adm-accent) 30%, transparent)", color: "var(--adm-accent-text)", backgroundColor: "var(--adm-accent-10)" }}
          >
            {autoFilling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {autoFilling ? "Generating..." : "Auto-fill from KB"}
          </button>
        )}
      </div>

      {/* Content */}
      {jsonMode ? (
        <div className="relative">
          <textarea
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              try { JSON.parse(e.target.value); setJsonError(""); } catch { setJsonError("Invalid JSON"); }
            }}
            spellCheck={false}
            className="min-h-[400px] w-full rounded-lg border border-[var(--adm-border)] bg-[var(--adm-bg)] p-3 font-mono text-xs leading-relaxed text-[var(--adm-text)] outline-none focus:border-[var(--adm-accent)]"
            style={{ tabSize: 2 }}
          />
          {jsonError && (
            <div className="absolute bottom-2 right-2 rounded-md bg-[var(--adm-danger-bg)] px-2 py-1 text-[10px] text-[var(--adm-danger-text)]">{jsonError}</div>
          )}
        </div>
      ) : schema ? (
        <div className="flex flex-col gap-6">
          {schema.blocks.map((block) => (
            <BlockEditor
              key={block.key} block={block} data={editData} onChange={setEditData}
              isTranslationMode={isTranslationMode} clientId={clientId} token={token}
              baseData={baseData as Record<string, unknown>}
              onTranslateBlock={handleTranslateBlock} translating={translating}
            />
          ))}
        </div>
      ) : (
        <div className="py-6 text-center text-xs" style={{ color: "var(--adm-text-muted)" }}>
          No schema defined for this tab. Switch to JSON mode to edit raw data.
        </div>
      )}

      {/* Sticky save bar */}
      {(isDirty || justSaved) && (
        <div
          className="sticky bottom-4 z-20 flex items-center justify-between rounded-xl border px-5 py-3 shadow-lg"
          style={{ borderColor: isDirty ? "var(--adm-accent)" : "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
        >
          <span className="text-xs font-medium" style={{ color: "var(--adm-text-secondary)" }}>
            {justSaved ? "Changes saved" : `Unsaved changes`}
          </span>
          <button
            onClick={handleSaveData}
            disabled={saving || (!isDirty && !justSaved) || (jsonMode && !!jsonError)}
            className={`flex h-8 items-center gap-1.5 rounded-lg px-4 text-xs font-semibold transition-all ${
              justSaved ? "bg-emerald-600 text-white"
              : isDirty ? "bg-[var(--adm-accent)] text-white hover:bg-[var(--adm-accent-hover)]"
              : "border border-[var(--adm-border)] text-[var(--adm-text-muted)] opacity-50 cursor-default"
            }`}
          >
            {justSaved ? (<><Check className="h-3.5 w-3.5" /> Saved</>) :
             saving ? (<><Save className="h-3.5 w-3.5 animate-pulse" /> Saving...</>) :
             (<><Save className="h-3.5 w-3.5" /> {isTranslationMode ? `Save ${editLang.toUpperCase()}` : "Save"}</>)}
          </button>
        </div>
      )}
    </div>
  );
}
