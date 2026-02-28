"use client";

import { Plus, Trash2, GripVertical, ChevronDown, Check, CreditCard, Clock, AlertTriangle, Sparkles } from "lucide-react";
import { useState } from "react";
import { BLOCK_TYPES, CONTENT_BLOCK_SHAPES } from "@/lib/schema";
import { FField, type TranslationProps } from "./shared";

/* ── Option sets ── */

const STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started", color: "var(--adm-text-muted)" },
  { value: "in_progress", label: "In Progress", color: "var(--adm-accent, #3b82f6)" },
  { value: "completed", label: "Completed", color: "#10b981" },
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

const PAYMENT_TYPE_OPTIONS = [
  { value: "", label: "No payment" },
  { value: "one_time", label: "One-time" },
];

const PAYMENT_STATUS_OPTIONS = [
  { value: "not_paid", label: "Not Paid" },
  { value: "paid", label: "Paid" },
];

const CURRENCY_OPTIONS = [
  { value: "DKK", label: "DKK" },
  { value: "EUR", label: "EUR" },
  { value: "USD", label: "USD" },
  { value: "GBP", label: "GBP" },
];

/* ── Helpers ── */

function statusColor(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.color ?? "var(--adm-text-muted)";
}

function priorityBadge(p: string) {
  if (p === "critical") return { bg: "#ef444420", color: "#ef4444", label: "CRITICAL" };
  if (p === "high") return { bg: "#f59e0b20", color: "#f59e0b", label: "HIGH" };
  return null;
}

function deadlineBadge(d: string) {
  if (d === "at_risk") return { bg: "#f59e0b15", color: "#f59e0b", label: "At Risk" };
  if (d === "overdue") return { bg: "#ef444415", color: "#ef4444", label: "Overdue" };
  if (d === "on_track") return { bg: "#10b98115", color: "#10b981", label: "On Track" };
  return null;
}

