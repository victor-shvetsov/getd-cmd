"use client";

import { Plus, Trash2 } from "lucide-react";
import { FField, ListEditor, type TranslationProps } from "./shared";

/* --- BRIEF block --- */

const BRIEF_FIELD_CONFIG: Record<
  string,
  { label: string; type: "text" | "textarea" | "list" }
> = {
  company_name: { label: "Company Name", type: "text" },
  short_brief: { label: "Short Brief", type: "textarea" },
  services: { label: "Services", type: "list" },
  location: { label: "Location", type: "text" },
  pains: { label: "Pain Points", type: "list" },
  search_methods: { label: "Search Methods", type: "list" },
  timeframe: { label: "Timeframe", type: "text" },
  age_group: { label: "Age Group", type: "text" },
  habitant_location: { label: "Target Location", type: "text" },
};

export function BriefFieldsEditor({
  data,
  onChange,
  fields,
  isTranslationMode,
  baseData,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
  fields: string[];
} & TranslationProps) {
  const set = (key: string, val: unknown) => onChange({ ...data, [key]: val });
  const fieldsToRender = fields.filter((f) => f in BRIEF_FIELD_CONFIG);
  return (
    <div className="flex flex-col gap-4">
      {fieldsToRender.map((fieldKey) => {
        const config = BRIEF_FIELD_CONFIG[fieldKey];
        if (config.type === "list") {
          return (
            <ListEditor
              key={fieldKey}
              label={config.label}
              items={(data[fieldKey] as string[]) ?? []}
              onChange={(v) => set(fieldKey, v)}
              isTranslationMode={isTranslationMode}
              baseItems={(baseData[fieldKey] as string[]) ?? []}
            />
          );
        }
        return (
          <FField
            key={fieldKey}
            label={config.label}
            value={(data[fieldKey] as string) ?? ""}
            onChange={(v) => set(fieldKey, v)}
            multiline={config.type === "textarea"}
            isTranslationMode={isTranslationMode}
            baseValue={(baseData[fieldKey] as string) ?? ""}
            fieldKey={fieldKey}
          />
        );
      })}
    </div>
  );
}

/* --- KPI CARDS block --- */

export function KpiCardsEditor({
  data,
  onChange,
  isTranslationMode,
  baseData,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
} & TranslationProps) {
  const items =
    (data.items as { label: string; value: string; target: string; note: string }[]) ?? [];
  const baseItems =
    (baseData.items as { label: string; value: string; target: string; note: string }[]) ?? [];
  const update = (i: number, key: string, val: string) => {
    const next = [...items];
    next[i] = { ...next[i], [key]: val };
    onChange({ ...data, items: next });
  };
  const remove = (i: number) =>
    onChange({ ...data, items: items.filter((_, j) => j !== i) });
  const add = () =>
    onChange({
      ...data,
      items: [...items, { label: "", value: "", target: "", note: "" }],
    });
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="grid grid-cols-2 gap-2 rounded-lg border border-[var(--adm-border)] bg-[var(--adm-bg)] p-3 sm:grid-cols-4"
        >
          <FField label="Label" value={item.label} onChange={(v) => update(i, "label", v)} fieldKey="label" isTranslationMode={isTranslationMode} baseValue={baseItems[i]?.label} />
          <FField label="Value" value={item.value} onChange={(v) => update(i, "value", v)} fieldKey="value" isTranslationMode={isTranslationMode} baseValue={baseItems[i]?.value} />
          <FField label="Target" value={item.target} onChange={(v) => update(i, "target", v)} fieldKey="target" isTranslationMode={isTranslationMode} baseValue={baseItems[i]?.target} />
          <div className="flex items-end gap-1.5">
            <div className="flex-1">
              <FField label="Note" value={item.note} onChange={(v) => update(i, "note", v)} fieldKey="note" isTranslationMode={isTranslationMode} baseValue={baseItems[i]?.note} />
            </div>
            <button
              onClick={() => remove(i)}
              className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--adm-text-secondary)] hover:bg-[var(--adm-danger-bg)] hover:text-[var(--adm-danger-text)]"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      ))}
      <button
        onClick={add}
        className="flex h-8 items-center gap-1 self-start rounded-md border border-dashed border-[var(--adm-border)] px-3 text-xs text-[var(--adm-text-muted)] hover:border-[var(--adm-border-hover)]"
      >
        <Plus className="h-3 w-3" /> Add KPI
      </button>
    </div>
  );
}

