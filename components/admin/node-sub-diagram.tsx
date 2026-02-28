"use client";

import {
  ReactFlow,
  Handle,
  Position,
  type NodeTypes,
  type NodeProps,
  type Node,
  BackgroundVariant,
  Background,
} from "@xyflow/react";
import { SUB_NODE_TYPE_CONFIG, type SubNodeData } from "@/lib/project-map-data";
import type { NodeLevel2 } from "@/lib/project-map-data";

// ── Sub-node card ──────────────────────────────────────────────────────────

function SubNode({ data, selected }: NodeProps<Node<SubNodeData>>) {
  const cfg = SUB_NODE_TYPE_CONFIG[data.type];
  const clickable = !!data.details;

  return (
    <>
      <Handle type="target" position={Position.Top}   style={{ opacity: 0, pointerEvents: "none", width: 4, height: 4 }} />
      <Handle type="target" position={Position.Left}  style={{ opacity: 0, pointerEvents: "none", width: 4, height: 4 }} />
      <div
        title={data.hint ?? (clickable ? "Click to inspect" : undefined)}
        style={{
          padding: "5px 10px",
          borderRadius: 6,
          border: `1.5px solid ${selected ? cfg.color : cfg.color + "44"}`,
          backgroundColor: selected ? cfg.color + "22" : cfg.bg,
          borderLeft: `3px solid ${cfg.color}`,
          fontSize: 10,
          fontWeight: 600,
          color: "var(--adm-text)",
          whiteSpace: "nowrap",
          cursor: clickable ? "pointer" : (data.hint ? "help" : "default"),
          minWidth: 80,
          boxShadow: selected ? `0 0 0 2px ${cfg.color}44` : undefined,
          transition: "border-color 0.12s, background-color 0.12s",
        }}
      >
        {data.label}
        {clickable && (
          <span style={{ marginLeft: 4, fontSize: 8, opacity: 0.6 }}>▸</span>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none", width: 4, height: 4 }} />
      <Handle type="source" position={Position.Right}  style={{ opacity: 0, pointerEvents: "none", width: 4, height: 4 }} />
    </>
  );
}

const subNodeTypes: NodeTypes = { subNode: SubNode };

// ── Type legend ────────────────────────────────────────────────────────────

const LEGEND_ITEMS = [
  { type: "api-route"        as const, label: "API route" },
  { type: "ui-component"     as const, label: "UI" },
  { type: "db-table"         as const, label: "DB table" },
  { type: "external-service" as const, label: "External" },
  { type: "lib-file"         as const, label: "Lib file" },
  { type: "concept"          as const, label: "Concept" },
];

// ── Main component ─────────────────────────────────────────────────────────

export function NodeSubDiagram({
  level2,
  theme,
  selectedSubId,
  onSubNodeClick,
}: {
  level2: NodeLevel2;
  theme: "light" | "dark";
  selectedSubId?: string | null;
  onSubNodeClick?: (id: string) => void;
}) {
  const isDark = theme === "dark";

  const nodes = level2.subNodes.map((n) => ({
    ...n,
    selected: n.id === selectedSubId,
  }));

  return (
    <div>
      {/* Legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "5px 12px", marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--adm-border)" }}>
        {LEGEND_ITEMS.map((item) => {
          const cfg = SUB_NODE_TYPE_CONFIG[item.type];
          return (
            <div key={item.type} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: cfg.color, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: "var(--adm-text-muted)" }}>{item.label}</span>
            </div>
          );
        })}
        <span style={{ fontSize: 10, color: "var(--adm-text-muted)", marginLeft: "auto" }}>▸ = clickable</span>
      </div>

      {/* React Flow diagram */}
      <div style={{ height: 280, borderRadius: 8, border: "1px solid var(--adm-border)", overflow: "hidden" }}>
        <ReactFlow
          nodes={nodes}
          edges={level2.subEdges.map((e) => ({
            ...e,
            style: { stroke: isDark ? "#3a3a3a" : "#c5c8c8", strokeWidth: 1.5 },
            labelStyle: { fill: isDark ? "#a3a3a3" : "#737373", fontSize: 9, fontWeight: 500 },
            labelBgStyle: { fill: isDark ? "#141414" : "#ffffff", fillOpacity: 0.9 },
            labelBgPadding: [3, 5] as [number, number],
            labelBgBorderRadius: 3,
            markerEnd: { type: "arrowclosed" as const, color: isDark ? "#4a4a4a" : "#b5b8b8", width: 10, height: 10 },
          }))}
          nodeTypes={subNodeTypes}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={true}
          onNodeClick={(_, node) => {
            if (node.data.details && onSubNodeClick) {
              onSubNodeClick(node.id);
            }
          }}
          panOnDrag={true}
          zoomOnScroll={false}
          zoomOnPinch={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color={isDark ? "#222" : "#e8e8e8"} />
        </ReactFlow>
      </div>
      <p style={{ fontSize: 10, color: "var(--adm-text-muted)", marginTop: 5 }}>
        Hover for file path · Click ▸ nodes to inspect · Pan to explore
      </p>
    </div>
  );
}