/* ── Select component ── */

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
      <label className="text-[10px] font-medium capitalize" style={{ color: "var(--adm-text-secondary)" }}>
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-md border px-2 text-xs outline-none focus:ring-1"
        style={{
          borderColor: "var(--adm-border)",
          backgroundColor: "var(--adm-surface)",
          color: "var(--adm-text)",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

/* ── Step Card ── */

function StepCard({
  item,
  index,
  baseItem,
  isTranslationMode,
  onUpdate,
  onDelete,
}: {
  item: Record<string, string>;
  index: number;
  baseItem?: Record<string, string>;
  isTranslationMode?: boolean;
  onUpdate: (key: string, val: string) => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const status = item.action_status || "not_started";
  const isPaid = (item.payment_status || "").toLowerCase() === "paid";
  const hasPrice = !!(item.price && parseFloat(item.price.replace(/[^0-9.]/g, "")) > 0);
  const paymentType = item.payment_type || "";
  const priority = priorityBadge(item.priority || "normal");
  const deadline = deadlineBadge(item.deadline_status || "not_set");

  return (
    <div
      className="overflow-hidden rounded-lg border"
      style={{
        borderColor: isPaid ? "#10b98130" : status === "in_progress" ? "color-mix(in srgb, var(--adm-accent) 30%, transparent)" : "var(--adm-border)",
        borderLeftWidth: 3,
        borderLeftColor: isPaid ? "#10b981" : statusColor(status),
        backgroundColor: "var(--adm-bg)",
      }}
    >
      {/* Collapsed header -- always visible */}
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center gap-2.5 p-3 text-left transition-colors hover:bg-[var(--adm-surface-2)]"
      >
        <GripVertical className="h-3.5 w-3.5 shrink-0 cursor-grab opacity-20" />

        {/* Status indicator */}
        {isPaid ? (
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "#10b981" }}>
            <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
          </div>
        ) : status === "completed" ? (
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "#10b981" }}>
            <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />
          </div>
        ) : status === "in_progress" ? (
          <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: "var(--adm-accent)", opacity: 0.8 }}>
            <Sparkles className="h-2.5 w-2.5 text-white" />
          </div>
        ) : (
          <div
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border"
            style={{ borderColor: "var(--adm-border)" }}
          >
            <span className="text-[9px] font-bold" style={{ color: "var(--adm-text-muted)" }}>{index + 1}</span>
          </div>
        )}

        {/* Action name + badges */}
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          <span
            className="text-xs font-semibold"
            style={{
              color: "var(--adm-text)",
              textDecoration: isPaid || status === "completed" ? "line-through" : "none",
              opacity: isPaid || status === "completed" ? 0.5 : 1,
            }}
          >
            {item.action || `Step ${index + 1}`}
          </span>
          {priority && (
            <span className="rounded px-1.5 py-0.5 text-[8px] font-bold" style={{ backgroundColor: priority.bg, color: priority.color }}>
              {priority.label}
            </span>
          )}
          {deadline && (
            <span className="rounded px-1.5 py-0.5 text-[8px] font-bold" style={{ backgroundColor: deadline.bg, color: deadline.color }}>
              {deadline.label}
            </span>
          )}
        </div>

        {/* Right side: price + payment status + chevron */}
        <div className="flex items-center gap-2">
          {hasPrice && paymentType && (
            <span
              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
              style={{
                backgroundColor: isPaid ? "#10b98115" : "var(--adm-surface-2)",
                color: isPaid ? "#10b981" : "var(--adm-text-secondary)",
              }}
            >
              {isPaid ? <Check className="h-2.5 w-2.5" /> : <CreditCard className="h-2.5 w-2.5" />}
              {item.price} {item.currency || "DKK"}
            </span>
          )}
          <ChevronDown
            className="h-3.5 w-3.5 shrink-0 transition-transform duration-200"
            style={{ color: "var(--adm-text-muted)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          />
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t px-3 pb-3 pt-3" style={{ borderColor: "var(--adm-border)" }}>
          {/* Action name -- full width */}
          <div className="mb-3">
            <FField
              label="Action / Step Name"
              value={item.action ?? ""}
              onChange={(v) => onUpdate("action", v)}
              fieldKey="action"
              isTranslationMode={isTranslationMode}
              baseValue={baseItem?.action ?? ""}
            />
          </div>

          {/* Status + Deadline Status + Priority */}
          <div className="mb-3 grid grid-cols-3 gap-2">
            <SelectField
              label="Status"
              value={status}
              options={STATUS_OPTIONS}
              onChange={(v) => onUpdate("action_status", v)}
            />
            <SelectField
              label="Deadline Status"
              value={item.deadline_status || "not_set"}
              options={DEADLINE_OPTIONS}
              onChange={(v) => onUpdate("deadline_status", v)}
            />
            <SelectField
              label="Priority"
              value={item.priority || "normal"}
              options={PRIORITY_OPTIONS}
              onChange={(v) => onUpdate("priority", v)}
            />
          </div>

          {/* Deadline + Deliverable */}
          <div className="mb-3 grid grid-cols-2 gap-2">
            <FField
              label="Deadline"
              value={item.deadline ?? ""}
              onChange={(v) => onUpdate("deadline", v)}
              fieldKey="deadline"
              isTranslationMode={isTranslationMode}
              baseValue={baseItem?.deadline ?? ""}
            />
            <FField
              label="Deliverable"
              value={item.deliverable ?? ""}
              onChange={(v) => onUpdate("deliverable", v)}
              fieldKey="deliverable"
              isTranslationMode={isTranslationMode}
              baseValue={baseItem?.deliverable ?? ""}
            />
          </div>

          {/* Payment section */}
          <div
            className="mb-3 rounded-md border p-2.5"
            style={{
              borderColor: hasPrice && paymentType ? (isPaid ? "#10b98130" : "color-mix(in srgb, var(--adm-accent) 20%, transparent)") : "var(--adm-border)",
              backgroundColor: hasPrice && paymentType ? (isPaid ? "#10b98105" : "var(--adm-surface)") : "transparent",
            }}
          >
            <div className="mb-2 flex items-center gap-1.5">
              <CreditCard className="h-3 w-3" style={{ color: "var(--adm-text-muted)" }} />
              <span className="text-[10px] font-semibold" style={{ color: "var(--adm-text-secondary)" }}>Payment</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <SelectField
                label="Payment Type"
                value={paymentType}
                options={PAYMENT_TYPE_OPTIONS}
                onChange={(v) => onUpdate("payment_type", v)}
              />
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-medium capitalize" style={{ color: "var(--adm-text-secondary)" }}>
                  Price
                </label>
                <input
                  type="text"
                  value={item.price ?? ""}
                  onChange={(e) => onUpdate("price", e.target.value)}
                  placeholder="e.g. 5000"
                  disabled={!paymentType}
                  className="h-8 rounded-md border px-2 text-xs outline-none disabled:opacity-30"
                  style={{
                    borderColor: "var(--adm-border)",
                    backgroundColor: "var(--adm-surface)",
                    color: "var(--adm-text)",
                  }}
                />
              </div>
              <SelectField
                label="Currency"
                value={item.currency || "DKK"}
                options={CURRENCY_OPTIONS}
                onChange={(v) => onUpdate("currency", v)}
              />
              <SelectField
                label="Payment Status"
                value={item.payment_status || "not_paid"}
                options={PAYMENT_STATUS_OPTIONS}
                onChange={(v) => onUpdate("payment_status", v)}
              />
            </div>
            {isPaid && item.paid_at && (
              <p className="mt-1.5 flex items-center gap-1 text-[10px]" style={{ color: "#10b981" }}>
                <Clock className="h-2.5 w-2.5" /> Paid {new Date(item.paid_at).toLocaleDateString()}
              </p>
            )}
          </div>

          {/* Notes */}
          <FField
            label="Notes"
            value={item.notes ?? ""}
            onChange={(v) => onUpdate("notes", v)}
            fieldKey="notes"
            isTranslationMode={isTranslationMode}
            baseValue={baseItem?.notes ?? ""}
          />

          {/* Delete */}
          <div className="mt-3 flex justify-end">
            <button
              onClick={onDelete}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-medium transition-colors"
              style={{ color: "var(--adm-danger-text)" }}
            >
              <Trash2 className="h-3 w-3" /> Remove step
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Editor ── */

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
  const baseItems = ((baseData ?? {}).items as Item[]) ?? [];

  const update = (i: number, key: string, val: string) => {
    const next = [...items];
    next[i] = { ...next[i], [key]: val };
    onChange({ ...data, items: next });
  };

  // Summary stats
  const total = items.length;
  const completed = items.filter((i) => (i.payment_status || "").toLowerCase() === "paid" || i.action_status === "completed").length;
  const withPrice = items.filter((i) => i.payment_type && parseFloat((i.price || "0").replace(/[^0-9.]/g, "")) > 0);
  const paidCount = withPrice.filter((i) => (i.payment_status || "").toLowerCase() === "paid").length;
  const totalRevenue = withPrice.reduce((s, i) => s + parseFloat((i.price || "0").replace(/[^0-9.]/g, "")), 0);
  const paidRevenue = withPrice.filter((i) => (i.payment_status || "").toLowerCase() === "paid").reduce((s, i) => s + parseFloat((i.price || "0").replace(/[^0-9.]/g, "")), 0);
  const currency = items.find((i) => i.currency)?.currency || "DKK";

  return (
    <div className="flex flex-col gap-4">
      {/* Summary bar */}
      {total > 0 && (
        <div
          className="flex flex-wrap items-center gap-4 rounded-lg border p-3"
          style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
        >
          <div className="flex items-center gap-1.5">
            <div
              className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white"
              style={{ backgroundColor: completed === total && total > 0 ? "#10b981" : "var(--adm-accent)" }}
            >
              {completed}
            </div>
            <span className="text-[11px]" style={{ color: "var(--adm-text-secondary)" }}>
              of {total} steps done
            </span>
          </div>
          {withPrice.length > 0 && (
            <>
              <div className="h-4 w-px" style={{ backgroundColor: "var(--adm-border)" }} />
              <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--adm-text-secondary)" }}>
                <CreditCard className="h-3 w-3" />
                {paidCount}/{withPrice.length} paid
              </span>
              <div className="h-4 w-px" style={{ backgroundColor: "var(--adm-border)" }} />
              <span className="text-[11px] font-medium" style={{ color: paidRevenue >= totalRevenue ? "#10b981" : "var(--adm-text)" }}>
                {paidRevenue.toLocaleString()} / {totalRevenue.toLocaleString()} {currency}
              </span>
            </>
          )}
        </div>
      )}

      {/* Step cards */}
      {items.map((item, i) => (
        <StepCard
          key={i}
          item={item}
          index={i}
          baseItem={baseItems[i]}
          isTranslationMode={isTranslationMode}
          onUpdate={(key, val) => update(i, key, val)}
          onDelete={() => onChange({ ...data, items: items.filter((_, j) => j !== i) })}
        />
      ))}

      {/* Add step button */}
      <button
        onClick={() => {
          const shape = (
            CONTENT_BLOCK_SHAPES[BLOCK_TYPES.EXECUTION] as { items: Item[] }
          ).items[0];
          onChange({ ...data, items: [...items, { ...shape }] });
        }}
        className="flex h-9 items-center gap-1.5 self-start rounded-lg border border-dashed px-4 text-xs font-medium transition-colors"
        style={{
          borderColor: "var(--adm-border)",
          color: "var(--adm-text-muted)",
        }}
      >
        <Plus className="h-3.5 w-3.5" /> Add Step
      </button>
    </div>
  );
}
