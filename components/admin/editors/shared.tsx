"use client";

import { useState } from "react";
import { Lock, Plus, Trash2 } from "lucide-react";

/* Fields that are typically NOT translated (pre-filled + soft-locked) */
export const NON_TRANSLATABLE_KEYS = new Set([
  "url", "url_path", "link", "sheet_link",
  "price", "currency", "allocated_budget",
  "payment_status", "payment_type", "action_status", "deadline_status",
  "status", "deadline", "priority",
  "primary_keyword", "secondary_keywords", "search_volume", "secondary_volume",
  "focus_kw", "intent",
  "page_type", "funnel_stage",
]);

/** Common props passed to every sub-editor for translation mode */
export interface TranslationProps {
  isTranslationMode: boolean;
  baseData: Record<string, unknown>;
}

/** Translation-aware text/textarea field */
export function FField({
  label,
  value,
  onChange,
  multiline,
  placeholder,
  isTranslationMode,
  baseValue,
  fieldKey,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
  placeholder?: string;
  isTranslationMode?: boolean;
  baseValue?: string;
  fieldKey?: string;
}) {
  const isNonTranslatable = isTranslationMode && fieldKey ? NON_TRANSLATABLE_KEYS.has(fieldKey) : false;
  const [unlocked, setUnlocked] = useState(false);
  const showLock = isNonTranslatable && !unlocked;

  const cls = [
    "w-full rounded-md border px-2.5 py-1.5 text-xs outline-none placeholder:text-[var(--adm-text-placeholder)] focus:border-[var(--adm-accent)]",
    showLock
      ? "border-[var(--adm-border-50)] bg-[var(--adm-bg-50)] text-[var(--adm-text-secondary)]"
      : "border-[var(--adm-border)] bg-[var(--adm-bg)] text-[var(--adm-text)]",
  ].join(" ");

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <label className="text-[10px] font-medium text-[var(--adm-text-muted)]">{label}</label>
        {isNonTranslatable && (
          <button
            onClick={() => setUnlocked(!unlocked)}
            className="flex items-center gap-0.5 text-[9px] text-[var(--adm-text-secondary)] transition-colors hover:text-[var(--adm-text-muted)]"
            title={unlocked ? "Lock field (not typically translated)" : "Unlock to edit translation"}
          >
            <Lock className="h-2.5 w-2.5" />
            {!unlocked && <span>locked</span>}
          </button>
        )}
      </div>
      {isTranslationMode && baseValue && baseValue !== value && (
        <div className="rounded border border-[var(--adm-border-30)] bg-[var(--adm-accent-bg-30)] px-2 py-1 text-[10px] leading-relaxed text-[var(--adm-text-muted)]">
          {baseValue}
        </div>
      )}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          className={cls}
          placeholder={placeholder}
          readOnly={showLock}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cls}
          placeholder={placeholder}
          readOnly={showLock}
        />
      )}
    </div>
  );
}

/** Translation-aware string list editor */
export function ListEditor({
  label,
  items,
  onChange,
  isTranslationMode,
  baseItems,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  isTranslationMode?: boolean;
  baseItems?: string[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-medium text-[var(--adm-text-muted)]">{label}</label>
      {items.map((item, i) => (
        <div key={i} className="flex flex-col gap-0.5">
          {isTranslationMode && baseItems?.[i] && baseItems[i] !== item && (
            <div className="rounded border border-[var(--adm-border-30)] bg-[var(--adm-accent-bg-30)] px-2 py-0.5 text-[10px] text-[var(--adm-text-muted)]">
              {baseItems[i]}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={item}
              onChange={(e) => {
                const next = [...items];
                next[i] = e.target.value;
                onChange(next);
              }}
              className="h-7 w-full rounded-md border border-[var(--adm-border)] bg-[var(--adm-bg)] px-2.5 text-xs text-[var(--adm-text)] outline-none focus:border-[var(--adm-accent)]"
            />
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--adm-text-secondary)] hover:bg-[var(--adm-danger-bg)] hover:text-[var(--adm-danger-text)]"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={() => onChange([...items, ""])}
        className="flex h-7 items-center gap-1 self-start rounded-md border border-dashed border-[var(--adm-border)] px-2.5 text-[10px] text-[var(--adm-text-muted)] hover:border-[var(--adm-border-hover)] hover:text-[var(--adm-text-secondary)]"
      >
        <Plus className="h-3 w-3" />
        Add item
      </button>
    </div>
  );
}
