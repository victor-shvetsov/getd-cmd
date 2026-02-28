"use client";

import {
  ReactFlow,
  Background,
  Controls,
  type NodeTypes,
  type NodeProps,
  type Node,
  BackgroundVariant,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { MAP_NODES, MAP_EDGES, STATUS_CONFIG, type MapNodeData } from "@/lib/project-map-data";

// ── Custom node ────────────────────────────────────────────────────────────

function MapNode({ data, selected }: NodeProps<Node<MapNodeData>>) {
  const status = STATUS_CONFIG[data.status];

  return (
    <div
      style={{
        width: 240,
        backgroundColor: "var(--adm-surface)",
        border: `1.5px solid ${selected ? status.color : "var(--adm-border)"}`,
        borderRadius: 12,
        padding: "14px 16px",
        boxShadow: selected
          ? `0 0 0 3px ${status.color}33`
          : "0 2px 8px rgba(0,0,0,0.12)",
        cursor: "default",
        transition: "border-color 0.15s, box-shadow 0.15s",
      }}
    >
      {/* Status badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          padding: "2px 8px",
          borderRadius: 99,
          backgroundColor: status.bg,
          marginBottom: 10,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: status.color,
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            color: status.color,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {status.label}
        </span>
      </div>

      {/* Title */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 18, lineHeight: 1 }}>{data.icon}</span>
        <span
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "var(--adm-text)",
            lineHeight: 1.2,
          }}
        >
          {data.label}
        </span>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: 11,
          color: "var(--adm-text-muted)",
          lineHeight: 1.5,
          margin: "0 0 10px 0",
        }}
      >
        {data.description}
      </p>

      {/* Sub-nodes */}
      <div
        style={{
          borderTop: "1px solid var(--adm-border)",
          paddingTop: 8,
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
        }}
      >
        {data.subNodes.map((name) => (
          <span
            key={name}
            style={{
              fontSize: 10,
              padding: "2px 6px",
              borderRadius: 4,
              backgroundColor: "var(--adm-surface-2)",
              color: "var(--adm-text-secondary)",
              border: "1px solid var(--adm-border)",
            }}
          >
            {name}
          </span>
        ))}
      </div>

      {/* Issues warning */}
      {data.issues && data.issues.length > 0 && (
        <div
          style={{
            marginTop: 8,
            padding: "5px 8px",
            borderRadius: 6,
            backgroundColor: "rgba(220,38,38,0.08)",
            border: "1px solid rgba(220,38,38,0.2)",
          }}
        >
          <p style={{ fontSize: 10, color: "#dc2626", margin: 0, fontWeight: 600 }}>
            ⚠ {data.issues.length} known issue{data.issues.length > 1 ? "s" : ""}
          </p>
        </div>
      )}

      {/* Skill badge */}
      {data.skill && (
        <div
          style={{
            marginTop: 8,
            padding: "3px 8px",
            borderRadius: 6,
            backgroundColor: "rgba(0,200,83,0.08)",
            border: "1px solid rgba(0,200,83,0.2)",
            display: "inline-block",
          }}
        >
          <span style={{ fontSize: 10, color: "#00c853", fontWeight: 600 }}>
            {data.skill}
          </span>
        </div>
      )}
    </div>
  );
}

const nodeTypes: NodeTypes = { mapNode: MapNode };

// ── Main component ─────────────────────────────────────────────────────────

export function ProjectMapView({ theme }: { theme: "light" | "dark" }) {
  const isDark = theme === "dark";

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <ReactFlow
        nodes={MAP_NODES}
        edges={MAP_EDGES}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        defaultEdgeOptions={{
          style: {
            stroke: isDark ? "#3a3a3a" : "#c5c8c8",
            strokeWidth: 1.5,
          },
          labelStyle: {
            fill: isDark ? "#a3a3a3" : "#737373",
            fontSize: 10,
            fontWeight: 500,
          },
          labelBgStyle: {
            fill: isDark ? "#141414" : "#ffffff",
            fillOpacity: 0.85,
          },
          labelBgPadding: [4, 6] as [number, number],
          labelBgBorderRadius: 4,
          markerEnd: {
            type: "arrowclosed" as const,
            color: isDark ? "#3a3a3a" : "#c5c8c8",
            width: 14,
            height: 14,
          },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1}
          color={isDark ? "#262626" : "#e0e0e0"}
        />
        <Controls
          style={{
            backgroundColor: "var(--adm-surface)",
            border: "1px solid var(--adm-border)",
            borderRadius: 8,
          }}
        />
      </ReactFlow>
    </div>
  );
}
