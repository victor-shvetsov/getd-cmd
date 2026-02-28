"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import {
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Search,
  BarChart3,
  Globe,
  Zap,
  Layers,
  ChevronDown,
  ChevronUp,
  Pencil,
  X,
  Check,
  Loader2,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ActivityEntry {
  id: string;
  client_id: string;
  title: string;
  description: string | null;
  category: string | null;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

interface Props {
  clientId: string;
  token: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const CATEGORIES = [
  { value: "seo",        label: "SEO",        icon: Search },
  { value: "ads",        label: "Ads",        icon: BarChart3 },
  { value: "website",    label: "Website",    icon: Globe },
  { value: "automation", label: "Automation", icon: Zap },
  { value: "general",    label: "General",    icon: Layers },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map((c) => [c.value, c]));

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function groupByMonth(entries: ActivityEntry[]) {
  const groups: Record<string, ActivityEntry[]> = {};
  for (const e of entries) {
    const d = new Date(e.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  }
  return Object.entries(groups)
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([month, items]) => ({
      month,
      label: new Date(items[0].created_at).toLocaleString("en", { month: "long", year: "numeric" }),
      items,
    }));
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" });
}

/* ------------------------------------------------------------------ */
/*  Inline Add Form                                                    */
/* ------------------------------------------------------------------ */

function AddEntryForm({ clientId, onAdded }: { clientId: string; onAdded: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("general");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const reset = () => { setTitle(""); setDescription(""); setCategory("general"); setDate(new Date().toISOString().slice(0, 10)); };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/activity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_id: clientId,
          title: title.trim(),
          description: description.trim() || null,
          category,
          is_visible: true,
          created_at: new Date(date + "T12:00:00Z").toISOString(),
        }),
      });
      reset();
      setOpen(false);
      onAdded();
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors"
        style={{ backgroundColor: "var(--adm-accent)", color: "#fff" }}
      >
        <Plus className="h-3.5 w-3.5" /> Add Entry
      </button>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-4"
      style={{ borderColor: "var(--adm-accent)", backgroundColor: "var(--adm-surface)" }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold" style={{ color: "var(--adm-text)" }}>New Activity Entry</span>
        <button onClick={() => { setOpen(false); reset(); }} className="opacity-40 hover:opacity-80">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Title */}
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What did you do?"
        className="rounded-lg border px-3 py-2 text-xs outline-none"
        style={{
          borderColor: "var(--adm-border)",
          backgroundColor: "var(--adm-surface-2)",
          color: "var(--adm-text)",
        }}
      />

      {/* Description */}
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="More details (optional)"
        rows={2}
        className="rounded-lg border px-3 py-2 text-xs outline-none resize-none"
        style={{
          borderColor: "var(--adm-border)",
          backgroundColor: "var(--adm-surface-2)",
          color: "var(--adm-text)",
        }}
      />

      {/* Category + Date row */}
      <div className="flex gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="flex-1 rounded-lg border px-2 py-2 text-xs outline-none"
          style={{
            borderColor: "var(--adm-border)",
            backgroundColor: "var(--adm-surface-2)",
            color: "var(--adm-text)",
          }}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="flex-1 rounded-lg border px-2 py-2 text-xs outline-none"
          style={{
            borderColor: "var(--adm-border)",
            backgroundColor: "var(--adm-surface-2)",
            color: "var(--adm-text)",
          }}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={saving || !title.trim()}
        className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50"
        style={{ backgroundColor: "var(--adm-accent)" }}
      >
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        {saving ? "Adding..." : "Add Entry"}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Entry Row                                                          */
/* ------------------------------------------------------------------ */

