"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  Activity,
  Brain,
  Sparkles,
  AlertOctagon,
  Lightbulb,
} from "lucide-react";
import type { ClientHealth, CheckResult } from "@/lib/health-checks";
import type { DeepReviewResult, DeepReviewFinding } from "@/app/api/admin/health/deep-review/route";
import { AdminThemeToggle } from "./admin-theme-toggle";

interface HealthCheckProps {
  token: string;
  onBack: () => void;
  theme: "light" | "dark";
  toggleTheme: () => void;
}

function StatusIcon({ status }: { status: CheckResult["status"] }) {
  if (status === "pass") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "warn") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex h-24 w-24 items-center justify-center">
      <svg className="absolute h-full w-full -rotate-90" viewBox="0 0 80 80">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="var(--adm-border)"
          strokeWidth="6"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span className="text-xl font-bold" style={{ color }}>{score}</span>
    </div>
  );
}

const GRADE_COLORS: Record<string, string> = {
  A: "#10b981",
  B: "#22c55e",
  C: "#f59e0b",
  D: "#f97316",
  F: "#ef4444",
};

function SeverityIcon({ severity }: { severity: DeepReviewFinding["severity"] }) {
  if (severity === "critical") return <AlertOctagon className="h-4 w-4 text-red-500" />;
  if (severity === "warning") return <AlertTriangle className="h-4 w-4 text-amber-500" />;
  return <Lightbulb className="h-4 w-4 text-blue-400" />;
}