/* --- FLOW block (rich funnel stages) --- */

export function FlowEditor({
  data,
  onChange,
  isTranslationMode,
  baseData,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
} & TranslationProps) {
  type Stage = { name: string; description: string; user_action: string; business_action: string; drop_off: string };
  const stages = (data.stages as Stage[]) ?? [];
  const baseStages = (baseData.stages as Stage[]) ?? [];

  const update = (idx: number, field: keyof Stage, val: string) => {
    const next = [...stages];
    next[idx] = { ...next[idx], [field]: val };
    onChange({ ...data, stages: next });
  };

  const add = () => {
    onChange({
      ...data,
      stages: [...stages, { name: "", description: "", user_action: "", business_action: "", drop_off: "" }],
    });
  };

  const remove = (idx: number) => {
    onChange({ ...data, stages: stages.filter((_, i) => i !== idx) });
  };

  const move = (idx: number, dir: -1 | 1) => {
    const next = [...stages];
    const target = idx + dir;
    if (target < 0 || target >= next.length) return;
    [next[idx], next[target]] = [next[target], next[idx]];
    onChange({ ...data, stages: next });
  };

  const fields: { key: keyof Stage; label: string; placeholder: string }[] = [
    { key: "name", label: "Stage Name", placeholder: "e.g. Awareness" },
    { key: "description", label: "Description", placeholder: "What happens at this stage" },
    { key: "user_action", label: "User Does", placeholder: "What the user does" },
    { key: "business_action", label: "You Do", placeholder: "What the business does to convert" },
    { key: "drop_off", label: "Drop-off Risk", placeholder: "Why people leave at this stage" },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[var(--adm-text-secondary)]">Funnel Stages ({stages.length})</span>
        <button onClick={add} className="rounded-md bg-[var(--adm-accent)] px-2 py-1 text-[10px] font-medium text-white hover:bg-[var(--adm-accent-hover)]">
          + Add Stage
        </button>
      </div>
      {stages.map((stage, i) => (
        <div key={i} className="rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] font-bold text-[var(--adm-accent-text)]">Stage {i + 1}</span>
            <div className="flex gap-1">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="rounded px-1.5 py-0.5 text-[10px] text-[var(--adm-text-muted)] hover:bg-[var(--adm-border)] disabled:opacity-30">Up</button>
              <button onClick={() => move(i, 1)} disabled={i === stages.length - 1} className="rounded px-1.5 py-0.5 text-[10px] text-[var(--adm-text-muted)] hover:bg-[var(--adm-border)] disabled:opacity-30">Down</button>
              <button onClick={() => remove(i)} className="rounded px-1.5 py-0.5 text-[10px] text-[var(--adm-danger-text)] hover:bg-[var(--adm-danger-bg)]">Remove</button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {fields.map((f) => (
              <div key={f.key} className="flex flex-col gap-0.5">
                <label className="text-[10px] text-[var(--adm-text-muted)]">{f.label}</label>
                {isTranslationMode && baseStages[i]?.[f.key] && baseStages[i][f.key] !== stage[f.key] && (
                  <div className="rounded border border-[var(--adm-border-30)] bg-[var(--adm-accent-bg-30)] px-2 py-0.5 text-[10px] text-[var(--adm-text-muted)]">
                    {baseStages[i][f.key]}
                  </div>
                )}
                {f.key === "name" ? (
                  <input
                    type="text"
                    value={stage[f.key] ?? ""}
                    onChange={(e) => update(i, f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="h-7 rounded border border-[var(--adm-border)] bg-[var(--adm-surface)] px-2 text-[11px] text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-text-placeholder)] focus:border-[var(--adm-accent)]"
                  />
                ) : (
                  <textarea
                    value={stage[f.key] ?? ""}
                    onChange={(e) => update(i, f.key, e.target.value)}
                    placeholder={f.placeholder}
                    rows={2}
                    className="resize-none rounded border border-[var(--adm-border)] bg-[var(--adm-surface)] px-2 py-1 text-[11px] text-[var(--adm-text)] outline-none placeholder:text-[var(--adm-text-placeholder)] focus:border-[var(--adm-accent)]"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
