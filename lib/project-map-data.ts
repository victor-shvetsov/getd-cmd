/**
 * Project wiring diagram — Level 1 data.
 * Consumed by the React Flow map in /admin/map.
 * Keep in sync with PROJECT_MAP.md.
 */

import type { Node, Edge } from "@xyflow/react";

export type NodeStatus = "done" | "in-progress" | "planned" | "broken";

export interface MapNodeData extends Record<string, unknown> {
  label: string;
  icon: string;
  description: string;
  status: NodeStatus;
  subNodes: string[];
  keyFiles: string[];
  skill?: string;
  issues?: string[];
}

// ── Nodes ──────────────────────────────────────────────────────────────────

export const MAP_NODES: Node<MapNodeData>[] = [
  {
    id: "auth",
    type: "mapNode",
    position: { x: 370, y: 0 },
    data: {
      label: "Auth",
      icon: "🔐",
      description: "Client PIN login · Admin Bearer token",
      status: "planned",
      subNodes: ["Client PIN", "Admin Bearer Token"],
      keyFiles: ["lib/admin-auth.ts", "app/api/verify-pin/route.ts"],
      issues: ["PINs stored plaintext", "No rate limiting", "Admin token is base64"],
    },
  },
  {
    id: "client-portal",
    type: "mapNode",
    position: { x: 0, y: 230 },
    data: {
      label: "Client Portal",
      icon: "📱",
      description: "Branded dashboard · PIN-protected · 6 tabs",
      status: "in-progress",
      subNodes: ["Sales", "Demand", "Activity", "Assets", "Automations", "Execution"],
      keyFiles: ["app/[slug]/page.tsx", "components/client-app.tsx", "components/tabs/"],
    },
  },
  {
    id: "admin-panel",
    type: "mapNode",
    position: { x: 740, y: 230 },
    data: {
      label: "Admin Panel",
      icon: "⚙️",
      description: "Victor's workspace · All client management",
      status: "in-progress",
      subNodes: ["Dashboard", "Client Editor", "Knowledge Bank", "Branding", "Health Check"],
      keyFiles: ["app/admin/", "components/admin/"],
    },
  },
  {
    id: "automations-engine",
    type: "mapNode",
    position: { x: 0, y: 470 },
    data: {
      label: "Automations Engine",
      icon: "🤖",
      description: "AI automations · WAT pattern · TypeScript",
      status: "in-progress",
      subNodes: ["Lead Reply", "Social Poster", "Review Collector"],
      keyFiles: ["lib/automations/", "app/api/automations/"],
      skill: "/new-automation",
    },
  },
  {
    id: "knowledge-hub",
    type: "mapNode",
    position: { x: 370, y: 470 },
    data: {
      label: "Knowledge Hub",
      icon: "🧠",
      description: "Client facts · AI extraction · Feeds automations",
      status: "in-progress",
      subNodes: ["Entry Management", "Extraction Pipeline", "Auto-fill"],
      keyFiles: ["app/api/admin/clients/[id]/knowledge/", "lib/ai-config.ts"],
    },
  },
  {
    id: "payments",
    type: "mapNode",
    position: { x: 740, y: 470 },
    data: {
      label: "Payments",
      icon: "💳",
      description: "Stripe one-time + subscriptions · Idempotent webhook",
      status: "in-progress",
      subNodes: ["One-time Checkout", "Subscriptions", "Stripe Webhook"],
      keyFiles: ["app/api/checkout/route.ts", "app/api/webhooks/stripe/route.ts"],
      issues: ["Prices read from client request — needs price table"],
    },
  },
];

// ── Edges ──────────────────────────────────────────────────────────────────

export const MAP_EDGES: Edge[] = [
  {
    id: "auth-portal",
    source: "auth",
    target: "client-portal",
    label: "guards",
    type: "smoothstep",
    animated: false,
    style: { strokeDasharray: "5 3" },
  },
  {
    id: "auth-admin",
    source: "auth",
    target: "admin-panel",
    label: "guards",
    type: "smoothstep",
    animated: false,
    style: { strokeDasharray: "5 3" },
  },
  {
    id: "admin-portal",
    source: "admin-panel",
    target: "client-portal",
    label: "configures",
    type: "smoothstep",
    animated: false,
  },
  {
    id: "admin-knowledge",
    source: "admin-panel",
    target: "knowledge-hub",
    label: "manages",
    type: "smoothstep",
    animated: false,
  },
  {
    id: "knowledge-automations",
    source: "knowledge-hub",
    target: "automations-engine",
    label: "feeds context",
    type: "smoothstep",
    animated: true,
  },
  {
    id: "portal-automations",
    source: "client-portal",
    target: "automations-engine",
    label: "renders tab",
    type: "smoothstep",
    animated: false,
    style: { strokeDasharray: "5 3" },
  },
  {
    id: "portal-payments",
    source: "client-portal",
    target: "payments",
    label: "checkout",
    type: "smoothstep",
    animated: true,
  },
  {
    id: "payments-portal",
    source: "payments",
    target: "client-portal",
    label: "confirms",
    type: "smoothstep",
    animated: false,
  },
];

// ── Status meta ────────────────────────────────────────────────────────────

export const STATUS_CONFIG: Record<NodeStatus, { label: string; color: string; bg: string }> = {
  done:          { label: "Done",        color: "#00c853", bg: "rgba(0,200,83,0.1)" },
  "in-progress": { label: "In Progress", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  planned:       { label: "Planned",     color: "#737373", bg: "rgba(115,115,115,0.1)" },
  broken:        { label: "Broken",      color: "#dc2626", bg: "rgba(220,38,38,0.1)" },
};
