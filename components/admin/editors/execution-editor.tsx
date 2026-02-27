"use client";

import { Plus, Trash2, GripVertical } from "lucide-react";
import { BLOCK_TYPES, CONTENT_BLOCK_SHAPES } from "@/lib/schema";
import { FField, type TranslationProps } from "./shared";

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const DEADLINE_OPTIONS = [
  { value: "not_set", label: "Not Set" },
  { value: "on_track", label: "On Track" },
  { value: "at_risk", label: "At Risk" },
  { value: "overdue", label: "Overdue" },
];

const PRIORITY_OPTIONS = [
  { value: "normal", label: "Normal" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-medium capitalize text-[var(--adm-text-secondary)]">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border border-[var(--adm-border)] bg-[var(--adm-surface)] px-2 text-xs text-[var(--adm-text)] outline-none focus:ring-1 focus:ring-[var(--adm-accent)]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

export function ExecutionEditor({
  data,
  onChange,
  isTranslationMode,
  baseData,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
} & TranslationProps) {
  type Item = Record<string, string>;
  const items = (data.items as Item[]) ?? [];
  const baseItems = (baseData.items as Item[]) ?? [];

  // Fields the admin can translate
  const translatableFields = ["action", "deliverable", "notes"];

  const update = (i: number, key: string, val: string) => {
    const next = [...items];
    next[i] = { ...next[i], [key]: val };
    onChange({ ...data, items: next });
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "completed": return "#10b981";
      case "in_progress": return "var(--adm-accent, #3b82f6)";
      default: return "var(--adm-text-muted)";
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => {
        const status = item.action_status || "not_started";
        return (
          <div
            key={i}
            className="rounded-lg border bg-[var(--adm-bg)] p-3"
            style={{
              borderColor: status === "completed" ? "#10b98130" : "var(--adm-border)",
              borderLeftWidth: 3,
              borderLeftColor: statusColor(status),
            }}
          >
            {/* Header row */}
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GripVertical className="h-3.5 w-3.5 cursor-grab opacity-20" />
                <span className="text-xs font-semibold text-[var(--adm-text)]">
                  {item.action || `Step ${i + 1}`}
                </span>
                {item.priority === "critical" && (
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: "#ef444420", color: "#ef4444" }}>CRITICAL</span>
                )}
                {item.priority === "high" && (
                  <span className="rounded px-1.5 py-0.5 text-[9px] font-bold" style={{ backgroundColor: "#f59e0b20", color: "#f59e0b" }}>HIGH</span>
                )}
              </div>
              <button
                onClick={() =>
                  onChange({ ...data, items: items.filter((_, j) => j !== i) })
                }
                className="flex h-6 w-6 items-center justify-center rounded text-[var(--adm-text-secondary)] hover:bg-[var(--adm-danger-bg)] hover:text-[var(--adm-danger-text)]"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>

            {/* Main action field -- full width */}
            <div className="mb-3">
              <FField
                label="Action / Step Name"
                value={item.action ?? ""}
                onChange={(v) => update(i, "action", v)}
                fieldKey="action"
                isTranslationMode={isTranslationMode}
                baseValue={baseItems[i]?.action ?? ""}
              />
            </div>

            {/* Status row: status + deadline status + priority */}
            <div className="mb-3 grid grid-cols-3 gap-2">
              <SelectField
                label="Status"
                value={item.action_status || "not_started"}
                options={STATUS_OPTIONS}
                onChange={(v) => update(i, "action_status", v)}
              />
              <SelectField
                label="Deadline Status"
                value={item.deadline_status || "not_set"}
                options={DEADLINE_OPTIONS}
                onChange={(v) => update(i, "deadline_status", v)}
              />
              <SelectField
                label="Priority"
                value={item.priority || "normal"}
                options={PRIORITY_OPTIONS}
                onChange={(v) => update(i, "priority", v)}
              />
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <FField
                label="Deadline"
                value={item.deadline ?? ""}
                onChange={(v) => update(i, "deadline", v)}
                fieldKey="deadline"
                isTranslationMode={isTranslationMode}
                baseValue={baseItems[i]?.deadline ?? ""}
              />
              <FField
                label="Deliverable"
                value={item.deliverable ?? ""}
                onChange={(v) => update(i, "deliverable", v)}
                fieldKey="deliverable"
                isTranslationMode={isTranslationMode}
                baseValue={baseItems[i]?.deliverable ?? ""}
              />
              <FField
                label="Estimated Cost"
                value={item.estimated_cost ?? ""}
                onChange={(v) => update(i, "estimated_cost", v)}
                fieldKey="estimated_cost"
                isTranslationMode={false}
                baseValue=""
              />
            </div>

            {/* Notes -- full width */}
            <div className="mt-2">
              <FField
                label="Notes"
                value={item.notes ?? ""}
                onChange={(v) => update(i, "notes", v)}
                fieldKey="notes"
                isTranslationMode={isTranslationMode}
                baseValue={baseItems[i]?.notes ?? ""}
              />
            </div>
          </div>
        );
      })}
      <button
        onClick={() => {
          const shape = (
            CONTENT_BLOCK_SHAPES[BLOCK_TYPES.EXECUTION] as { items: Item[] }
          ).items[0];
          onChange({ ...data, items: [...items, { ...shape }] });
        }}
        className="flex h-8 items-center gap-1 self-start rounded-md border border-dashed border-[var(--adm-border)] px-3 text-xs text-[var(--adm-text-muted)] hover:border-[var(--adm-border-hover)]"
      >
        <Plus className="h-3 w-3" /> Add Step
      </button>
    </div>
  );
}
