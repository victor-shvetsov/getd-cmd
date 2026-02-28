"use client";

import { X, FileCode, AlertTriangle, CheckCircle2, Wrench, Clock, ArrowLeft } from "lucide-react";
import { NodeSubDiagram } from "@/components/admin/node-sub-diagram";
import { STATUS_CONFIG, type MapNodeData, type SubNodeDetail } from "@/lib/project-map-data";

// ── Shared section heading ─────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--adm-text-muted)", marginBottom: 8 }}>
        {label}
      </p>
      {children}
    </div>
  );
}

function BulletList({ items, color = "var(--adm-text-secondary)", icon }: { items: string[]; color?: string; icon?: React.ReactNode }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 5 }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <span style={{ flexShrink: 0, marginTop: 2, color }}>{icon ?? "·"}</span>
          <span style={{ fontSize: 12, color: "var(--adm-text-secondary)", lineHeight: 1.5 }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function FileList({ files }: { files: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {files.map((f) => (
        <div key={f} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 9px", borderRadius: 6, backgroundColor: "var(--adm-surface)", border: "1px solid var(--adm-border)" }}>
          <FileCode style={{ width: 11, height: 11, color: "var(--adm-text-muted)", flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--adm-text-secondary)" }}>{f}</span>
        </div>
      ))}
    </div>
  );
}

function IssueBlock({ issues }: { issues: string[] }) {
  return (
    <div style={{ marginBottom: 20, padding: "10px 12px", borderRadius: 8, backgroundColor: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.2)" }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#dc2626", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>⚠ Known Issues</p>
      <ul style={{ padding: 0, margin: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 4 }}>
        {issues.map((issue, i) => (
          <li key={i} style={{ fontSize: 11, color: "#dc2626", display: "flex", gap: 6, alignItems: "flex-start" }}>
            <AlertTriangle style={{ width: 11, height: 11, flexShrink: 0, marginTop: 2 }} />
            {issue}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Sub-node detail view ───────────────────────────────────────────────────

function SubNodeDetailView({
  label,
  detail,
  onBack,
  parentLabel,
}: {
  label: string;
  detail: SubNodeDetail;
  onBack: () => void;
  parentLabel: string;
}) {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      {/* Breadcrumb header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface)", flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--adm-text-muted)", background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 8 }}
        >
          <ArrowLeft style={{ width: 12, height: 12 }} />
          {parentLabel}
        </button>
        <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--adm-text)", margin: 0 }}>{label}</h2>
        <p style={{ fontSize: 11, color: "var(--adm-text-muted)", margin: "3px 0 0 0", lineHeight: 1.4 }}>{detail.description}</p>

        {/* Skill badge */}
        {detail.skill && (
          <div style={{ marginTop: 8, display: "inline-block", padding: "3px 9px", borderRadius: 99, backgroundColor: "rgba(0,200,83,0.1)", border: "1px solid rgba(0,200,83,0.25)", fontSize: 10, fontWeight: 700, color: "#00c853" }}>
            {detail.skill}
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {detail.issues && detail.issues.length > 0 && <IssueBlock issues={detail.issues} />}

        <Section label="Target state">
          <BulletList items={detail.targetState} color="#00c853" icon={<CheckCircle2 style={{ width: 11, height: 11 }} />} />
        </Section>

        <Section label="Current plan">
          <BulletList items={detail.plan} color="#f59e0b" icon={<Wrench style={{ width: 11, height: 11 }} />} />
        </Section>

        <Section label="Key files">
          <FileList files={detail.keyFiles} />
        </Section>

        {detail.changelog && detail.changelog.length > 0 && (
          <Section label="Changelog">
            <BulletList items={detail.changelog} color="var(--adm-text-muted)" icon={<Clock style={{ width: 11, height: 11 }} />} />
          </Section>
        )}
      </div>
    </div>
  );
}

// ── Main panel ─────────────────────────────────────────────────────────────

export function NodeDetailPanel({
  data,
  onClose,
  theme,
  selectedSubId,
  onSubNodeSelect,
}: {
  data: MapNodeData;
  onClose: () => void;
  theme: "light" | "dark";
  selectedSubId: string | null;
  onSubNodeSelect: (id: string | null) => void;
}) {
  const status = STATUS_CONFIG[data.status];
  const l2 = data.level2;

  // Find the selected sub-node's data (if any)
  const selectedSubNode = selectedSubId
    ? l2.subNodes.find((n) => n.id === selectedSubId)
    : null;

  // If a sub-node with details is selected, show its detail view
  if (selectedSubNode?.data.details) {
    return (
      <SubNodeDetailView
        label={selectedSubNode.data.label}
        detail={selectedSubNode.data.details}
        onBack={() => onSubNodeSelect(null)}
        parentLabel={data.label}
      />
    );
  }

  // ── Level 1 node detail ────────────────────────────────────────────────

  // Helper: find a sub-node by label match (for clicking chips on L1 card)
  const findSubNodeByLabel = (label: string) =>
    l2.subNodes.find((n) => n.data.label === label && n.data.details);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", backgroundColor: "var(--adm-bg)" }}>
      {/* Panel header */}
      <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--adm-border)", backgroundColor: "var(--adm-surface)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22, lineHeight: 1 }}>{data.icon}</span>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--adm-text)", margin: 0 }}>{data.label}</h2>
              <p style={{ fontSize: 11, color: "var(--adm-text-muted)", margin: "2px 0 0 0" }}>{data.description}</p>
            </div>
          </div>
          <button onClick={onClose} style={{ padding: 4, borderRadius: 6, border: "1px solid var(--adm-border)", backgroundColor: "transparent", cursor: "pointer", color: "var(--adm-text-muted)", flexShrink: 0 }}>
            <X style={{ width: 14, height: 14 }} />
          </button>
        </div>

        {/* Status + skill badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 99, backgroundColor: status.bg, fontSize: 10, fontWeight: 700, color: status.color, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: status.color, flexShrink: 0 }} />
            {status.label}
          </span>
          {data.skill && (
            <span style={{ padding: "3px 9px", borderRadius: 99, backgroundColor: "rgba(0,200,83,0.1)", border: "1px solid rgba(0,200,83,0.25)", fontSize: 10, fontWeight: 700, color: "#00c853" }}>
              {data.skill}
            </span>
          )}
        </div>

        {/* Clickable sub-node chips */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
          {data.subNodes.map((name) => {
            const match = findSubNodeByLabel(name);
            const clickable = !!match;
            return (
              <button
                key={name}
                onClick={() => match && onSubNodeSelect(match.id)}
                disabled={!clickable}
                style={{
                  fontSize: 10,
                  padding: "3px 8px",
                  borderRadius: 5,
                  border: `1px solid ${clickable ? "var(--adm-border)" : "var(--adm-border)"}`,
                  backgroundColor: clickable ? "var(--adm-surface-2)" : "var(--adm-surface-2)",
                  color: clickable ? "var(--adm-text)" : "var(--adm-text-muted)",
                  cursor: clickable ? "pointer" : "default",
                  transition: "opacity 0.12s",
                  opacity: clickable ? 1 : 0.6,
                }}
                title={clickable ? `Inspect ${name}` : undefined}
              >
                {name}{clickable ? " ▸" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
        {data.issues && data.issues.length > 0 && <IssueBlock issues={data.issues} />}

        <Section label="Sub-diagram — internal wiring">
          <NodeSubDiagram
            level2={l2}
            theme={theme}
            selectedSubId={selectedSubId}
            onSubNodeClick={onSubNodeSelect}
          />
        </Section>

        <Section label="Target state — definition of done">
          <BulletList items={l2.targetState} color="#00c853" icon={<CheckCircle2 style={{ width: 11, height: 11 }} />} />
        </Section>

        <Section label="Current plan">
          <BulletList items={l2.plan} color="#f59e0b" icon={<Wrench style={{ width: 11, height: 11 }} />} />
        </Section>

        <Section label="Key files">
          <FileList files={data.keyFiles} />
        </Section>

        <Section label="Changelog">
          <BulletList items={l2.changelog} color="var(--adm-text-muted)" icon={<Clock style={{ width: 11, height: 11 }} />} />
        </Section>
      </div>
    </div>
  );
}
