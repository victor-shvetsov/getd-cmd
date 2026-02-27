"use client";

import { useCallback, useMemo, useState } from "react";
import {
  X,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Save,
  Loader2,
  ArrowRight,
  RotateCcw,
  CheckCheck,
  Ban,
} from "lucide-react";
import { SECTION_SCHEMAS, TAB_KEY_TO_SECTION } from "@/lib/schema";
import { TAB_KEYS, type TabKey } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TabResult {
  suggested: Record<string, unknown>;
  existing: Record<string, unknown>;
  hasExisting: boolean;
}

interface AutoFillPreviewProps {
  results: Record<string, TabResult>;
  clientId: string;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Flatten nested object into dot-path -> value pairs */
function flattenObj(
  obj: unknown,
  prefix = "",
  out: Record<string, unknown> = {}
): Record<string, unknown> {
  if (obj === null || obj === undefined) return out;
  if (Array.isArray(obj)) {
    // For arrays, show them as one "field" so diffing is at the array level
    out[prefix] = obj;
    return out;
  }
  if (typeof obj === "object") {
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${k}` : k;
      if (typeof v === "object" && v !== null && !Array.isArray(v)) {
        flattenObj(v, path, out);
      } else {
        out[path] = v;
      }
    }
    return out;
  }
  out[prefix] = obj;
  return out;
}

/** Pretty-print a value for display */
function displayValue(val: unknown): string {
  if (val === null || val === undefined || val === "") return "(empty)";
  if (Array.isArray(val)) {
    if (val.length === 0) return "(empty list)";
    if (typeof val[0] === "string") return val.join(", ");
    return `${val.length} item(s)`;
  }
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  return String(val);
}

/** Check if a value is "empty" */
function isEmpty(val: unknown): boolean {
  if (val === null || val === undefined || val === "") return true;
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === "object") return Object.keys(val as Record<string, unknown>).length === 0;
  return false;
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function AutoFillPreview({
  results,
  clientId,
  token,
  onClose,
  onSaved,
}: AutoFillPreviewProps) {
  const tabKeys = useMemo(
    () => TAB_KEYS.filter((k) => k in results) as TabKey[],
    [results]
  );
  const [activeTab, setActiveTab] = useState<TabKey>(tabKeys[0]);

  // Track which fields are accepted per tab
  // Key: "tabKey::fieldPath", value: boolean
  const [accepted, setAccepted] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const tabKey of tabKeys) {
      const { suggested, existing } = results[tabKey];
      const flatSuggested = flattenObj(suggested);
      const flatExisting = flattenObj(existing);
      for (const path of Object.keys(flatSuggested)) {
        const key = `${tabKey}::${path}`;
        const sugVal = flatSuggested[path];
        const exVal = flatExisting[path];
        // Auto-accept if: field is new (no existing data) or existing is empty
        initial[key] = isEmpty(exVal);
      }
    }
    return initial;
  });

  const [saving, setSaving] = useState(false);
  const [savedTabs, setSavedTabs] = useState<Set<string>>(new Set());

  const toggleField = useCallback((key: string) => {
    setAccepted((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const acceptAllForTab = useCallback(
    (tabKey: TabKey) => {
      setAccepted((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          if (k.startsWith(`${tabKey}::`)) next[k] = true;
        }
        return next;
      });
    },
    []
  );

  const rejectAllForTab = useCallback(
    (tabKey: TabKey) => {
      setAccepted((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) {
          if (k.startsWith(`${tabKey}::`)) next[k] = false;
        }
        return next;
      });
    },
    []
  );

  // Fields that come from CSV uploads and must NEVER be overwritten by AI
  const PROTECTED_FIELDS: Record<string, string[]> = {
    demand: ["keyword_research.keywords", "keyword_research.ppc_sheet_link", "keyword_research.uploaded_at", "keyword_research.currency"],
    website: ["website_architecture.pages", "website_architecture.seo_sheet_link", "website_architecture.uploaded_at", "website_architecture.multi_location"],
  };

  // Build the final merged data for a tab
  const buildMergedData = useCallback(
    (tabKey: TabKey): Record<string, unknown> => {
      const { suggested, existing } = results[tabKey];
      // Start from suggested, and for rejected fields, use existing values
      const merged = JSON.parse(JSON.stringify(suggested));

      const protectedPaths = PROTECTED_FIELDS[tabKey] ?? [];

      const flatSuggested = flattenObj(suggested);
      for (const path of Object.keys(flatSuggested)) {
        const key = `${tabKey}::${path}`;
        // Always preserve protected fields from existing data
        if (protectedPaths.some((pp) => path === pp || path.startsWith(pp + "."))) {
          const existingVal = getNestedValue(existing, path);
          if (existingVal !== undefined && existingVal !== null && existingVal !== "") {
            setNestedValue(merged, path, existingVal);
          }
          continue;
        }
        if (!accepted[key]) {
          // Rejected — restore existing value
          setNestedValue(merged, path, getNestedValue(existing, path));
        }
      }

      // Also copy protected fields that might not be in suggested at all
      for (const pp of protectedPaths) {
        const existingVal = getNestedValue(existing, pp);
        if (existingVal !== undefined && existingVal !== null) {
          const suggestedVal = getNestedValue(merged, pp);
          // If existing has data and suggested is empty, preserve existing
          if (Array.isArray(existingVal) && existingVal.length > 0 && (!suggestedVal || (Array.isArray(suggestedVal) && suggestedVal.length === 0))) {
            setNestedValue(merged, pp, existingVal);
          } else if (typeof existingVal === "string" && existingVal && !suggestedVal) {
            setNestedValue(merged, pp, existingVal);
          }
        }
      }

      return merged;
    },
    [results, accepted]
  );

  const handleSaveAll = useCallback(async () => {
    setSaving(true);
    const saved = new Set<string>();
    try {
      for (const tabKey of tabKeys) {
        // Check if any fields are accepted for this tab
        const hasAccepted = Object.entries(accepted).some(
          ([k, v]) => k.startsWith(`${tabKey}::`) && v
        );
        if (!hasAccepted) continue;

        const data = buildMergedData(tabKey);
        const res = await fetch(`/api/admin/clients/${clientId}/tabs`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            tab_key: tabKey,
            data,
          }),
        });
        if (res.ok) saved.add(tabKey);
      }
      setSavedTabs(saved);
      if (saved.size > 0) {
        setTimeout(() => onSaved(), 1200);
      }
    } finally {
      setSaving(false);
    }
  }, [tabKeys, accepted, buildMergedData, clientId, token, onSaved]);

  // Tab stats
  const getTabStats = useCallback(
    (tabKey: TabKey) => {
      let total = 0;
      let numAccepted = 0;
      let numNew = 0;
      let numChanged = 0;
      const { suggested, existing } = results[tabKey];
      const flatSuggested = flattenObj(suggested);
      const flatExisting = flattenObj(existing);

      for (const path of Object.keys(flatSuggested)) {
        const sugVal = flatSuggested[path];
        if (isEmpty(sugVal)) continue;
        total++;
        const exVal = flatExisting[path];
        if (isEmpty(exVal)) numNew++;
        else if (JSON.stringify(sugVal) !== JSON.stringify(exVal)) numChanged++;
        if (accepted[`${tabKey}::${path}`]) numAccepted++;
      }
      return { total, numAccepted, numNew, numChanged };
    },
    [results, accepted]
  );

  const currentResult = results[activeTab];
  if (!currentResult) return null;

  const flatSuggested = flattenObj(currentResult.suggested);
  const flatExisting = flattenObj(currentResult.existing);
  const sectionKey = TAB_KEY_TO_SECTION[activeTab];
  const schema = SECTION_SCHEMAS[sectionKey];

  // Split fields into categories
  const newFields: string[] = [];
  const changedFields: string[] = [];
  const unchangedFields: string[] = [];

  for (const path of Object.keys(flatSuggested)) {
    const sugVal = flatSuggested[path];
    if (isEmpty(sugVal)) continue;
    const exVal = flatExisting[path];
    if (isEmpty(exVal)) {
      newFields.push(path);
    } else if (JSON.stringify(sugVal) !== JSON.stringify(exVal)) {
      changedFields.push(path);
    } else {
      unchangedFields.push(path);
    }
  }

  const totalAccepted = tabKeys.reduce((sum, tk) => {
    const stats = getTabStats(tk);
    return sum + stats.numAccepted;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ backgroundColor: "var(--adm-bg)" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
      >
        <div className="flex items-center gap-3">
          <Sparkles className="h-4 w-4" style={{ color: "var(--adm-accent-text)" }} />
          <div>
            <h2 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
              Auto-fill Dashboard Preview
            </h2>
            <p className="text-[11px]" style={{ color: "var(--adm-text-muted)" }}>
              Review AI suggestions before saving. Accept or reject per field.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {savedTabs.size > 0 && (
            <span className="flex items-center gap-1 text-xs font-medium" style={{ color: "var(--adm-accent-text)" }}>
              <Check className="h-3.5 w-3.5" />
              {savedTabs.size} tab(s) saved
            </span>
          )}
          <button
            onClick={handleSaveAll}
            disabled={saving || totalAccepted === 0}
            className="flex h-8 items-center gap-1.5 rounded-lg px-4 text-xs font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: "var(--adm-accent)" }}
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {saving ? "Saving..." : `Save All (${totalAccepted} fields)`}
          </button>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
            style={{ color: "var(--adm-text-muted)" }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Tab sidebar */}
        <nav
          className="flex w-52 flex-shrink-0 flex-col gap-0.5 overflow-y-auto border-r p-2"
          style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
        >
          {tabKeys.map((tk) => {
            const stats = getTabStats(tk);
            const sKey = TAB_KEY_TO_SECTION[tk];
            const label = SECTION_SCHEMAS[sKey]?.label ?? tk;
            const isActive = tk === activeTab;

            return (
              <button
                key={tk}
                onClick={() => setActiveTab(tk)}
                className="flex flex-col gap-0.5 rounded-lg px-3 py-2 text-left transition-colors"
                style={{
                  backgroundColor: isActive ? "var(--adm-accent-bg)" : "transparent",
                  color: isActive ? "var(--adm-accent-text)" : "var(--adm-text-secondary)",
                }}
              >
                <span className="text-xs font-medium">{label}</span>
                <div className="flex items-center gap-2 text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
                  {stats.numNew > 0 && (
                    <span style={{ color: "var(--adm-accent-text)" }}>+{stats.numNew} new</span>
                  )}
                  {stats.numChanged > 0 && (
                    <span style={{ color: "var(--adm-text-secondary)" }}>{stats.numChanged} changed</span>
                  )}
                  <span>{stats.numAccepted}/{stats.total}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4">
          {/* Tab actions */}
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
              {schema?.label ?? activeTab}
              {currentResult.hasExisting && (
                <span className="ml-2 text-[10px] font-normal" style={{ color: "var(--adm-text-muted)" }}>
                  (has existing data)
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => acceptAllForTab(activeTab)}
                className="flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-medium transition-colors"
                style={{
                  backgroundColor: "var(--adm-accent-10)",
                  color: "var(--adm-accent-text)",
                }}
              >
                <CheckCheck className="h-3 w-3" />
                Accept all
              </button>
              <button
                onClick={() => rejectAllForTab(activeTab)}
                className="flex h-7 items-center gap-1 rounded-md px-2.5 text-[11px] font-medium transition-colors"
                style={{
                  backgroundColor: "var(--adm-surface-2)",
                  color: "var(--adm-text-muted)",
                }}
              >
                <Ban className="h-3 w-3" />
                Reject all
              </button>
            </div>
          </div>

          {/* New fields */}
          {newFields.length > 0 && (
            <FieldSection
              title="New fields"
              subtitle="Not in current data"
              fields={newFields}
              flatSuggested={flatSuggested}
              flatExisting={flatExisting}
              accepted={accepted}
              tabKey={activeTab}
              onToggle={toggleField}
              accentColor="var(--adm-accent-text)"
            />
          )}

          {/* Changed fields */}
          {changedFields.length > 0 && (
            <FieldSection
              title="Changed fields"
              subtitle="Different from current data"
              fields={changedFields}
              flatSuggested={flatSuggested}
              flatExisting={flatExisting}
              accepted={accepted}
              tabKey={activeTab}
              onToggle={toggleField}
              accentColor="var(--adm-text-secondary)"
              showExisting
            />
          )}

          {/* Unchanged */}
          {unchangedFields.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px]" style={{ color: "var(--adm-text-muted)" }}>
                {unchangedFields.length} field(s) unchanged (same as existing)
              </p>
            </div>
          )}

          {newFields.length === 0 && changedFields.length === 0 && (
            <div
              className="flex flex-col items-center gap-2 rounded-xl border py-12"
              style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
            >
              <Check className="h-5 w-5" style={{ color: "var(--adm-accent-text)" }} />
              <p className="text-sm" style={{ color: "var(--adm-text-muted)" }}>
                No changes for this tab
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Field Section                                                      */
/* ------------------------------------------------------------------ */

function FieldSection({
  title,
  subtitle,
  fields,
  flatSuggested,
  flatExisting,
  accepted,
  tabKey,
  onToggle,
  accentColor,
  showExisting = false,
}: {
  title: string;
  subtitle: string;
  fields: string[];
  flatSuggested: Record<string, unknown>;
  flatExisting: Record<string, unknown>;
  accepted: Record<string, boolean>;
  tabKey: TabKey;
  onToggle: (key: string) => void;
  accentColor: string;
  showExisting?: boolean;
}) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-xs font-semibold" style={{ color: accentColor }}>
          {title}
        </span>
        <span className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
          {subtitle} ({fields.length})
        </span>
      </div>
      <div className="flex flex-col gap-1.5">
        {fields.map((path) => {
          const key = `${tabKey}::${path}`;
          const isAccepted = accepted[key] ?? false;
          const sugVal = flatSuggested[path];
          const exVal = flatExisting[path];
          const isArray = Array.isArray(sugVal);

          return (
            <div
              key={path}
              className="flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors"
              style={{
                borderColor: isAccepted
                  ? "color-mix(in srgb, var(--adm-accent) 30%, transparent)"
                  : "var(--adm-border)",
                backgroundColor: isAccepted
                  ? "var(--adm-accent-10)"
                  : "var(--adm-surface)",
              }}
            >
              {/* Toggle */}
              <button
                onClick={() => onToggle(key)}
                className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors"
                style={{
                  borderColor: isAccepted ? "var(--adm-accent)" : "var(--adm-border-hover)",
                  backgroundColor: isAccepted ? "var(--adm-accent)" : "transparent",
                  color: isAccepted ? "#fff" : "transparent",
                }}
              >
                {isAccepted && <Check className="h-3 w-3" />}
              </button>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="mb-1 text-[10px] font-medium uppercase tracking-wider" style={{ color: "var(--adm-text-muted)" }}>
                  {path.replace(/\./g, " > ")}
                </div>

                {/* Show existing -> suggested diff */}
                {showExisting && !isEmpty(exVal) && (
                  <div className="mb-1 flex items-start gap-2">
                    <span
                      className="inline-block max-w-[45%] truncate rounded px-1.5 py-0.5 text-[11px] line-through"
                      style={{
                        backgroundColor: "var(--adm-danger-bg)",
                        color: "var(--adm-danger-text)",
                      }}
                    >
                      {displayValue(exVal)}
                    </span>
                    <ArrowRight className="mt-0.5 h-3 w-3 flex-shrink-0" style={{ color: "var(--adm-text-muted)" }} />
                  </div>
                )}

                {/* Suggested value */}
                <div
                  className="text-xs leading-relaxed"
                  style={{ color: "var(--adm-text)" }}
                >
                  {isArray && Array.isArray(sugVal) ? (
                    typeof sugVal[0] === "object" ? (
                      <details className="cursor-pointer">
                        <summary className="text-[11px] font-medium" style={{ color: "var(--adm-accent-text)" }}>
                          {sugVal.length} item(s) — click to expand
                        </summary>
                        <pre
                          className="mt-1 max-h-48 overflow-auto rounded-lg p-2 text-[10px]"
                          style={{
                            backgroundColor: "var(--adm-surface-2)",
                            color: "var(--adm-text-secondary)",
                          }}
                        >
                          {JSON.stringify(sugVal, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span>{(sugVal as string[]).join(", ")}</span>
                    )
                  ) : (
                    <span>{displayValue(sugVal)}</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Nested object helpers                                              */
/* ------------------------------------------------------------------ */

function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split(".");
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown) {
  const keys = path.split(".");
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in current) || typeof current[keys[i]] !== "object") {
      current[keys[i]] = {};
    }
    current = current[keys[i]] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
}
