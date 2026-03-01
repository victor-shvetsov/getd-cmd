"use client";

import { useCallback, useRef, useState } from "react";
import useSWR from "swr";
import {
  Upload,
  FileText,
  MessageSquare,
  Mic,
  Trash2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
  Check,
  Loader2,
  Send,
  Paperclip,
  X,
  Target,
  CircleDot,
  HelpCircle,
  Wand2,
  Brain,
  Mail,
  ArrowUpRight,
  ArrowDownLeft,
} from "lucide-react";
import { AutoFillPreview } from "@/components/admin/autofill-preview";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface KnowledgeEntry {
  id: string;
  client_id: string;
  source_type: string;
  source_label: string;
  raw_content: string;
  file_url: string | null;
  extracted_facts: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
}

interface GapAnalysis {
  overall_readiness: number;
  tabs: Array<{
    tab: string;
    readiness: number;
    status: "ready" | "partial" | "empty";
    missing: string[];
    questions: string[];
  }>;
  priority_questions: string[];
  next_call_agenda: string;
}

interface KnowledgeBankProps {
  clientId: string;
  token: string;
}

const SOURCE_TYPES = [
  { key: "note", label: "Note", icon: FileText },
  { key: "transcript", label: "Transcript", icon: Mic },
  { key: "chat", label: "Chat log", icon: MessageSquare },
  { key: "document", label: "Document", icon: FileText },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function KnowledgeBank({ clientId, token }: KnowledgeBankProps) {
  const authFetcher = useCallback(
    (url: string) =>
      fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) =>
        r.json()
      ),
    [token]
  );

  const {
    data: entries,
    mutate,
    isLoading,
  } = useSWR<KnowledgeEntry[]>(
    `/api/admin/clients/${clientId}/knowledge`,
    authFetcher
  );

  /* Gap analysis */
  const [gaps, setGaps] = useState<GapAnalysis | null>(null);
  const [gapsLoading, setGapsLoading] = useState(false);
  const [showGaps, setShowGaps] = useState(false);

  const handleAnalyzeGaps = useCallback(async () => {
    setGapsLoading(true);
    setShowGaps(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/knowledge/gaps`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setGaps(data);
      }
    } finally {
      setGapsLoading(false);
    }
  }, [clientId, token]);

  /* Batch auto-fill */
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchResults, setBatchResults] = useState<Record<string, { suggested: Record<string, unknown>; existing: Record<string, unknown>; hasExisting: boolean }> | null>(null);

  const handleBatchAutoFill = useCallback(async () => {
    setBatchLoading(true);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/knowledge/autofill-all`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ onlyEmpty: false }),
      });
      if (res.ok) {
        const data = await res.json();
        setBatchResults(data.results);
      }
    } finally {
      setBatchLoading(false);
    }
  }, [clientId, token]);

  /* Input state */
  const [inputText, setInputText] = useState("");
  const [sourceType, setSourceType] = useState("note");
  const [sourceLabel, setSourceLabel] = useState("");
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* Submit handler */
  const handleSubmit = useCallback(async () => {
    const content = inputText.trim();
    if (!content && !file) return;

    setUploading(true);
    try {
      let fileUrl: string | null = null;

      // Upload file to Blob if present
      if (file) {
        const formData = new FormData();
        formData.append("file", file);
        const uploadRes = await fetch("/api/admin/knowledge/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          fileUrl = uploadData.url;
        }
      }

      // Create entry
      const res = await fetch(`/api/admin/clients/${clientId}/knowledge`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          source_type: sourceType,
          source_label: sourceLabel || SOURCE_TYPES.find((s) => s.key === sourceType)?.label || sourceType,
          raw_content: content,
          file_url: fileUrl,
        }),
      });

      if (res.ok) {
        const entry = await res.json();
        // Auto-trigger extraction
        fetch(`/api/admin/clients/${clientId}/knowledge/extract`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ entryId: entry.id }),
        }).then(() => mutate());

        setInputText("");
        setSourceLabel("");
        setFile(null);
        await mutate();
      }
    } finally {
      setUploading(false);
    }
  }, [inputText, file, sourceType, sourceLabel, clientId, token, mutate]);

  /* Delete handler */
  const handleDelete = useCallback(
    async (entryId: string) => {
      await fetch(`/api/admin/clients/${clientId}/knowledge/${entryId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      mutate();
    },
    [clientId, token, mutate]
  );

  /* Re-extract handler */
  const handleReExtract = useCallback(
    async (entryId: string) => {
      // Optimistic UI update
      mutate(
        (prev) =>
          prev?.map((e) =>
            e.id === entryId ? { ...e, status: "processing" } : e
          ),
        false
      );
      await fetch(`/api/admin/clients/${clientId}/knowledge/extract`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ entryId }),
      });
      mutate();
    },
    [clientId, token, mutate]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const totalFacts = (entries ?? []).reduce((acc, e) => {
    if (e.status !== "done" || !e.extracted_facts) return acc;
    return acc + Object.keys(e.extracted_facts).length;
  }, 0);

  return (
    <div className="flex flex-col gap-6">
      {/* Stats bar */}
      <div
        className="flex items-center gap-4 rounded-xl border px-4 py-3"
        style={{
          borderColor: "var(--adm-border)",
          backgroundColor: "var(--adm-surface)",
        }}
      >
        <div className="flex flex-col">
          <span className="text-lg font-semibold" style={{ color: "var(--adm-text)" }}>
            {entries?.length ?? 0}
          </span>
          <span className="text-[11px]" style={{ color: "var(--adm-text-muted)" }}>
            Entries
          </span>
        </div>
        <div
          className="h-8 w-px"
          style={{ backgroundColor: "var(--adm-border)" }}
        />
        <div className="flex flex-col">
          <span className="text-lg font-semibold" style={{ color: "var(--adm-text)" }}>
            {totalFacts}
          </span>
          <span className="text-[11px]" style={{ color: "var(--adm-text-muted)" }}>
            Fact groups extracted
          </span>
        </div>
        <div
          className="h-8 w-px"
          style={{ backgroundColor: "var(--adm-border)" }}
        />
        <div className="flex flex-col">
          <span className="text-lg font-semibold" style={{ color: "var(--adm-accent-text)" }}>
            {(entries ?? []).filter((e) => e.status === "done").length}
          </span>
          <span className="text-[11px]" style={{ color: "var(--adm-text-muted)" }}>
            Processed
          </span>
        </div>
        <div className="flex-1" />
        <button
          onClick={handleAnalyzeGaps}
          disabled={gapsLoading}
          className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors disabled:opacity-50"
          style={{
            borderColor: "color-mix(in srgb, var(--adm-accent) 30%, transparent)",
            color: "var(--adm-accent-text)",
            backgroundColor: "var(--adm-accent-10)",
          }}
        >
          {gapsLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Target className="h-3.5 w-3.5" />
          )}
          {gapsLoading ? "Analyzing..." : "What to ask next"}
        </button>
        <button
          onClick={handleBatchAutoFill}
          disabled={batchLoading || (entries ?? []).filter((e) => e.status === "done").length === 0}
          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: "var(--adm-accent)" }}
        >
          {batchLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wand2 className="h-3.5 w-3.5" />
          )}
          {batchLoading ? "Generating..." : "Generate Full Dashboard"}
        </button>
      </div>

      {/* Gap Analysis Panel */}
      {showGaps && (
        <GapAnalysisPanel
          gaps={gaps}
          loading={gapsLoading}
          onClose={() => setShowGaps(false)}
        />
      )}

      {/* Input area — ChatGPT-style */}
      <div
        className="rounded-xl border"
        style={{
          borderColor: "var(--adm-border)",
          backgroundColor: "var(--adm-surface)",
        }}
      >
        {/* Source type chips */}
        <div
          className="flex items-center gap-1.5 border-b px-3 py-2"
          style={{ borderColor: "var(--adm-border)" }}
        >
          {SOURCE_TYPES.map((s) => {
            const Icon = s.icon;
            const isActive = sourceType === s.key;
            return (
              <button
                key={s.key}
                onClick={() => setSourceType(s.key)}
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors"
                style={{
                  backgroundColor: isActive
                    ? "var(--adm-accent-bg)"
                    : "transparent",
                  color: isActive
                    ? "var(--adm-accent-text)"
                    : "var(--adm-text-muted)",
                }}
              >
                <Icon className="h-3 w-3" />
                {s.label}
              </button>
            );
          })}
          <div className="flex-1" />
          <input
            type="text"
            placeholder="Label (optional)"
            value={sourceLabel}
            onChange={(e) => setSourceLabel(e.target.value)}
            className="w-32 rounded-md border-none bg-transparent px-2 py-1 text-[11px] outline-none"
            style={{
              color: "var(--adm-text)",
            }}
          />
        </div>

        {/* Textarea */}
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Paste a call transcript, meeting notes, chat log, or just type what you learned about this client..."
            rows={4}
            className="w-full resize-none border-none bg-transparent px-4 py-3 text-sm outline-none"
            style={{
              color: "var(--adm-text)",
            }}
          />
        </div>

        {/* File attachment preview */}
        {file && (
          <div
            className="mx-3 mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs"
            style={{
              backgroundColor: "var(--adm-surface-2)",
              color: "var(--adm-text-secondary)",
            }}
          >
            <Paperclip className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{file.name}</span>
            <button
              onClick={() => setFile(null)}
              className="ml-auto flex-shrink-0"
              style={{ color: "var(--adm-text-muted)" }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Bottom bar */}
        <div
          className="flex items-center justify-between border-t px-3 py-2"
          style={{ borderColor: "var(--adm-border)" }}
        >
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".txt,.pdf,.doc,.docx,.md,.csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
                e.target.value = "";
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex h-7 items-center gap-1.5 rounded-lg px-2 text-[11px] transition-colors"
              style={{ color: "var(--adm-text-muted)" }}
              title="Attach file"
            >
              <Upload className="h-3.5 w-3.5" />
              Attach
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px]" style={{ color: "var(--adm-text-placeholder)" }}>
              {"\u2318"}+Enter to send
            </span>
            <button
              onClick={handleSubmit}
              disabled={uploading || (!inputText.trim() && !file)}
              className="flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-xs font-medium text-white transition-colors disabled:opacity-40"
              style={{ backgroundColor: "var(--adm-accent)" }}
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
              Add to Bank
            </button>
          </div>
        </div>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2
            className="h-5 w-5 animate-spin"
            style={{ color: "var(--adm-accent)" }}
          />
        </div>
      ) : !entries?.length ? (
        <div
          className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-12"
          style={{
            borderColor: "var(--adm-border)",
            color: "var(--adm-text-muted)",
          }}
        >
          <FileText className="h-8 w-8 opacity-40" />
          <p className="text-sm font-medium">No knowledge yet</p>
          <p className="text-xs opacity-60">
            Add call transcripts, notes, or chat logs above
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onDelete={handleDelete}
              onReExtract={handleReExtract}
            />
          ))}
        </div>
      )}

      {/* Batch auto-fill preview overlay */}
      {batchResults && (
        <AutoFillPreview
          results={batchResults}
          clientId={clientId}
          token={token}
          onClose={() => setBatchResults(null)}
          onSaved={() => {
            setBatchResults(null);
          }}
        />
      )}

      {/* AI Voice Training */}
      <AIVoiceTraining clientId={clientId} token={token} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Entry Card                                                         */
/* ------------------------------------------------------------------ */

function EntryCard({
  entry,
  onDelete,
  onReExtract,
}: {
  entry: KnowledgeEntry;
  onDelete: (id: string) => void;
  onReExtract: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const sourceIcon = SOURCE_TYPES.find((s) => s.key === entry.source_type);
  const Icon = sourceIcon?.icon ?? FileText;
  const date = new Date(entry.created_at);
  const timeAgo = getTimeAgo(date);

  const factCategories = entry.extracted_facts
    ? Object.entries(entry.extracted_facts).filter(
        ([, v]) =>
          v !== null &&
          v !== undefined &&
          (typeof v !== "object" || Object.keys(v as Record<string, unknown>).length > 0) &&
          (!Array.isArray(v) || v.length > 0)
      )
    : [];

  return (
    <div
      className="rounded-xl border transition-colors"
      style={{
        borderColor: "var(--adm-border)",
        backgroundColor: "var(--adm-surface)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: "var(--adm-accent-bg)" }}
        >
          <Icon className="h-3.5 w-3.5" style={{ color: "var(--adm-accent-text)" }} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium" style={{ color: "var(--adm-text)" }}>
              {entry.source_label || sourceIcon?.label || entry.source_type}
            </span>
            <StatusBadge status={entry.status} />
          </div>
          <span className="text-[11px]" style={{ color: "var(--adm-text-muted)" }}>
            {timeAgo}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {entry.status === "done" && factCategories.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] font-medium transition-colors"
              style={{
                color: "var(--adm-accent-text)",
                backgroundColor: expanded ? "var(--adm-accent-bg)" : "transparent",
              }}
            >
              <Sparkles className="h-3 w-3" />
              {factCategories.length} facts
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          )}
          {(entry.status === "error" || entry.status === "done") && (
            <button
              onClick={() => onReExtract(entry.id)}
              className="flex h-7 items-center gap-1 rounded-lg px-2 text-[11px] transition-colors"
              style={{ color: "var(--adm-text-muted)" }}
              title="Re-extract facts"
            >
              <Sparkles className="h-3 w-3" />
            </button>
          )}
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="flex h-7 items-center rounded-lg px-2 text-[11px] transition-colors"
            style={{ color: "var(--adm-text-muted)" }}
            title="Toggle raw content"
          >
            <FileText className="h-3 w-3" />
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="flex h-7 items-center rounded-lg px-2 text-[11px] transition-colors"
            style={{ color: "var(--adm-danger-text)" }}
            title="Delete entry"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Raw content (toggled) */}
      {showRaw && (
        <div
          className="border-t px-4 py-3"
          style={{ borderColor: "var(--adm-border)" }}
        >
          <p
            className="whitespace-pre-wrap text-xs leading-relaxed"
            style={{ color: "var(--adm-text-secondary)" }}
          >
            {entry.raw_content.length > 2000
              ? entry.raw_content.slice(0, 2000) + "..."
              : entry.raw_content}
          </p>
        </div>
      )}

      {/* Extracted facts (expanded) */}
      {expanded && factCategories.length > 0 && (
        <div
          className="border-t px-4 py-3"
          style={{ borderColor: "var(--adm-border)" }}
        >
          <div className="flex flex-col gap-3">
            {factCategories.map(([category, facts]) => (
              <FactCategory key={category} category={category} facts={facts} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Fact Category                                                      */
/* ------------------------------------------------------------------ */

function FactCategory({
  category,
  facts,
}: {
  category: string;
  facts: unknown;
}) {
  const label = category
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  if (Array.isArray(facts)) {
    if (facts.length === 0) return null;
    return (
      <div>
        <h4
          className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--adm-text-muted)" }}
        >
          {label}
        </h4>
        <div className="flex flex-wrap gap-1.5">
          {facts.map((f, i) => (
            <span
              key={i}
              className="rounded-md px-2 py-1 text-[11px]"
              style={{
                backgroundColor: "var(--adm-surface-2)",
                color: "var(--adm-text-secondary)",
              }}
            >
              {String(f)}
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (typeof facts === "object" && facts !== null) {
    const entries = Object.entries(facts as Record<string, unknown>).filter(
      ([, v]) =>
        v !== null &&
        v !== undefined &&
        v !== "" &&
        (!Array.isArray(v) || v.length > 0)
    );
    if (entries.length === 0) return null;

    return (
      <div>
        <h4
          className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--adm-text-muted)" }}
        >
          {label}
        </h4>
        <div className="flex flex-col gap-1">
          {entries.map(([key, val]) => (
            <div key={key} className="flex gap-2 text-[11px]">
              <span
                className="min-w-[100px] flex-shrink-0 font-medium"
                style={{ color: "var(--adm-text-muted)" }}
              >
                {key.replace(/_/g, " ")}
              </span>
              <span style={{ color: "var(--adm-text-secondary)" }}>
                {Array.isArray(val)
                  ? val.join(", ")
                  : typeof val === "boolean"
                    ? val
                      ? "Yes"
                      : "No"
                    : String(val)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Status Badge                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { icon: React.ElementType; color: string; bg: string; label: string }
  > = {
    pending: {
      icon: Loader2,
      color: "var(--adm-text-muted)",
      bg: "var(--adm-surface-2)",
      label: "Queued",
    },
    processing: {
      icon: Loader2,
      color: "var(--adm-accent-text)",
      bg: "var(--adm-accent-bg)",
      label: "Extracting...",
    },
    done: {
      icon: Check,
      color: "var(--adm-accent-text)",
      bg: "var(--adm-accent-bg)",
      label: "Extracted",
    },
    error: {
      icon: AlertCircle,
      color: "var(--adm-danger-text)",
      bg: "var(--adm-danger-bg)",
      label: "Error",
    },
  };

  const c = config[status] ?? config.pending;
  const BadgeIcon = c.icon;

  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
      style={{ backgroundColor: c.bg, color: c.color }}
    >
      <BadgeIcon
        className={`h-2.5 w-2.5 ${status === "processing" ? "animate-spin" : ""}`}
      />
      {c.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Gap Analysis Panel                                                 */
/* ------------------------------------------------------------------ */

function GapAnalysisPanel({
  gaps,
  loading,
  onClose,
}: {
  gaps: GapAnalysis | null;
  loading: boolean;
  onClose: () => void;
}) {
  if (loading) {
    return (
      <div
        className="flex flex-col items-center gap-3 rounded-xl border py-10"
        style={{
          borderColor: "var(--adm-border)",
          backgroundColor: "var(--adm-surface)",
        }}
      >
        <Loader2
          className="h-5 w-5 animate-spin"
          style={{ color: "var(--adm-accent)" }}
        />
        <p className="text-sm" style={{ color: "var(--adm-text-muted)" }}>
          Analyzing knowledge gaps...
        </p>
      </div>
    );
  }

  if (!gaps) return null;

  const readinessColor =
    gaps.overall_readiness >= 75
      ? "var(--adm-accent-text)"
      : gaps.overall_readiness >= 40
        ? "var(--adm-text-secondary)"
        : "var(--adm-danger-text)";

  return (
    <div
      className="flex flex-col gap-4 rounded-xl border"
      style={{
        borderColor: "var(--adm-border)",
        backgroundColor: "var(--adm-surface)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-4 py-3"
        style={{ borderColor: "var(--adm-border)" }}
      >
        <div className="flex items-center gap-3">
          <Target className="h-4 w-4" style={{ color: "var(--adm-accent-text)" }} />
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
              Gap Analysis
            </h3>
            <p className="text-[11px]" style={{ color: "var(--adm-text-muted)" }}>
              Overall readiness:{" "}
              <span className="font-semibold" style={{ color: readinessColor }}>
                {gaps.overall_readiness}%
              </span>
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
          style={{ color: "var(--adm-text-muted)" }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Readiness bar */}
      <div className="px-4">
        <div
          className="h-2 w-full overflow-hidden rounded-full"
          style={{ backgroundColor: "var(--adm-surface-2)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${gaps.overall_readiness}%`,
              backgroundColor: readinessColor,
            }}
          />
        </div>
      </div>

      {/* Tab readiness */}
      <div className="px-4">
        <h4
          className="mb-2 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: "var(--adm-text-muted)" }}
        >
          Tab readiness
        </h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {gaps.tabs.map((tab) => (
            <div
              key={tab.tab}
              className="flex flex-col gap-1 rounded-lg border px-3 py-2"
              style={{
                borderColor: "var(--adm-border)",
                backgroundColor: "var(--adm-surface-2)",
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium" style={{ color: "var(--adm-text)" }}>
                  {tab.tab}
                </span>
                <span
                  className="text-[10px] font-semibold"
                  style={{
                    color:
                      tab.status === "ready"
                        ? "var(--adm-accent-text)"
                        : tab.status === "partial"
                          ? "var(--adm-text-secondary)"
                          : "var(--adm-danger-text)",
                  }}
                >
                  {tab.readiness}%
                </span>
              </div>
              <div
                className="h-1 w-full overflow-hidden rounded-full"
                style={{ backgroundColor: "var(--adm-bg)" }}
              >
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${tab.readiness}%`,
                    backgroundColor:
                      tab.status === "ready"
                        ? "var(--adm-accent-text)"
                        : tab.status === "partial"
                          ? "var(--adm-text-secondary)"
                          : "var(--adm-danger-text)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Priority questions */}
      {gaps.priority_questions?.length > 0 && (
        <div className="px-4">
          <h4
            className="mb-2 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: "var(--adm-text-muted)" }}
          >
            Priority questions for next call
          </h4>
          <div className="flex flex-col gap-1.5">
            {gaps.priority_questions.map((q, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg px-3 py-2"
                style={{ backgroundColor: "var(--adm-surface-2)" }}
              >
                <CircleDot
                  className="mt-0.5 h-3 w-3 flex-shrink-0"
                  style={{ color: "var(--adm-accent-text)" }}
                />
                <span className="text-xs leading-relaxed" style={{ color: "var(--adm-text)" }}>
                  {q}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next call agenda */}
      {gaps.next_call_agenda && (
        <div
          className="mx-4 mb-4 rounded-lg px-4 py-3"
          style={{
            backgroundColor: "var(--adm-accent-bg)",
            borderLeft: "3px solid var(--adm-accent)",
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <HelpCircle className="h-3 w-3" style={{ color: "var(--adm-accent-text)" }} />
            <span
              className="text-[11px] font-semibold uppercase tracking-wider"
              style={{ color: "var(--adm-accent-text)" }}
            >
              Next call focus
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: "var(--adm-text-secondary)" }}>
            {gaps.next_call_agenda}
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

/* ------------------------------------------------------------------ */
/*  AI Voice Training                                                   */
/* ------------------------------------------------------------------ */

interface ConversationRow {
  id: string;
  direction: "inbound" | "outbound";
  from_email: string;
  to_email: string;
  subject: string | null;
  content: string;
  was_ai_generated: boolean;
  was_edited: boolean;
  sent_at: string;
  lead_id: string | null;
}

interface ConversationStats {
  total_conversations: number;
  inbound: number;
  outbound: number;
  ai_generated: number;
  ai_edited: number;
}

interface ConversationThread {
  email: string;
  inbound: number;
  outbound: number;
  last_at: string;
}

interface VoiceProfile {
  tone_descriptors: string[];
  signature_phrases: string[];
  summary: string;
  extracted_at: string;
  source_count: number;
}

interface ConversationsResponse {
  stats: ConversationStats;
  threads: ConversationThread[];
  recent: ConversationRow[];
  voice_profile: VoiceProfile | null;
}

function AIVoiceTraining({ clientId, token }: { clientId: string; token: string }) {
  const authFetcher = (url: string) =>
    fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json());

  const { data, isLoading, mutate } = useSWR<ConversationsResponse>(
    `/api/admin/clients/${clientId}/conversations`,
    authFetcher
  );

  const [expandedThread, setExpandedThread] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Upload thread state
  const [showUpload, setShowUpload] = useState(false);
  const [uploadText, setUploadText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ imported: number } | { error: string } | null>(null);

  // Extract voice state
  const [extracting, setExtracting] = useState(false);
  const [extractResult, setExtractResult] = useState<{ source_count: number; edited_count: number } | { error: string } | null>(null);

  const stats = data?.stats;
  const threads = data?.threads ?? [];
  const recent = data?.recent ?? [];
  const voiceProfile = data?.voice_profile ?? null;

  const visibleThreads = showAll ? threads : threads.slice(0, 5);
  const hasCorpus = stats && stats.total_conversations > 0;

  async function handleUpload() {
    if (!uploadText.trim()) return;
    setUploading(true);
    setUploadResult(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/conversations/upload-thread`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ raw_thread: uploadText }),
      });
      const json = await res.json() as { ok?: boolean; imported?: number; error?: string };
      if (res.ok && json.imported) {
        setUploadResult({ imported: json.imported });
        setUploadText("");
        void mutate();
      } else {
        setUploadResult({ error: json.error ?? "Upload failed" });
      }
    } finally {
      setUploading(false);
    }
  }

  async function handleExtract() {
    setExtracting(true);
    setExtractResult(null);
    try {
      const res = await fetch(`/api/admin/clients/${clientId}/conversations/extract-voice`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json() as { ok?: boolean; source_count?: number; edited_count?: number; error?: string };
      if (res.ok) {
        setExtractResult({ source_count: json.source_count ?? 0, edited_count: json.edited_count ?? 0 });
        void mutate(); // reload voice_profile from API
      } else {
        setExtractResult({ error: json.error ?? "Extraction failed" });
      }
    } finally {
      setExtracting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-xl border" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}>

      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3" style={{ borderColor: "var(--adm-border)" }}>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: "var(--adm-accent-bg)" }}>
            <Brain className="h-4 w-4" style={{ color: "var(--adm-accent-text)" }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
              AI Voice Training
            </h3>
            <p className="text-[11px]" style={{ color: "var(--adm-text-muted)" }}>
              Email corpus → distilled voice profile → used in every AI reply
            </p>
          </div>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setShowUpload(!showUpload); setUploadResult(null); }}
            className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-medium transition-colors"
            style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-muted)" }}
          >
            <ArrowDownLeft className="h-3 w-3" />
            Upload threads
          </button>
          <button
            onClick={handleExtract}
            disabled={extracting || !hasCorpus}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition-colors disabled:opacity-40"
            style={{ backgroundColor: "var(--adm-accent)" }}
            title={!hasCorpus ? "Add emails to the corpus first" : "Run Claude to distill voice profile from corpus"}
          >
            {extracting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {extracting ? "Extracting..." : "Extract voice"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--adm-accent)" }} />
        </div>
      ) : (
        <div className="flex flex-col gap-5 px-4 pb-4">

          {/* Upload area */}
          {showUpload && (
            <div className="flex flex-col gap-2 rounded-xl border p-4" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface-2)" }}>
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold" style={{ color: "var(--adm-text)" }}>
                  Paste email thread
                </p>
                <p className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
                  Paste a full thread — any format (Gmail, Outlook, etc.). Claude extracts only the outgoing replies.
                </p>
              </div>
              <textarea
                value={uploadText}
                onChange={(e) => setUploadText(e.target.value)}
                placeholder={"From: casper@plumbing.dk\nTo: customer@example.com\nSubject: Re: Leaking tap\n\nHi John, thanks for reaching out — I can come by Thursday afternoon..."}
                rows={8}
                className="w-full resize-y rounded-lg border px-3 py-2 font-mono text-[11px] outline-none"
                style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)", color: "var(--adm-text)" }}
              />
              {uploadResult && (
                "imported" in uploadResult ? (
                  <p className="text-[11px]" style={{ color: "#16a34a" }}>
                    ✓ Imported {uploadResult.imported} outgoing repl{uploadResult.imported === 1 ? "y" : "ies"} into corpus
                  </p>
                ) : (
                  <p className="text-[11px]" style={{ color: "var(--adm-danger-text)" }}>
                    {uploadResult.error}
                  </p>
                )
              )}
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => { setShowUpload(false); setUploadText(""); setUploadResult(null); }}
                  className="rounded-lg border px-3 py-1.5 text-[11px] font-medium"
                  style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-muted)" }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading || !uploadText.trim()}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
                  style={{ backgroundColor: "var(--adm-accent)" }}
                >
                  {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <ArrowUpRight className="h-3 w-3" />}
                  {uploading ? "Parsing..." : "Add to corpus"}
                </button>
              </div>
            </div>
          )}

          {/* Extract result flash */}
          {extractResult && (
            "error" in extractResult ? (
              <p className="rounded-lg px-3 py-2 text-[11px]" style={{ backgroundColor: "color-mix(in srgb, red 8%, transparent)", color: "var(--adm-danger-text)" }}>
                {extractResult.error}
              </p>
            ) : (
              <p className="rounded-lg px-3 py-2 text-[11px]" style={{ backgroundColor: "color-mix(in srgb, #22c55e 10%, transparent)", color: "#16a34a" }}>
                ✓ Voice profile extracted from {extractResult.source_count} emails ({extractResult.edited_count} edited). Voice samples updated in automation config.
              </p>
            )
          )}

          {/* Empty state */}
          {!hasCorpus && !showUpload && (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <Mail className="h-8 w-8 opacity-20" style={{ color: "var(--adm-text-muted)" }} />
              <p className="text-xs font-medium" style={{ color: "var(--adm-text-muted)" }}>No corpus yet</p>
              <p className="max-w-xs text-[11px]" style={{ color: "var(--adm-text-muted)", opacity: 0.7 }}>
                Emails auto-capture when Lead Reply is active. Or paste existing threads using &ldquo;Upload threads&rdquo; above to get started immediately.
              </p>
            </div>
          )}

          {hasCorpus && (
            <>
              {/* Corpus stats */}
              <div className="grid grid-cols-4 gap-2">
                <StatPill label="Total emails" value={stats.total_conversations} />
                <StatPill label="Inbound" value={stats.inbound} />
                <StatPill label="AI replies" value={stats.ai_generated} />
                <StatPill
                  label="Edited (★)"
                  value={stats.ai_edited}
                  highlight={stats.ai_edited > 0}
                  tooltip="Client corrected an AI draft — highest training signal"
                />
              </div>

              {/* Signal quality bar */}
              {stats.outbound > 0 && (
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--adm-text-muted)" }}>
                      Signal quality
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
                      {stats.ai_edited} edited · {stats.outbound - stats.ai_generated} human-written · {stats.ai_generated - stats.ai_edited} auto-sent
                    </span>
                  </div>
                  <div className="flex h-1.5 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--adm-surface-2)" }}>
                    {/* Edited (highest) */}
                    {stats.ai_edited > 0 && (
                      <div className="h-full" style={{ width: `${Math.round((stats.ai_edited / stats.outbound) * 100)}%`, backgroundColor: "var(--adm-accent)" }} />
                    )}
                    {/* Human-written uploads */}
                    {(stats.outbound - stats.ai_generated) > 0 && (
                      <div className="h-full" style={{ width: `${Math.round(((stats.outbound - stats.ai_generated) / stats.outbound) * 100)}%`, backgroundColor: "color-mix(in srgb, var(--adm-accent) 50%, transparent)" }} />
                    )}
                    {/* Auto-sent (lowest) */}
                    {(stats.ai_generated - stats.ai_edited) > 0 && (
                      <div className="h-full" style={{ width: `${Math.round(((stats.ai_generated - stats.ai_edited) / stats.outbound) * 100)}%`, backgroundColor: "var(--adm-surface-2)" }} />
                    )}
                  </div>
                  <div className="mt-1 flex gap-3">
                    <span className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
                      <span className="inline-block h-2 w-2 rounded-sm mr-1 align-middle" style={{ backgroundColor: "var(--adm-accent)" }} />
                      Edited
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
                      <span className="inline-block h-2 w-2 rounded-sm mr-1 align-middle" style={{ backgroundColor: "color-mix(in srgb, var(--adm-accent) 50%, transparent)" }} />
                      Uploaded
                    </span>
                    <span className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
                      <span className="inline-block h-2 w-2 rounded-sm mr-1 align-middle" style={{ backgroundColor: "var(--adm-border)" }} />
                      Auto-sent
                    </span>
                  </div>
                </div>
              )}

              {/* Extracted voice profile */}
              {voiceProfile && (
                <div className="flex flex-col gap-3 rounded-xl border p-4" style={{ borderColor: "color-mix(in srgb, var(--adm-accent) 25%, transparent)", backgroundColor: "var(--adm-accent-bg)" }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5" style={{ color: "var(--adm-accent-text)" }} />
                      <span className="text-[11px] font-semibold" style={{ color: "var(--adm-accent-text)" }}>
                        Voice profile — active
                      </span>
                    </div>
                    <span className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
                      {voiceProfile.source_count} emails · {getTimeAgo(new Date(voiceProfile.extracted_at))}
                    </span>
                  </div>

                  {voiceProfile.summary && (
                    <p className="text-[11px] leading-relaxed italic" style={{ color: "var(--adm-text-secondary)" }}>
                      &ldquo;{voiceProfile.summary}&rdquo;
                    </p>
                  )}

                  {voiceProfile.tone_descriptors?.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--adm-text-muted)" }}>Tone</p>
                      <div className="flex flex-wrap gap-1.5">
                        {voiceProfile.tone_descriptors.map((d, i) => (
                          <span key={i} className="rounded-md px-2 py-1 text-[10px]" style={{ backgroundColor: "var(--adm-surface)", color: "var(--adm-text-secondary)" }}>
                            {d}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {voiceProfile.signature_phrases?.length > 0 && (
                    <div>
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--adm-text-muted)" }}>Signature phrases</p>
                      <div className="flex flex-wrap gap-1.5">
                        {voiceProfile.signature_phrases.map((p, i) => (
                          <span key={i} className="rounded-md px-2 py-1 font-mono text-[10px]" style={{ backgroundColor: "var(--adm-surface)", color: "var(--adm-text-secondary)" }}>
                            &ldquo;{p}&rdquo;
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* No profile yet nudge */}
              {!voiceProfile && stats.outbound >= 5 && (
                <div className="rounded-lg border border-dashed px-4 py-3 text-center" style={{ borderColor: "var(--adm-border)" }}>
                  <p className="text-[11px]" style={{ color: "var(--adm-text-muted)" }}>
                    You have {stats.outbound} outgoing emails — click <strong>Extract voice</strong> to distill them into a profile.
                  </p>
                </div>
              )}

              {/* Thread list */}
              {threads.length > 0 && (
                <div>
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--adm-text-muted)" }}>
                    Contacts ({threads.length})
                  </h4>
                  <div className="flex flex-col gap-1.5">
                    {visibleThreads.map((thread) => {
                      const isExpanded = expandedThread === thread.email;
                      const threadMessages = recent.filter(
                        (r) => r.from_email === thread.email || r.to_email === thread.email
                      );
                      return (
                        <div key={thread.email} className="overflow-hidden rounded-lg border" style={{ borderColor: "var(--adm-border)" }}>
                          <button
                            onClick={() => setExpandedThread(isExpanded ? null : thread.email)}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--adm-surface-2)]"
                          >
                            <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-[10px] font-bold uppercase" style={{ backgroundColor: "var(--adm-accent-bg)", color: "var(--adm-accent-text)" }}>
                              {thread.email[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[11px] font-medium" style={{ color: "var(--adm-text)" }}>{thread.email}</p>
                              <div className="mt-0.5 flex items-center gap-2">
                                <span className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
                                  {thread.inbound} in · {thread.outbound} out
                                </span>
                                <span className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>·</span>
                                <span className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
                                  {getTimeAgo(new Date(thread.last_at))}
                                </span>
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--adm-text-muted)" }} />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" style={{ color: "var(--adm-text-muted)" }} />
                            )}
                          </button>

                          {isExpanded && threadMessages.length > 0 && (
                            <div className="flex flex-col border-t" style={{ borderColor: "var(--adm-border)" }}>
                              {threadMessages.slice(0, 8).map((msg) => (
                                <div key={msg.id} className="flex gap-3 border-b px-3 py-2.5 last:border-b-0" style={{ borderColor: "var(--adm-border)" }}>
                                  <div className="mt-0.5 flex-shrink-0">
                                    {msg.direction === "inbound" ? (
                                      <ArrowDownLeft className="h-3.5 w-3.5" style={{ color: "var(--adm-text-muted)" }} />
                                    ) : (
                                      <ArrowUpRight className="h-3.5 w-3.5" style={{ color: "var(--adm-accent-text)" }} />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="mb-0.5 flex items-center gap-2">
                                      <span className="text-[10px] font-semibold" style={{ color: msg.direction === "outbound" ? "var(--adm-accent-text)" : "var(--adm-text)" }}>
                                        {msg.direction === "inbound" ? "Lead" : "Reply"}
                                      </span>
                                      {msg.was_edited && (
                                        <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: "color-mix(in srgb, var(--adm-accent) 15%, transparent)", color: "var(--adm-accent-text)" }}>
                                          ★ edited
                                        </span>
                                      )}
                                      {!msg.was_ai_generated && msg.direction === "outbound" && (
                                        <span className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold" style={{ backgroundColor: "var(--adm-surface-2)", color: "var(--adm-text-muted)" }}>
                                          human
                                        </span>
                                      )}
                                      <span className="ml-auto text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
                                        {getTimeAgo(new Date(msg.sent_at))}
                                      </span>
                                    </div>
                                    {msg.subject && (
                                      <p className="mb-0.5 truncate text-[10px] font-medium" style={{ color: "var(--adm-text-secondary)" }}>
                                        {msg.subject}
                                      </p>
                                    )}
                                    <p className="line-clamp-2 text-[11px] leading-snug" style={{ color: "var(--adm-text-secondary)" }}>
                                      {msg.content.slice(0, 200)}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {threads.length > 5 && (
                    <button
                      onClick={() => setShowAll(!showAll)}
                      className="mt-2 w-full rounded-lg border py-2 text-[11px] font-medium transition-colors hover:bg-[var(--adm-surface-2)]"
                      style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-muted)" }}
                    >
                      {showAll ? "Show fewer" : `Show all ${threads.length} contacts`}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function StatPill({
  label,
  value,
  highlight = false,
  tooltip,
}: {
  label: string;
  value: number;
  highlight?: boolean;
  tooltip?: string;
}) {
  return (
    <div
      className="flex flex-col rounded-lg px-3 py-2.5"
      style={{ backgroundColor: highlight ? "var(--adm-accent-bg)" : "var(--adm-surface-2)" }}
      title={tooltip}
    >
      <span
        className="text-lg font-bold tabular-nums"
        style={{ color: highlight ? "var(--adm-accent-text)" : "var(--adm-text)" }}
      >
        {value}
      </span>
      <span className="text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
        {label}
      </span>
    </div>
  );
}
