"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  ExternalLink,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  Globe,
  Info,
  RotateCcw,
  MapPin,
  TreePine,
  BarChart3,
  Layers,
  Target,
  FileText,
} from "lucide-react";
import type { SEOPage } from "@/lib/types";
import {
  parseSEOCsv,
  buildSiteTree,
  computeWebsiteStats,
  getLocationSegments,
  PAGE_STATUSES,
  fmtVol,
} from "@/lib/website-utils";
import type { SiteTreeNode } from "@/lib/types";

/* ================================================================== */
/*  WebsiteHubEditor                                                    */
/* ================================================================== */
export function WebsiteHubEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
  const seoSheetLink = (data.seo_sheet_link as string) ?? "";
  const uploadedAt = (data.uploaded_at as string) ?? "";
  const multiLocation = (data.multi_location as boolean) ?? false;
  const pages = (data.pages as SEOPage[]) ?? [];

  const stats = useMemo(() => computeWebsiteStats(pages), [pages]);
  const tree = useMemo(() => buildSiteTree(pages), [pages]);
  const locationSegments = useMemo(() => getLocationSegments(pages), [pages]);

  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [parseError, setParseError] = useState("");
  const [preview, setPreview] = useState<SEOPage[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [filterText, setFilterText] = useState("");
  const [filterLocation, setFilterLocation] = useState("all");

  /* -- CSV parse -- */
  const handleParse = useCallback(
    (raw: string) => {
      setParseError("");
      try {
        const parsed = parseSEOCsv(raw);
        if (parsed.length === 0) {
          setParseError("No valid page rows found. Check that your CSV has at least 6 columns.");
          return;
        }
        setPreview(parsed);
      } catch {
        setParseError("Failed to parse CSV. Please check the format.");
      }
    },
    []
  );

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        if (text) handleParse(text);
      };
      reader.readAsText(file);
      if (fileRef.current) fileRef.current.value = "";
    },
    [handleParse]
  );

  const confirmImport = useCallback(() => {
    if (!preview) return;
    // Preserve existing statuses for matching URLs
    const existingStatusMap = new Map<string, { status: SEOPage["status"]; notes: string }>();
    for (const p of pages) {
      existingStatusMap.set(p.full_url_path, { status: p.status, notes: p.notes });
    }
    const merged = preview.map((p) => {
      const existing = existingStatusMap.get(p.full_url_path);
      if (existing) {
        return { ...p, status: existing.status, notes: existing.notes };
      }
      return p;
    });

    onChange({
      ...data,
      pages: merged,
      uploaded_at: new Date().toISOString(),
    });
    setCsvModalOpen(false);
    setPreview(null);
    setPasteText("");
  }, [preview, pages, data, onChange]);

  /* -- Page updates -- */
  const updatePage = useCallback(
    (urlPath: string, field: string, value: string) => {
      const next = pages.map((p) =>
        p.full_url_path === urlPath ? { ...p, [field]: value } : p
      );
      onChange({ ...data, pages: next });
    },
    [pages, data, onChange]
  );

  const deletePage = useCallback(
    (urlPath: string) => {
      onChange({ ...data, pages: pages.filter((p) => p.full_url_path !== urlPath) });
    },
    [pages, data, onChange]
  );

  /* -- Filtered pages for tree -- */
  const filteredPages = useMemo(() => {
    let result = pages;
    if (filterLocation !== "all") {
      result = result.filter((p) => p.full_url_path.startsWith("/" + filterLocation + "/"));
    }
    if (filterText) {
      const q = filterText.toLowerCase();
      result = result.filter(
        (p) =>
          p.full_url_path.toLowerCase().includes(q) ||
          p.primary_keyword.toLowerCase().includes(q) ||
          p.cluster_name.toLowerCase().includes(q)
      );
    }
    return result;
  }, [pages, filterLocation, filterText]);

  const filteredTree = useMemo(() => buildSiteTree(filteredPages), [filteredPages]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header: sheet link + multi-location toggle */}
      <div className="flex flex-col gap-3">
        {/* Sheet link */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-medium text-[var(--adm-text-secondary)]">
              SEO Research Google Sheet
            </label>
            <input
              type="text"
              value={seoSheetLink}
              onChange={(e) => onChange({ ...data, seo_sheet_link: e.target.value })}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="h-8 w-full rounded-md border px-2.5 text-xs outline-none focus:ring-1"
              style={{
                borderColor: "var(--adm-border)",
                backgroundColor: "var(--adm-surface)",
                color: "var(--adm-text)",
              }}
            />
          </div>
          {seoSheetLink && (
            <a
              href={seoSheetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex h-8 w-8 items-center justify-center rounded-md border text-[var(--adm-text-muted)] hover:text-[var(--adm-text-secondary)]"
              style={{ borderColor: "var(--adm-border)" }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {/* Multi-location toggle */}
        <div className="flex items-center justify-between rounded-lg border px-3 py-2.5" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}>
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5 text-[var(--adm-text-muted)]" />
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-[var(--adm-text)]">Multi-Location Project</span>
              <span className="text-[10px] text-[var(--adm-text-muted)]">
                {multiLocation
                  ? "URL paths grouped by location folders (e.g. /uk/, /de/)"
                  : "Single location -- flat page structure"}
              </span>
            </div>
          </div>
          <button
            onClick={() => onChange({ ...data, multi_location: !multiLocation })}
            className="relative flex h-5 w-9 items-center rounded-full px-0.5 transition-colors"
            style={{
              backgroundColor: multiLocation ? "var(--adm-accent)" : "var(--adm-border)",
            }}
          >
            <span
              className="h-4 w-4 rounded-full bg-white shadow-sm transition-transform"
              style={{ transform: multiLocation ? "translateX(16px)" : "translateX(0)" }}
            />
          </button>
        </div>
      </div>

      {/* Upload section */}
      <div className="flex flex-col gap-2 rounded-lg border p-3" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-bg)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="h-3.5 w-3.5 text-[var(--adm-text-muted)]" />
            <span className="text-xs font-semibold text-[var(--adm-text)]">
              {pages.length > 0 ? `${pages.length} pages imported` : "Import SEO Research"}
            </span>
            {uploadedAt && (
              <span className="text-[10px] text-[var(--adm-text-muted)]">
                -- Updated {new Date(uploadedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <button
            onClick={() => { setCsvModalOpen(!csvModalOpen); setPreview(null); setPasteText(""); setParseError(""); }}
            className="flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors hover:bg-[var(--adm-surface)]"
            style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-secondary)" }}
          >
            <FileSpreadsheet className="h-3 w-3" />
            {pages.length > 0 ? "Re-import" : "Import CSV"}
          </button>
        </div>

        {/* Template download */}
        <div className="flex items-start gap-2 rounded-md px-2.5 py-2" style={{ backgroundColor: "var(--adm-surface)" }}>
          <Info className="mt-0.5 h-3 w-3 flex-shrink-0 text-[var(--adm-text-muted)]" />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] leading-relaxed text-[var(--adm-text-muted)]">
              Expected columns: <strong className="text-[var(--adm-text-secondary)]">Cluster Name | Primary Keyword | Search Volume | Intent | Page Type | Full URL Path | Priority | Secondary Keywords</strong>.
              Secondary keywords separated by semicolons.
            </span>
            <a
              href="/templates/seo-keyword-research-template.csv"
              download
              className="flex w-fit items-center gap-1 text-[10px] font-medium hover:underline"
              style={{ color: "var(--adm-accent-text)" }}
            >
              <FileSpreadsheet className="h-3 w-3" />
              Download CSV template
            </a>
          </div>
        </div>

        {/* CSV Modal */}
        {csvModalOpen && (
          <div className="flex flex-col gap-2 rounded-lg border p-3" style={{ borderColor: "var(--adm-accent)", backgroundColor: "var(--adm-surface)" }}>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste your SEO research data here (from Google Sheets or CSV)..."
              className="h-28 w-full rounded border p-2 font-mono text-[11px] outline-none focus:ring-1"
              style={{
                borderColor: "var(--adm-border)",
                backgroundColor: "var(--adm-bg)",
                color: "var(--adm-text)",
              }}
            />
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleParse(pasteText)}
                disabled={!pasteText.trim()}
                className="flex h-7 items-center gap-1.5 rounded-md px-3 text-[11px] font-medium text-white disabled:opacity-40"
                style={{ backgroundColor: "var(--adm-accent)" }}
              >
                Parse
              </button>
              <span className="text-[10px] text-[var(--adm-text-muted)]">or</span>
              <label className="flex h-7 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-[11px] font-medium hover:bg-[var(--adm-bg)]" style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-secondary)" }}>
                <Upload className="h-3 w-3" />
                Upload CSV
                <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} className="hidden" />
              </label>
              {pages.length > 0 && (
                <button
                  onClick={() => { setCsvModalOpen(false); setPreview(null); }}
                  className="ml-auto text-[10px] text-[var(--adm-text-muted)] hover:text-[var(--adm-text-secondary)]"
                >
                  Cancel
                </button>
              )}
            </div>
            {parseError && <p className="text-[10px] font-medium" style={{ color: "var(--adm-danger-text)" }}>{parseError}</p>}

            {/* Preview */}
            {preview && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[var(--adm-text)]">
                    Preview: {preview.length} pages found
                  </span>
                  <button
                    onClick={confirmImport}
                    className="flex h-7 items-center gap-1.5 rounded-md px-3 text-[11px] font-medium text-white"
                    style={{ backgroundColor: "var(--adm-success, #059669)" }}
                  >
                    Confirm Import
                  </button>
                </div>
                <div className="max-h-48 overflow-auto rounded border" style={{ borderColor: "var(--adm-border)" }}>
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr style={{ backgroundColor: "var(--adm-surface)" }}>
                        <th className="px-2 py-1.5 text-left font-semibold text-[var(--adm-text-secondary)]">URL Path</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-[var(--adm-text-secondary)]">Primary KW</th>
                        <th className="px-2 py-1.5 text-right font-semibold text-[var(--adm-text-secondary)]">Volume</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-[var(--adm-text-secondary)]">Type</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-[var(--adm-text-secondary)]">Priority</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 15).map((p, i) => (
                        <tr key={i} className="border-t" style={{ borderColor: "var(--adm-border-30)" }}>
                          <td className="px-2 py-1 font-mono text-[var(--adm-text)]">{p.full_url_path}</td>
                          <td className="px-2 py-1 text-[var(--adm-text-secondary)]">{p.primary_keyword}</td>
                          <td className="px-2 py-1 text-right text-[var(--adm-text)]">{p.search_volume.toLocaleString()}</td>
                          <td className="px-2 py-1 text-[var(--adm-text-muted)]">{p.page_type}</td>
                          <td className="px-2 py-1 text-[var(--adm-text-muted)]">{p.priority}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 15 && (
                    <p className="border-t px-2 py-1.5 text-center text-[10px] text-[var(--adm-text-muted)]" style={{ borderColor: "var(--adm-border-30)" }}>
                      ...and {preview.length - 15} more pages
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Stats cards */}
      {pages.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <StatCard icon={FileText} label="Total Pages" value={String(stats.total)} />
            <StatCard icon={BarChart3} label="Total Volume" value={fmtVol(stats.totalVolume)} />
            <StatCard icon={Target} label="Live" value={String(stats.live)} accent="var(--adm-success, #059669)" />
            <StatCard icon={Layers} label="In Progress" value={String(stats.inProgress)} accent="var(--adm-accent)" />
            <StatCard icon={TreePine} label="Planned" value={String(stats.planned)} />
          </div>

          {/* Progress bar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-[var(--adm-text-secondary)]">Build Progress</span>
              <span className="text-[10px] font-bold text-[var(--adm-text)]">{stats.progressPercent}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ backgroundColor: "var(--adm-border)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${stats.progressPercent}%`,
                  backgroundColor: "var(--adm-success, #059669)",
                }}
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--adm-text-muted)]" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter pages..."
                className="h-7 w-full rounded-md border pl-7 pr-2 text-[11px] outline-none focus:ring-1"
                style={{
                  borderColor: "var(--adm-border)",
                  backgroundColor: "var(--adm-surface)",
                  color: "var(--adm-text)",
                }}
              />
            </div>
            {multiLocation && locationSegments.length > 1 && (
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="h-7 rounded-md border px-2 text-[11px] outline-none"
                style={{
                  borderColor: "var(--adm-border)",
                  backgroundColor: "var(--adm-surface)",
                  color: "var(--adm-text)",
                }}
              >
                <option value="all">All Locations</option>
                {locationSegments.map((seg) => (
                  <option key={seg} value={seg}>/{seg}/</option>
                ))}
              </select>
            )}
            <button
              onClick={() => {
                if (confirm("Remove all pages? This cannot be undone.")) {
                  onChange({ ...data, pages: [], uploaded_at: "" });
                }
              }}
              className="flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] text-[var(--adm-text-muted)] hover:border-[var(--adm-danger-text)] hover:text-[var(--adm-danger-text)]"
              style={{ borderColor: "var(--adm-border)" }}
            >
              <RotateCcw className="h-3 w-3" /> Clear
            </button>
          </div>

          {/* Site tree */}
          <div className="rounded-lg border" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-bg)" }}>
            <div className="flex items-center gap-2 border-b px-3 py-2" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}>
              <Globe className="h-3.5 w-3.5 text-[var(--adm-text-muted)]" />
              <span className="text-[11px] font-semibold text-[var(--adm-text)]">Site Architecture</span>
              <span className="text-[10px] text-[var(--adm-text-muted)]">
                {filteredPages.length} page{filteredPages.length !== 1 ? "s" : ""}
              </span>
            </div>
            <div className="p-1">
              {filteredTree.map((node) => (
                <TreeNodeRow
                  key={node.full_path}
                  node={node}
                  depth={0}
                  onUpdatePage={updatePage}
                  onDeletePage={deletePage}
                  multiLocation={multiLocation}
                />
              ))}
              {filteredTree.length === 0 && (
                <p className="px-3 py-4 text-center text-[11px] text-[var(--adm-text-muted)]">
                  No pages match your filter.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ================================================================== */
/*  StatCard                                                            */
/* ================================================================== */
function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div
      className="flex flex-col items-center gap-1 rounded-lg border p-2.5"
      style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
    >
      <Icon className="h-3.5 w-3.5 text-[var(--adm-text-muted)]" />
      <span
        className="text-base font-bold"
        style={{ color: accent || "var(--adm-text)" }}
      >
        {value}
      </span>
      <span className="text-[9px] font-medium uppercase tracking-wider text-[var(--adm-text-muted)]">
        {label}
      </span>
    </div>
  );
}

/* ================================================================== */
/*  TreeNodeRow -- recursive site tree node                            */
/* ================================================================== */
function TreeNodeRow({
  node,
  depth,
  onUpdatePage,
  onDeletePage,
  multiLocation,
}: {
  node: SiteTreeNode;
  depth: number;
  onUpdatePage: (urlPath: string, field: string, value: string) => void;
  onDeletePage: (urlPath: string) => void;
  multiLocation: boolean;
}) {
  const hasChildren = node.children.length > 0;
  const isFolder = !node.page && hasChildren;
  const isPage = !!node.page;
  const [expanded, setExpanded] = useState(depth < 2);
  const [detailOpen, setDetailOpen] = useState(false);

  const statusInfo = isPage
    ? PAGE_STATUSES.find((s) => s.value === node.page!.status) ?? PAGE_STATUSES[0]
    : null;

  // Indent with subtle connector lines
  const indent = depth * 20;

  return (
    <div>
      {/* Node row */}
      <div
        className="group flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-[var(--adm-surface)]"
        style={{ paddingLeft: `${indent + 6}px` }}
      >
        {/* Expand/collapse for folders and pages with children */}
        {hasChildren ? (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex h-5 w-5 items-center justify-center rounded text-[var(--adm-text-muted)] hover:bg-[var(--adm-border)]"
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
          </button>
        ) : (
          <span className="h-5 w-5" />
        )}

        {/* Node icon/indicator */}
        {isPage ? (
          <span
            className="h-2 w-2 flex-shrink-0 rounded-full"
            style={{ backgroundColor: statusInfo?.color || "#94a3b8" }}
          />
        ) : (
          <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded text-[8px] font-bold text-[var(--adm-text-muted)]" style={{ backgroundColor: "var(--adm-border)" }}>
            {node.total_pages}
          </span>
        )}

        {/* URL segment */}
        <button
          onClick={() => isPage ? setDetailOpen(!detailOpen) : setExpanded(!expanded)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          <span
            className={`truncate text-[11px] ${isPage ? "font-mono font-medium" : "font-semibold"}`}
            style={{ color: isPage ? "var(--adm-text)" : "var(--adm-text-secondary)" }}
          >
            {isFolder && !isPage ? node.segment + "/" : node.segment}
          </span>

          {/* Page type badge */}
          {isPage && node.page!.page_type && (
            <span
              className="flex-shrink-0 rounded px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider"
              style={{
                backgroundColor: getPageTypeColor(node.page!.page_type).bg,
                color: getPageTypeColor(node.page!.page_type).text,
              }}
            >
              {node.page!.page_type}
            </span>
          )}

          {/* Priority badge for P1 */}
          {isPage && node.page!.priority === "P1" && (
            <span
              className="flex-shrink-0 rounded px-1 py-0.5 text-[8px] font-bold"
              style={{ backgroundColor: "#fef3c7", color: "#92400e" }}
            >
              P1
            </span>
          )}
        </button>

        {/* Volume */}
        {(isPage || isFolder) && (
          <span className="flex-shrink-0 text-[10px] font-medium tabular-nums text-[var(--adm-text-muted)]">
            {fmtVol(isPage ? node.page!.search_volume : node.total_volume)}/mo
          </span>
        )}

        {/* Status dropdown for pages */}
        {isPage && (
          <select
            value={node.page!.status}
            onChange={(e) => onUpdatePage(node.page!.full_url_path, "status", e.target.value)}
            className="h-5 flex-shrink-0 cursor-pointer rounded border-none px-1 text-[9px] font-bold uppercase tracking-wide outline-none"
            style={{
              backgroundColor: statusInfo?.color + "20",
              color: statusInfo?.color,
            }}
          >
            {PAGE_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        )}

        {/* Delete button */}
        {isPage && (
          <button
            onClick={() => onDeletePage(node.page!.full_url_path)}
            className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--adm-danger-bg)] hover:text-[var(--adm-danger-text)]"
          >
            <Trash2 className="h-2.5 w-2.5" />
          </button>
        )}
      </div>

      {/* Page detail panel */}
      {isPage && detailOpen && (
        <div
          className="mx-1 mb-1 rounded-md border p-2.5"
          style={{
            marginLeft: `${indent + 32}px`,
            borderColor: "var(--adm-border)",
            backgroundColor: "var(--adm-surface)",
          }}
        >
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <DetailField label="Cluster" value={node.page!.cluster_name} />
            <DetailField label="Primary Keyword" value={node.page!.primary_keyword} />
            <DetailField label="Search Volume" value={node.page!.search_volume.toLocaleString() + "/mo"} />
            <DetailField label="Intent" value={node.page!.intent} />
            <DetailField label="Page Type" value={node.page!.page_type} />
            <DetailField label="Priority" value={node.page!.priority} />
          </div>
          {node.page!.secondary_keywords.length > 0 && (
            <div className="mt-2">
              <span className="text-[9px] font-medium text-[var(--adm-text-muted)]">Secondary Keywords</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {node.page!.secondary_keywords.map((kw, i) => (
                  <span
                    key={i}
                    className="rounded px-1.5 py-0.5 text-[9px] text-[var(--adm-text-secondary)]"
                    style={{ backgroundColor: "var(--adm-bg)" }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="mt-2">
            <label className="text-[9px] font-medium text-[var(--adm-text-muted)]">Notes</label>
            <input
              type="text"
              value={node.page!.notes}
              onChange={(e) => onUpdatePage(node.page!.full_url_path, "notes", e.target.value)}
              placeholder="Add notes..."
              className="mt-0.5 h-7 w-full rounded border px-2 text-[11px] outline-none focus:ring-1"
              style={{
                borderColor: "var(--adm-border)",
                backgroundColor: "var(--adm-bg)",
                color: "var(--adm-text)",
              }}
            />
          </div>
        </div>
      )}

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNodeRow
              key={child.full_path}
              node={child}
              depth={depth + 1}
              onUpdatePage={onUpdatePage}
              onDeletePage={onDeletePage}
              multiLocation={multiLocation}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/*  DetailField                                                         */
/* ================================================================== */
function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[9px] font-medium text-[var(--adm-text-muted)]">{label}</span>
      <span className="text-[11px] font-medium text-[var(--adm-text)]">{value || "-"}</span>
    </div>
  );
}

/* ================================================================== */
/*  Color helpers                                                       */
/* ================================================================== */
function getPageTypeColor(pageType: string): { bg: string; text: string } {
  const t = pageType.toLowerCase();
  if (t.includes("pillar")) return { bg: "#dbeafe", text: "#1e40af" };
  if (t.includes("service")) return { bg: "#dcfce7", text: "#166534" };
  if (t.includes("comparison")) return { bg: "#fef3c7", text: "#92400e" };
  if (t.includes("trust") || t.includes("about")) return { bg: "#f3e8ff", text: "#6b21a8" };
  if (t.includes("category")) return { bg: "#ffe4e6", text: "#9f1239" };
  if (t.includes("blog") || t.includes("article")) return { bg: "#e0f2fe", text: "#0369a1" };
  return { bg: "#f1f5f9", text: "#475569" };
}