function ClientCard({ health, token }: { health: ClientHealth; token: string }) {
  const [expanded, setExpanded] = useState(false);
  const [deepReview, setDeepReview] = useState<DeepReviewResult | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);

  const passes = health.checks.filter((c) => c.status === "pass").length;
  const warns = health.checks.filter((c) => c.status === "warn").length;
  const fails = health.checks.filter((c) => c.status === "fail").length;

  // Group checks by category
  const groups: Record<string, CheckResult[]> = {};
  for (const check of health.checks) {
    const cat = check.category ?? check.id.split(".")[0];
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(check);
  }

  const handleDeepReview = async () => {
    setReviewLoading(true);
    setReviewError(null);
    try {
      const res = await fetch("/api/admin/health/deep-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ client_id: health.clientId }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Review failed");
      }
      const result: DeepReviewResult = await res.json();
      setDeepReview(result);
      setShowReview(true);
    } catch (err) {
      setReviewError((err as Error).message);
    } finally {
      setReviewLoading(false);
    }
  };

  return (
    <div
      className="rounded-xl border transition-all"
      style={{
        borderColor: "var(--adm-border)",
        backgroundColor: "var(--adm-surface)",
        boxShadow: "var(--adm-shadow)",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-4 p-4 text-left"
      >
        <ScoreRing score={health.score} />

        <div className="flex-1">
          <h3 className="text-sm font-semibold" style={{ color: "var(--adm-text)" }}>
            {health.clientName}
          </h3>
          <p className="text-xs" style={{ color: "var(--adm-text-muted)" }}>
            /{health.slug}
          </p>

          <div className="mt-2 flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-emerald-500">
              <CheckCircle2 className="h-3 w-3" /> {passes}
            </span>
            <span className="flex items-center gap-1 text-xs text-amber-500">
              <AlertTriangle className="h-3 w-3" /> {warns}
            </span>
            {fails > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-500">
                <XCircle className="h-3 w-3" /> {fails}
              </span>
            )}
          </div>
        </div>

        <ChevronDown
          className={`h-5 w-5 transition-transform ${expanded ? "rotate-180" : ""}`}
          style={{ color: "var(--adm-text-muted)" }}
        />
      </button>

      {/* Detail panel */}
      {expanded && (
        <div className="border-t px-4 pb-4 pt-3" style={{ borderColor: "var(--adm-border)" }}>
          <div className="flex flex-col gap-4">
            {Object.entries(groups).map(([groupName, checks]) => (
              <div key={groupName}>
                <h4
                  className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ color: "var(--adm-text-muted)" }}
                >
                  {groupName}
                </h4>
                <div className="flex flex-col gap-1">
                  {checks.map((check) => (
                    <div
                      key={check.id}
                      className="flex items-start gap-2 rounded-lg px-2.5 py-1.5"
                      style={{ backgroundColor: "var(--adm-surface-2)" }}
                    >
                      <StatusIcon status={check.status} />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-medium" style={{ color: "var(--adm-text)" }}>
                          {check.label}
                        </span>
                        <p
                          className="text-[11px] leading-relaxed"
                          style={{ color: "var(--adm-text-muted)" }}
                        >
                          {check.details}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Deep Review Section */}
            <div
              className="mt-2 rounded-lg border p-3"
              style={{
                borderColor: deepReview ? GRADE_COLORS[deepReview.overallGrade] + "40" : "var(--adm-border)",
                backgroundColor: "var(--adm-surface)",
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4" style={{ color: "var(--adm-accent)" }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--adm-text)" }}>
                    AI Deep Review
                  </span>
                  {deepReview && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                      style={{ backgroundColor: GRADE_COLORS[deepReview.overallGrade] }}
                    >
                      Grade: {deepReview.overallGrade}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {deepReview && (
                    <button
                      onClick={() => setShowReview(!showReview)}
                      className="text-[11px] font-medium"
                      style={{ color: "var(--adm-accent)" }}
                    >
                      {showReview ? "Hide" : "Show"} findings
                    </button>
                  )}
                  <button
                    onClick={handleDeepReview}
                    disabled={reviewLoading}
                    className="flex h-7 items-center gap-1.5 rounded-lg px-3 text-[11px] font-medium text-white transition-all disabled:opacity-50"
                    style={{ backgroundColor: "var(--adm-accent)" }}
                  >
                    {reviewLoading ? (
                      <>
                        <Sparkles className="h-3 w-3 animate-pulse" />
                        Reviewing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        {deepReview ? "Re-review" : "Run Deep Review"}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {reviewError && (
                <p className="mt-2 text-xs text-red-500">{reviewError}</p>
              )}

              {deepReview && showReview && (
                <div className="mt-3 flex flex-col gap-3">
                  {/* Summary */}
                  <p className="text-xs leading-relaxed" style={{ color: "var(--adm-text-secondary)" }}>
                    {deepReview.summary}
                  </p>

                  {/* Findings grouped by category */}
                  {(() => {
                    const findingGroups: Record<string, DeepReviewFinding[]> = {};
                    for (const f of deepReview.findings) {
                      if (!findingGroups[f.category]) findingGroups[f.category] = [];
                      findingGroups[f.category].push(f);
                    }
                    return Object.entries(findingGroups).map(([cat, findings]) => (
                      <div key={cat}>
                        <h5
                          className="mb-1 text-[11px] font-semibold uppercase tracking-wider"
                          style={{ color: "var(--adm-text-muted)" }}
                        >
                          {cat}
                        </h5>
                        <div className="flex flex-col gap-1.5">
                          {findings.map((finding, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 rounded-lg px-2.5 py-2"
                              style={{ backgroundColor: "var(--adm-surface-2)" }}
                            >
                              <SeverityIcon severity={finding.severity} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium" style={{ color: "var(--adm-text)" }}>
                                    {finding.title}
                                  </span>
                                  {finding.affectedTab && (
                                    <span
                                      className="rounded px-1.5 py-0.5 text-[10px] font-medium"
                                      style={{
                                        backgroundColor: "var(--adm-surface)",
                                        color: "var(--adm-text-muted)",
                                        border: "1px solid var(--adm-border)",
                                      }}
                                    >
                                      {finding.affectedTab}
                                    </span>
                                  )}
                                </div>
                                <p
                                  className="mt-0.5 text-[11px] leading-relaxed"
                                  style={{ color: "var(--adm-text-muted)" }}
                                >
                                  {finding.details}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}

                  {deepReview.findings.length === 0 && (
                    <p className="text-center text-xs" style={{ color: "var(--adm-text-muted)" }}>
                      No issues found -- project looks great.
                    </p>
                  )}

                  <p className="text-right text-[10px]" style={{ color: "var(--adm-text-muted)" }}>
                    Reviewed {new Date(deepReview.reviewedAt).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function HealthCheck({ token, onBack, theme, toggleTheme }: HealthCheckProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  const authFetcher = useCallback(
    (url: string) =>
      fetch(url, { headers: { Authorization: `Bearer ${token}` } }).then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      }),
    [token]
  );

  const { data, isValidating, mutate } = useSWR<ClientHealth[]>(
    [`/api/admin/health`, refreshKey],
    ([url]) => authFetcher(url as string),
    { revalidateOnFocus: false }
  );

  const handleRefresh = () => {
    setRefreshKey((k) => k + 1);
    mutate();
  };

  // Aggregate stats
  const totalClients = data?.length ?? 0;
  const avgScore = totalClients > 0
    ? Math.round((data!.reduce((s, c) => s + c.score, 0)) / totalClients)
    : 0;
  const totalFails = data?.reduce(
    (s, c) => s + c.checks.filter((ch) => ch.status === "fail").length,
    0
  ) ?? 0;
  const totalWarns = data?.reduce(
    (s, c) => s + c.checks.filter((ch) => ch.status === "warn").length,
    0
  ) ?? 0;

  return (
    <div className="min-h-dvh" style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text)" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface)" }}>
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
              style={{ color: "var(--adm-text-secondary)" }}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4" style={{ color: "var(--adm-accent)" }} />
                <h1 className="text-base font-semibold">Project Health</h1>
              </div>
              <p className="text-xs" style={{ color: "var(--adm-text-muted)" }}>
                Diagnostics across all clients
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <AdminThemeToggle theme={theme} toggle={toggleTheme} />
            <button
              onClick={handleRefresh}
              disabled={isValidating}
              className="flex h-8 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors disabled:opacity-50"
              style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-secondary)" }}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isValidating ? "animate-spin" : ""}`} />
              {isValidating ? "Scanning..." : "Re-scan"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* Summary bar */}
        {data && (
          <div
            className="mb-6 grid grid-cols-4 gap-3 rounded-xl border p-4"
            style={{ borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
          >
            <div className="text-center">
              <p className="text-2xl font-bold" style={{ color: "var(--adm-text)" }}>
                {totalClients}
              </p>
              <p className="text-[11px]" style={{ color: "var(--adm-text-muted)" }}>
                Clients
              </p>
            </div>
            <div className="text-center">
              <p
                className="text-2xl font-bold"
                style={{
                  color: avgScore >= 80 ? "#10b981" : avgScore >= 50 ? "#f59e0b" : "#ef4444",
                }}
              >
                {avgScore}%
              </p>
              <p className="text-[11px]" style={{ color: "var(--adm-text-muted)" }}>
                Avg Score
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-500">{totalWarns}</p>
              <p className="text-[11px]" style={{ color: "var(--adm-text-muted)" }}>
                Warnings
              </p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-red-500">{totalFails}</p>
              <p className="text-[11px]" style={{ color: "var(--adm-text-muted)" }}>
                Failures
              </p>
            </div>
          </div>
        )}

        {/* Loading */}
        {!data && isValidating && (
          <div className="flex flex-col items-center gap-3 py-16">
            <RefreshCw className="h-6 w-6 animate-spin" style={{ color: "var(--adm-accent)" }} />
            <p className="text-sm" style={{ color: "var(--adm-text-muted)" }}>
              Running health checks across all clients...
            </p>
          </div>
        )}

        {/* Client cards */}
        {data && (
          <div className="flex flex-col gap-3">
            {data
              .sort((a, b) => a.score - b.score) // worst first
              .map((health) => (
                <ClientCard key={health.clientId} health={health} token={token} />
              ))}
          </div>
        )}
      </main>
    </div>
  );
}
