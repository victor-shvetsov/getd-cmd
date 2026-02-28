"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ProjectMapView } from "@/components/admin/project-map-view";
import { NodeDetailPanel } from "@/components/admin/node-detail-panel";
import { useAdminTheme } from "@/components/admin/admin-theme-toggle";
import { AdminThemeToggle } from "@/components/admin/admin-theme-toggle";
import { STATUS_CONFIG, MAP_NODES } from "@/lib/project-map-data";
import type { NodeStatus, MapNodeData } from "@/lib/project-map-data";

const TOKEN_KEY = "admin_token";

export function MapPageClient() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const { theme, toggle } = useAdminTheme();

  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (!saved) { router.push("/admin"); return; }
    setReady(true);
    fetch("/api/admin/auth", { headers: { Authorization: `Bearer ${saved}` } }).then((res) => {
      if (!res.ok) { sessionStorage.removeItem(TOKEN_KEY); router.push("/admin"); }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedData = useMemo(
    () => MAP_NODES.find((n) => n.id === selectedId)?.data as MapNodeData | undefined,
    [selectedId]
  );

  if (!ready) {
    return (
      <div className={`admin-${theme}`}>
        <div className="flex min-h-dvh items-center justify-center" style={{ backgroundColor: "var(--adm-bg)" }}>
          <div className="h-5 w-5 animate-spin rounded-full border-2" style={{ borderColor: "var(--adm-accent)", borderTopColor: "transparent" }} />
        </div>
      </div>
    );
  }

  const statuses: NodeStatus[] = ["done", "in-progress", "planned", "broken"];
  const HEADER_H = 53;

  return (
    <div className={`admin-${theme}`} style={{ backgroundColor: "var(--adm-bg)", color: "var(--adm-text)", display: "flex", flexDirection: "column", height: "100dvh" }}>

      {/* ── Header ── */}
      <header
        className="flex items-center justify-between border-b px-5"
        style={{ height: HEADER_H, flexShrink: 0, borderColor: "var(--adm-border)", backgroundColor: "var(--adm-surface)" }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin")}
            className="flex h-8 w-8 items-center justify-center rounded-lg border transition-colors hover:opacity-80"
            style={{ borderColor: "var(--adm-border)", color: "var(--adm-text-secondary)" }}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-sm font-bold tracking-tight">Project Wiring Diagram</h1>
            <p className="text-xs" style={{ color: "var(--adm-text-muted)" }}>
              Level 1 — 6 nodes · {selectedId ? "Click node again or canvas to close panel" : "Click a node to inspect"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Legend */}
          <div className="flex items-center gap-3">
            {statuses.map((s) => {
              const cfg = STATUS_CONFIG[s];
              return (
                <div key={s} className="flex items-center gap-1.5">
                  <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: cfg.color, flexShrink: 0 }} />
                  <span className="text-xs" style={{ color: "var(--adm-text-muted)" }}>{cfg.label}</span>
                </div>
              );
            })}
          </div>
          <div className="h-4 w-px" style={{ backgroundColor: "var(--adm-border)" }} />
          <AdminThemeToggle theme={theme} toggle={toggle} />
        </div>
      </header>

      {/* ── Body: map + optional detail panel ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Map canvas */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <ProjectMapView
            theme={theme}
            selectedId={selectedId}
            onNodeSelect={(id) => { setSelectedId(id); setSelectedSubId(null); }}
          />
        </div>

        {/* Detail panel — slides in when a node is selected */}
        {selectedData && (
          <div
            style={{
              width: 400,
              flexShrink: 0,
              borderLeft: "1px solid var(--adm-border)",
              overflowY: "auto",
              backgroundColor: "var(--adm-bg)",
            }}
          >
            <NodeDetailPanel
              data={selectedData}
              onClose={() => { setSelectedId(null); setSelectedSubId(null); }}
              theme={theme}
              selectedSubId={selectedSubId}
              onSubNodeSelect={setSelectedSubId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
