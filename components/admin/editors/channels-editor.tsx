"use client";

import { Plus, Trash2 } from "lucide-react";
import { BLOCK_TYPES, CONTENT_BLOCK_SHAPES } from "@/lib/schema";
import { FField, type TranslationProps } from "./shared";

export function ChannelsEditor({
  data,
  onChange,
  isTranslationMode,
  baseData,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
} & TranslationProps) {
  type Ch = Record<string, string>;
  const items = (data.items as Ch[]) ?? [];
  const baseItems = (baseData.items as Ch[]) ?? [];
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
      items: [
        ...items,
        (CONTENT_BLOCK_SHAPES[BLOCK_TYPES.CHANNELS] as { items: Ch[] }).items[0],
      ],
    });
  const fields = [
    "channel",
    "allocated_budget",
    "currency",
    "objective",
    "funnel_stage",
    "primary_offer",
    "audience_segment",
    "primary_kpi",
    "status",
  ];
  return (
    <div className="flex flex-col gap-3">
      {items.map((item, i) => (
        <div
          key={i}
          className="rounded-lg border border-[var(--adm-border)] bg-[var(--adm-bg)] p-3"
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold text-[var(--adm-text-secondary)]">
              {item.channel || `Channel ${i + 1}`}
            </span>
            <button
              onClick={() => remove(i)}
              className="flex h-6 w-6 items-center justify-center rounded text-[var(--adm-text-secondary)] hover:bg-[var(--adm-danger-bg)] hover:text-[var(--adm-danger-text)]"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {fields.map((f) => (
              <FField
                key={f}
                label={f.replace(/_/g, " ")}
                value={item[f] ?? ""}
                onChange={(v) => update(i, f, v)}
                fieldKey={f}
                isTranslationMode={isTranslationMode}
                baseValue={baseItems[i]?.[f] ?? ""}
              />
            ))}
          </div>
        </div>
      ))}
      <button
        onClick={add}
        className="flex h-8 items-center gap-1 self-start rounded-md border border-dashed border-[var(--adm-border)] px-3 text-xs text-[var(--adm-text-muted)] hover:border-[var(--adm-border-hover)]"
      >
        <Plus className="h-3 w-3" /> Add Channel
      </button>
    </div>
  );
}
