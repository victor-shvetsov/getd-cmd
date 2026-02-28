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

function SubNode({ data }: NodeProps<Node<SubNodeData>>) {
  const cfg = SUB_NODE_TYPE_CONFIG[data.type];

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        style={{ opacity: 0, pointerEvents: "none", width: 4, height: 4 }}
      />
      <Handle
        type="target"
        position={Position.Left}
        style={{ opacity: 0, pointerEvents: "none", width: 4, height: 4 }}
      />
      <div
        title={data.hint}
        style={{
          padding: "5px 10px",
          borderRadius: 6,
          border: `1.5px solid ${cfg.color}44`,
          backgroundColor: cfg.bg,
          borderLeft: `3px solid ${cfg.color}`,
          fontSize: 10,
          fontWeight: 600,
          color: "var(--adm-text)",
          whiteSpace: "nowrap",
          cursor: data.hint ? "help" : "default",
          minWidth: 80,
        }}
      >
        {data.label}
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        style={{ opacity: 0, pointerEvents: "none", width: 4, height: 4 }}
      />
      <Handle
        type="source"
        position={Position.Right}
        style={{ opacity: 0, pointerEvents: "none", width: 4, height: 4 }}
      />
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
}: {
  level2: NodeLevel2;
  theme: "light" | "dark";
}) {
  const isDark = theme === "dark";

  return (
    <div>
      {/* Legend */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px 12px",
          marginBottom: 8,
          paddingBottom: 8,
          borderBottom: "1px solid var(--adm-border)",
        }}
      >
        {LEGEND_ITEMS.map((item) => {
          const cfg = SUB_NODE_TYPE_CONFIG[item.type];
          return (
            <div key={item.type} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: cfg.color,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 10, color: "var(--adm-text-muted)" }}>{item.label}</span>
            </div>
          );
        })}
      </div>

      {/* React Flow diagram */}
      <div
        style={{
          height: 280,
          borderRadius: 8,
          border: "1px solid var(--adm-border)",
          overflow: "hidden",
        }}
      >
        <ReactFlow
          nodes={level2.subNodes}
          edges={level2.subEdges.map((e) => ({
            ...e,
            style: { stroke: isDark ? "#3a3a3a" : "#c5c8c8", strokeWidth: 1.5 },
            labelStyle: { fill: isDark ? "#a3a3a3" : "#737373", fontSize: 9, fontWeight: 500 },
            labelBgStyle: { fill: isDark ? "#141414" : "#ffffff", fillOpacity: 0.9 },
            labelBgPadding: [3, 5] as [number, number],
            labelBgBorderRadius: 3,
            markerEnd: {
              type: "arrowclosed" as const,
              color: isDark ? "#4a4a4a" : "#b5b8b8",
              width: 10,
              height: 10,
            },
          }))}
          nodeTypes={subNodeTypes}
          fitView
          fitViewOptions={{ padding: 0.12 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnDrag={true}
          zoomOnScroll={false}
          zoomOnPinch={false}
          proOptions={{ hideAttribution: true }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color={isDark ? "#222" : "#e8e8e8"}
          />
        </ReactFlow>
      </div>
      <p style={{ fontSize: 10, color: "var(--adm-text-muted)", marginTop: 5 }}>
        Hover a node for file path · Pan to explore
      </p>
    </div>
  );
}