function EntryRow({
  entry,
  onUpdate,
  onDelete,
}: {
  entry: ActivityEntry;
  onUpdate: (id: string, data: Partial<ActivityEntry>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(entry.title);
  const [description, setDescription] = useState(entry.description ?? "");
  const [category, setCategory] = useState(entry.category ?? "general");
  const [date, setDate] = useState(entry.created_at.slice(0, 10));
  const [busy, setBusy] = useState(false);

  const cat = CAT_MAP[entry.category ?? "general"] ?? CAT_MAP.general;
  const Icon = cat.icon;

  const handleSave = async () => {
    setBusy(true);
    const updates: Partial<ActivityEntry> = {
      title: title.trim(),
      description: description.trim() || null,
      category,
    };
    if (date !== entry.created_at.slice(0, 10)) {
      updates.created_at = new Date(date + "T12:00:00Z").toISOString();
    }
    await onUpdate(entry.id, updates);
    setBusy(false);
    setEditing(false);
  };

  const handleToggleVisible = async () => {
    setBusy(true);
    await onUpdate(entry.id, { is_visible: !entry.is_visible });
    setBusy(false);
  };

  const handleDelete = async () => {
    setBusy(true);
    await onDelete(entry.id);
    setBusy(false);
  };

  if (editing) {
    return (
      <div
        className="flex flex-col gap-2 rounded-lg border p-3"
        style={{ borderColor: "var(--adm-accent)", backgroundColor: "var(--adm-surface)" }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-md border px-2 py-1.5 text-xs outline-none"
          style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="rounded-md border px-2 py-1.5 text-xs outline-none resize-none"
          style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
        />
        <div className="flex gap-2">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 rounded-md border px-2 py-1.5 text-xs outline-none"
            style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border px-2 py-1.5 text-xs outline-none"
            style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text)" }}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={busy || !title.trim()}
            className="flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
            style={{ backgroundColor: "var(--adm-accent)" }}
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
          </button>
          <button
            onClick={() => { setEditing(false); setTitle(entry.title); setDescription(entry.description ?? ""); setCategory(entry.category ?? "general"); setDate(entry.created_at.slice(0, 10)); }}
            className="flex items-center gap-1 rounded-md border px-2.5 py-1 text-[11px]"
            style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-secondary)" }}
          >
            <X className="h-3 w-3" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[var(--adm-surface-2)]"
      style={{ opacity: entry.is_visible ? 1 : 0.45 }}
    >
      {/* Icon */}
      <div
        className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: "var(--adm-surface-2)" }}
      >
        <Icon className="h-3.5 w-3.5" style={{ color: "var(--adm-text-muted)" }} />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs font-semibold" style={{ color: "var(--adm-text)" }}>{entry.title}</span>
        {entry.description && (
          <span className="text-[11px] leading-relaxed" style={{ color: "var(--adm-text-secondary)" }}>{entry.description}</span>
        )}
        <div className="flex items-center gap-2 mt-0.5">
          <span className="rounded-md px-1.5 py-0.5 text-[10px] font-medium" style={{ backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text-muted)" }}>
            {cat.label}
          </span>
          <span className="text-[10px]" style={{ color: "var(--adm-text-secondary)" }}>{fmtDate(entry.created_at)}</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button onClick={() => setEditing(true)} className="rounded-md p-1 transition-colors hover:bg-[var(--adm-surface-2)]">
          <Pencil className="h-3 w-3" style={{ color: "var(--adm-text-secondary)" }} />
        </button>
        <button onClick={handleToggleVisible} disabled={busy} className="rounded-md p-1 transition-colors hover:bg-[var(--adm-surface-2)]">
          {entry.is_visible ? <Eye className="h-3 w-3" style={{ color: "var(--adm-text-secondary)" }} /> : <EyeOff className="h-3 w-3" style={{ color: "var(--adm-text-secondary)" }} />}
        </button>
        <button onClick={handleDelete} disabled={busy} className="rounded-md p-1 transition-colors hover:bg-[#ef44441a]">
          <Trash2 className="h-3 w-3 text-red-400" />
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function ActivityEditor({ clientId, token }: Props) {
  const fetcher = useCallback(
    (url: string) => fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    [token],
  );

  const { data, mutate, isLoading } = useSWR(
    `/api/activity?clientId=${clientId}&all=1`,
    fetcher,
  );

  const entries: ActivityEntry[] = data?.entries ?? [];
  const grouped = groupByMonth(entries);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const handleUpdate = async (id: string, updates: Partial<ActivityEntry>) => {
    await fetch("/api/activity", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...updates }),
    });
    mutate();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/activity?id=${id}`, { method: "DELETE" });
    mutate();
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--adm-text)" }}>Activity Log</h3>
          <p className="text-[11px]" style={{ color: "var(--adm-text-secondary)" }}>
            What you did for the client. Each entry shows on their Activity tab.
          </p>
        </div>
        <AddEntryForm clientId={clientId} onAdded={() => mutate()} />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--adm-text-muted)" }} />
        </div>
      )}

      {/* Empty */}
      {!isLoading && entries.length === 0 && (
        <div
          className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12"
          style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-secondary)" }}
        >
          <Layers className="h-8 w-8 opacity-30" />
          <p className="text-xs">No activity entries yet</p>
          <p className="text-[11px] opacity-60">Add your first entry to show the client what you have been working on</p>
        </div>
      )}

      {/* Grouped entries */}
      {grouped.map(({ month, label, items }) => {
        const isCollapsed = collapsed[month];
        const visibleCount = items.filter((e) => e.is_visible).length;
        const hiddenCount = items.length - visibleCount;

        return (
          <div key={month} className="flex flex-col">
            {/* Month header */}
            <button
              onClick={() => setCollapsed((p) => ({ ...p, [month]: !p[month] }))}
              className="flex items-center gap-2 pb-2"
            >
              <span className="text-[11px] font-bold" style={{ color: "var(--adm-text-muted)" }}>{label}</span>
              <span className="text-[10px] tabular-nums" style={{ color: "var(--adm-text-secondary)" }}>
                {visibleCount} visible{hiddenCount > 0 && `, ${hiddenCount} hidden`}
              </span>
              <div className="h-px flex-1" style={{ backgroundColor: "var(--adm-border)" }} />
              {isCollapsed ? <ChevronDown className="h-3 w-3 opacity-40" /> : <ChevronUp className="h-3 w-3 opacity-40" />}
            </button>

            {!isCollapsed && (
              <div className="flex flex-col gap-0.5">
                {items.map((entry) => (
                  <EntryRow key={entry.id} entry={entry} onUpdate={handleUpdate} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
