"use client";

import { useCallback, useRef, useState } from "react";
import {
  Upload,
  FileSpreadsheet,
  ExternalLink,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
  BarChart3,
  DollarSign,
  Globe,
  Info,
  RotateCcw,
} from "lucide-react";
import type { PPCKeyword } from "@/lib/types";
import { parsePPCCsv, aggregateDemand, fmtCurrency, fmtVolume, SUPPORTED_CURRENCIES } from "@/lib/demand-utils";

/* ================================================================== */
/*  DemandHubEditor                                                    */
/* ================================================================== */
export function DemandHubEditor({
  data,
  onChange,
}: {
  data: Record<string, unknown>;
  onChange: (d: Record<string, unknown>) => void;
}) {
  const ppcSheetLink = (data.ppc_sheet_link as string) ?? "";
  const uploadedAt = (data.uploaded_at as string) ?? "";
  const currency = (data.currency as string) ?? "USD";
  const keywords = (data.keywords as PPCKeyword[]) ?? [];
  const summary = aggregateDemand(keywords);

  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [parseError, setParseError] = useState("");
  const [preview, setPreview] = useState<PPCKeyword[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /* -- CSV paste/file handling -- */
  const handleParse = useCallback(
    (raw: string) => {
      setParseError("");
      try {
        const parsed = parsePPCCsv(raw);
        if (parsed.length === 0) {
          setParseError("No valid keyword rows found. Check that your CSV has at least 7 columns.");
          return;
        }
        setPreview(parsed);
      } catch {
        setParseError("Failed to parse CSV. Check the format and try again.");
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
        setPasteText(text);
        handleParse(text);
      };
      reader.readAsText(file);
      if (fileRef.current) fileRef.current.value = "";
    },
    [handleParse]
  );

  const handleConfirmImport = useCallback(() => {
    if (!preview) return;
    onChange({
      ...data,
      keywords: preview,
      uploaded_at: new Date().toISOString(),
    });
    setPreview(null);
    setPasteText("");
    setCsvModalOpen(false);
  }, [preview, data, onChange]);

  const handleClearData = useCallback(() => {
    onChange({
      ...data,
      keywords: [],
      uploaded_at: "",
    });
  }, [data, onChange]);

  return (
    <div className="flex flex-col gap-4">
      {/* Header: sheet link + currency picker */}
      <div className="flex flex-col gap-3">
        {/* Sheet link */}
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <label className="mb-1 block text-[10px] font-medium text-[var(--adm-text-secondary)]">
              PPC Research Google Sheet
            </label>
            <input
              type="text"
              value={ppcSheetLink}
              onChange={(e) => onChange({ ...data, ppc_sheet_link: e.target.value })}
              placeholder="https://docs.google.com/spreadsheets/d/..."
              className="h-8 w-full rounded-md border px-2.5 text-xs outline-none focus:ring-1"
              style={{
                borderColor: "var(--adm-border)",
                backgroundColor: "var(--adm-surface)",
                color: "var(--adm-text)",
              }}
            />
          </div>
          {ppcSheetLink && (
            <a
              href={ppcSheetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 flex h-8 w-8 items-center justify-center rounded-md border text-[var(--adm-text-muted)] hover:text-[var(--adm-text-secondary)]"
              style={{ borderColor: "var(--adm-border)" }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>

        {/* Currency picker */}
        <div className="flex items-center justify-between rounded-lg border px-3 py-2.5" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}>
          <div className="flex items-center gap-2">
            <DollarSign className="h-3.5 w-3.5 text-[var(--adm-text-muted)]" />
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-[var(--adm-text)]">Bid Currency</span>
              <span className="text-[10px] text-[var(--adm-text-muted)]">
                Used for CPC display in client dashboard
              </span>
            </div>
          </div>
          <select
            value={currency}
            onChange={(e) => onChange({ ...data, currency: e.target.value })}
            className="h-7 rounded-md border px-2 text-[11px] font-medium outline-none"
            style={{
              borderColor: "var(--adm-border)",
              backgroundColor: "var(--adm-bg)",
              color: "var(--adm-text)",
            }}
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Upload section */}
      <div className="flex flex-col gap-2 rounded-lg border p-3" style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-bg)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Upload className="h-3.5 w-3.5 text-[var(--adm-text-muted)]" />
            <span className="text-xs font-semibold text-[var(--adm-text)]">
              {keywords.length > 0 ? `${keywords.length} keywords imported` : "Import PPC Research"}
            </span>
            {uploadedAt && (
              <span className="text-[10px] text-[var(--adm-text-muted)]">
                -- Updated {new Date(uploadedAt).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {keywords.length > 0 && (
              <button
                onClick={handleClearData}
                className="flex h-7 items-center gap-1 rounded-md border px-2 text-[10px] text-[var(--adm-text-muted)] hover:border-[var(--adm-danger-text)] hover:text-[var(--adm-danger-text)]"
                style={{ borderColor: "var(--adm-border)" }}
              >
                <RotateCcw className="h-3 w-3" /> Clear
              </button>
            )}
            <button
              onClick={() => { setCsvModalOpen(!csvModalOpen); setPreview(null); setPasteText(""); setParseError(""); }}
              className="flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-[11px] font-medium transition-colors hover:bg-[var(--adm-surface)]"
              style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-secondary)" }}
            >
              <FileSpreadsheet className="h-3 w-3" />
              {keywords.length > 0 ? "Re-import" : "Import CSV"}
            </button>
          </div>
        </div>

        {/* Template download */}
        <div className="flex items-start gap-2 rounded-md px-2.5 py-2" style={{ backgroundColor: "var(--adm-surface)" }}>
          <Info className="mt-0.5 h-3 w-3 flex-shrink-0 text-[var(--adm-text-muted)]" />
          <div className="flex flex-col gap-1">
            <span className="text-[10px] leading-relaxed text-[var(--adm-text-muted)]">
              Expected columns: <strong className="text-[var(--adm-text-secondary)]">Campaign | Ad Group | Keyword | Avg. monthly searches | Top of page bid (low) | Top of page bid (high) | Match type | Landing Page</strong>.
              Paste from Google Sheets or upload a CSV file.
            </span>
            <a
              href="/templates/ppc-keyword-research-template.csv"
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
              onPaste={(e) => {
                setTimeout(() => handleParse(e.currentTarget.value), 50);
              }}
              placeholder="Paste your PPC keyword data here (from Google Sheets or CSV)..."
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
              {keywords.length > 0 && (
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
                    Preview: {preview.length} keywords found
                  </span>
                  <button
                    onClick={handleConfirmImport}
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
                        <th className="px-2 py-1.5 text-left font-semibold text-[var(--adm-text-secondary)]">Campaign</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-[var(--adm-text-secondary)]">Ad Group</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-[var(--adm-text-secondary)]">Keyword</th>
                        <th className="px-2 py-1.5 text-right font-semibold text-[var(--adm-text-secondary)]">Volume</th>
                        <th className="px-2 py-1.5 text-right font-semibold text-[var(--adm-text-secondary)]">CPC Range</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-[var(--adm-text-secondary)]">Match</th>
                        <th className="px-2 py-1.5 text-left font-semibold text-[var(--adm-text-secondary)]">Landing Page</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 15).map((kw, i) => (
                        <tr key={i} className="border-t" style={{ borderColor: "var(--adm-border-30)" }}>
                          <td className="px-2 py-1 text-[var(--adm-text-secondary)]">{kw.campaign}</td>
                          <td className="px-2 py-1 text-[var(--adm-text-secondary)]">{kw.ad_group}</td>
                          <td className="px-2 py-1 font-medium text-[var(--adm-text)]">{kw.keyword}</td>
                          <td className="px-2 py-1 text-right tabular-nums text-[var(--adm-text)]">{kw.avg_monthly_searches.toLocaleString()}</td>
                          <td className="px-2 py-1 text-right tabular-nums text-[var(--adm-text-secondary)]">
                            {kw.top_bid_low > 0 || kw.top_bid_high > 0
                              ? `${fmtCurrency(kw.top_bid_low, currency)} - ${fmtCurrency(kw.top_bid_high, currency)}`
                              : "-"}
                          </td>
                          <td className="px-2 py-1 text-[var(--adm-text-muted)]">{kw.match_type}</td>
                          <td className="max-w-[120px] truncate px-2 py-1 font-mono text-[9px] text-[var(--adm-text-muted)]">{kw.landing_page || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.length > 15 && (
                    <p className="border-t px-2 py-1.5 text-center text-[10px] text-[var(--adm-text-muted)]" style={{ borderColor: "var(--adm-border-30)" }}>
                      ...and {preview.length - 15} more keywords
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Aggregated summary (if data exists) */}
      {keywords.length > 0 && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SummaryCard
              icon={Search}
              label="Keywords"
              value={summary.total_keywords.toLocaleString()}
            />
            <SummaryCard
              icon={BarChart3}
              label="Monthly Searches"
              value={fmtVolume(summary.total_monthly_searches)}
            />
            <SummaryCard
              icon={DollarSign}
              label="Avg. CPC Range"
              value={`${fmtCurrency(summary.avg_cpc_low, currency)} - ${fmtCurrency(summary.avg_cpc_high, currency)}`}
            />
            <SummaryCard
              icon={Globe}
              label="Landing Pages"
              value={summary.pages_targeted.toString()}
            />
          </div>

          {/* By-page breakdown */}
          <div className="flex flex-col gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--adm-text-muted)]">
              Demand by Landing Page
            </span>
            {summary.by_page.map((page, pi) => (
              <PageBreakdown key={pi} page={page} currency={currency} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ================================================================== */
/*  Sub-components                                                     */
/* ================================================================== */

function SummaryCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div
      className="flex flex-col gap-1 rounded-lg border border-[var(--adm-border)] bg-[var(--adm-surface)] px-3 py-2.5"
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-[var(--adm-text-muted)]" />
        <span className="text-[10px] font-medium text-[var(--adm-text-muted)]">{label}</span>
      </div>
      <span className="text-sm font-bold tabular-nums text-[var(--adm-text)]">{value}</span>
    </div>
  );
}

function PageBreakdown({ page, currency }: { page: import("@/lib/types").DemandByPage; currency: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-[var(--adm-border)] bg-[var(--adm-bg)] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[var(--adm-surface)]"
      >
        <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
          <span className="truncate font-mono text-[11px] font-semibold text-[var(--adm-text)]">
            {page.landing_page}
          </span>
          <div className="flex items-center gap-3 text-[10px] text-[var(--adm-text-muted)]">
            <span>{page.keyword_count} keywords</span>
            <span className="text-[var(--adm-text-secondary)]">{page.ad_groups.join(", ")}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs font-bold tabular-nums" style={{ color: "var(--adm-accent-text)" }}>
              {fmtVolume(page.total_volume)}/mo
            </span>
            <span className="text-[10px] tabular-nums text-[var(--adm-text-muted)]">
              {fmtCurrency(page.avg_cpc_low, currency)} - {fmtCurrency(page.avg_cpc_high, currency)} CPC
            </span>
          </div>
          {expanded ? (
            <ChevronUp className="h-3.5 w-3.5 text-[var(--adm-text-muted)]" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-[var(--adm-text-muted)]" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--adm-border-30)]">
          <table className="w-full text-left text-[10px]">
            <thead>
              <tr className="border-b border-[var(--adm-border-30)] bg-[var(--adm-surface)]">
                <th className="px-3 py-1.5 font-semibold text-[var(--adm-text-muted)]">Keyword</th>
                <th className="px-3 py-1.5 font-semibold text-[var(--adm-text-muted)] text-right">Volume</th>
                <th className="px-3 py-1.5 font-semibold text-[var(--adm-text-muted)] text-right">CPC Low</th>
                <th className="px-3 py-1.5 font-semibold text-[var(--adm-text-muted)] text-right">CPC High</th>
                <th className="px-3 py-1.5 font-semibold text-[var(--adm-text-muted)]">Match</th>
                <th className="px-3 py-1.5 font-semibold text-[var(--adm-text-muted)]">Ad Group</th>
              </tr>
            </thead>
            <tbody>
              {page.keywords.map((kw, ki) => (
                <tr key={ki} className="border-b border-[var(--adm-border-30)] last:border-b-0">
                  <td className="px-3 py-1.5 font-medium text-[var(--adm-text)]">{kw.keyword}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-[var(--adm-text)]">{kw.avg_monthly_searches.toLocaleString()}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-[var(--adm-text-secondary)]">{fmtCurrency(kw.top_bid_low, currency)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-[var(--adm-text-secondary)]">{fmtCurrency(kw.top_bid_high, currency)}</td>
                  <td className="px-3 py-1.5 text-[var(--adm-text-muted)]">{kw.match_type}</td>
                  <td className="px-3 py-1.5 text-[var(--adm-text-muted)]">{kw.ad_group}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
