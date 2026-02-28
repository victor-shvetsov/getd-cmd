/**
 * Project wiring diagram — Level 1 + Level 2 data.
 * Keep in sync with PROJECT_MAP.md.
 */

import type { Node, Edge } from "@xyflow/react";

// ── Types ──────────────────────────────────────────────────────────────────

export type NodeStatus = "done" | "in-progress" | "planned" | "broken";

export type SubNodeType =
  | "api-route"
  | "ui-component"
  | "db-table"
  | "external-service"
  | "lib-file"
  | "concept";

export interface SubNodeData extends Record<string, unknown> {
  label: string;
  type: SubNodeType;
  hint?: string;
}

export interface NodeLevel2 {
  subNodes: Node<SubNodeData>[];
  subEdges: Edge[];
  targetState: string[];
  plan: string[];
  changelog: string[];
}

export interface MapNodeData extends Record<string, unknown> {
  label: string;
  icon: string;
  description: string;
  status: NodeStatus;
  subNodes: string[];
  keyFiles: string[];
  skill?: string;
  issues?: string[];
  level2: NodeLevel2;
}

// ── Sub-node type colors ───────────────────────────────────────────────────

export const SUB_NODE_TYPE_CONFIG: Record<SubNodeType, { color: string; bg: string }> = {
  "api-route":        { color: "#3b82f6", bg: "rgba(59,130,246,0.10)" },
  "ui-component":     { color: "#8b5cf6", bg: "rgba(139,92,246,0.10)" },
  "db-table":         { color: "#f59e0b", bg: "rgba(245,158,11,0.10)" },
  "external-service": { color: "#06b6d4", bg: "rgba(6,182,212,0.10)" },
  "lib-file":         { color: "#737373", bg: "rgba(115,115,115,0.10)" },
  "concept":          { color: "#64748b", bg: "rgba(100,116,139,0.10)" },
};

// ── Level 1 nodes ──────────────────────────────────────────────────────────

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
      keyFiles: ["lib/admin-auth.ts", "app/api/verify-pin/route.ts", "app/api/admin/auth/route.ts"],
      issues: ["PINs stored as plaintext (needs bcrypt)", "Admin token is base64 — trivially reversible", "No rate limiting on auth endpoints"],
      level2: {
        subNodes: [
          { id: "l2-client-browser",   type: "subNode", position: { x: 0,   y: 0   }, data: { label: "Client Browser",  type: "concept" } },
          { id: "l2-admin-browser",    type: "subNode", position: { x: 210, y: 0   }, data: { label: "Admin Browser",   type: "concept" } },
          { id: "l2-verify-pin",       type: "subNode", position: { x: 0,   y: 100 }, data: { label: "verify-pin API",  type: "api-route", hint: "app/api/verify-pin/route.ts" } },
          { id: "l2-admin-auth",       type: "subNode", position: { x: 210, y: 100 }, data: { label: "admin/auth API",  type: "api-route", hint: "app/api/admin/auth/route.ts" } },
          { id: "l2-sessionstorage",   type: "subNode", position: { x: 105, y: 210 }, data: { label: "sessionStorage",  type: "concept", hint: "pin_auth_{slug} · admin_token" } },
        ],
        subEdges: [
          { id: "e-cb-vp",  source: "l2-client-browser", target: "l2-verify-pin",     type: "smoothstep" },
          { id: "e-ab-aa",  source: "l2-admin-browser",  target: "l2-admin-auth",     type: "smoothstep" },
          { id: "e-vp-ss",  source: "l2-verify-pin",     target: "l2-sessionstorage", type: "smoothstep", label: "token" },
          { id: "e-aa-ss",  source: "l2-admin-auth",     target: "l2-sessionstorage", type: "smoothstep", label: "token" },
        ],
        targetState: [
          "Client PINs hashed with bcrypt before storing in DB",
          "Admin uses real JWT with 24h expiry (not base64 password)",
          "Rate limit: max 10 auth attempts per IP per 15 minutes",
          "Auth failures logged to an audit table",
        ],
        plan: [
          "Not in active focus — lower priority than automations",
          "Will be addressed before onboarding clients with real payment data",
          "bcrypt migration path: hash on first successful login, verify both formats during transition",
        ],
        changelog: [
          "Initial: basic PIN string compare against plaintext value in DB",
          "Admin token: base64-encoded password, validated via string compare in lib/admin-auth.ts",
          "Sessions stored in sessionStorage (lost on tab close — intentional)",
        ],
      },
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
      level2: {
        subNodes: [
          { id: "l2-slug-page",     type: "subNode", position: { x: 130, y: 0   }, data: { label: "/[slug]/page.tsx",  type: "lib-file" } },
          { id: "l2-client-app",    type: "subNode", position: { x: 130, y: 100 }, data: { label: "client-app.tsx",    type: "ui-component", hint: "applies branding CSS vars, auth gate" } },
          { id: "l2-sales-tab",     type: "subNode", position: { x: 0,   y: 220 }, data: { label: "Sales",             type: "ui-component" } },
          { id: "l2-demand-tab",    type: "subNode", position: { x: 110, y: 220 }, data: { label: "Demand",            type: "ui-component" } },
          { id: "l2-activity-tab",  type: "subNode", position: { x: 220, y: 220 }, data: { label: "Activity",          type: "ui-component" } },
          { id: "l2-assets-tab",    type: "subNode", position: { x: 0,   y: 310 }, data: { label: "Assets",            type: "ui-component" } },
          { id: "l2-auto-tab",      type: "subNode", position: { x: 110, y: 310 }, data: { label: "Automations",       type: "ui-component" } },
          { id: "l2-exec-tab",      type: "subNode", position: { x: 220, y: 310 }, data: { label: "Execution",         type: "ui-component" } },
        ],
        subEdges: [
          { id: "e-sp-ca",  source: "l2-slug-page",    target: "l2-client-app",   type: "smoothstep" },
          { id: "e-ca-s",   source: "l2-client-app",   target: "l2-sales-tab",    type: "smoothstep" },
          { id: "e-ca-d",   source: "l2-client-app",   target: "l2-demand-tab",   type: "smoothstep" },
          { id: "e-ca-act", source: "l2-client-app",   target: "l2-activity-tab", type: "smoothstep" },
          { id: "e-ca-as",  source: "l2-client-app",   target: "l2-assets-tab",   type: "smoothstep" },
          { id: "e-ca-au",  source: "l2-client-app",   target: "l2-auto-tab",     type: "smoothstep" },
          { id: "e-ca-ex",  source: "l2-client-app",   target: "l2-exec-tab",     type: "smoothstep" },
        ],
        targetState: [
          "Every tab instantly understandable to Thomas / Casper (3-second rule)",
          "Tab visibility correct per client archetype (is_visible flag)",
          "Automations tab shows live approval queue for Casper",
          "Zero hardcoded UI strings — full i18n across all 8 languages",
          "Execution tab handles both one-time payments and subscriptions cleanly",
        ],
        plan: [
          "Approval queue in Automations Tab (blocked on: Automations Engine node)",
          "Review Execution tab UX for subscription vs one-time payment clarity",
        ],
        changelog: [
          "Locale hardcoding removed — langToLocale() helper in sales-tab + activity-tab",
          "Tab visibility (is_visible) implemented and toggleable from admin panel",
          "URL routing refactored: /admin/[clientId]/[section] replaces state-based navigation",
          "i18n system: 3-layer resolution, 8 languages",
        ],
      },
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
      subNodes: ["Dashboard", "Client Editor", "Knowledge Bank", "Branding", "Health Check", "Map"],
      keyFiles: ["app/admin/", "components/admin/client-editor.tsx", "components/admin/admin-dashboard.tsx"],
      level2: {
        subNodes: [
          { id: "l2-admin-page",   type: "subNode", position: { x: 130, y: 0   }, data: { label: "admin/page.tsx",     type: "lib-file" } },
          { id: "l2-dashboard",    type: "subNode", position: { x: 0,   y: 110 }, data: { label: "AdminDashboard",     type: "ui-component", hint: "client list + search" } },
          { id: "l2-client-ed",    type: "subNode", position: { x: 260, y: 110 }, data: { label: "ClientEditor",       type: "ui-component", hint: "section tabs + editors" } },
          { id: "l2-sec-editors",  type: "subNode", position: { x: 130, y: 220 }, data: { label: "Section Editors ×8", type: "ui-component", hint: "sales, demand, activity, assets, automations, execution, knowledge, branding" } },
          { id: "l2-health",       type: "subNode", position: { x: 0,   y: 330 }, data: { label: "Health Check",       type: "ui-component" } },
          { id: "l2-map-page",     type: "subNode", position: { x: 260, y: 330 }, data: { label: "Project Map (this)", type: "ui-component" } },
        ],
        subEdges: [
          { id: "e-ap-d",   source: "l2-admin-page",  target: "l2-dashboard",   type: "smoothstep" },
          { id: "e-ap-ce",  source: "l2-admin-page",  target: "l2-client-ed",   type: "smoothstep" },
          { id: "e-ce-se",  source: "l2-client-ed",   target: "l2-sec-editors", type: "smoothstep" },
          { id: "e-d-h",    source: "l2-dashboard",   target: "l2-health",      type: "smoothstep" },
          { id: "e-d-m",    source: "l2-dashboard",   target: "l2-map-page",    type: "smoothstep" },
        ],
        targetState: [
          "Multi-user: Victor (full access) + team members (scoped to their sections)",
          "Audit log: every admin mutation recorded (who, what, when)",
          "Project Map as the navigation hub — start every session here",
          "/setup-client skill runs full DB onboarding in one guided session",
          "Knowledge Hub voice samples auto-link to automation config",
        ],
        plan: [
          "Link Knowledge Hub voice samples → automations editor config UI",
          "Multi-user admin auth (roles: Victor = full, team = scoped)",
        ],
        changelog: [
          "Admin URL routing: /admin/[clientId]/[section] replaces state-based navigation",
          "Tab visibility toggle (VisibilityBadge) added per content section",
          "New clients auto-seed 6 tabs on creation in /api/admin/clients route",
          "creatableSections now only shows ACTIVE_TAB_KEYS — legacy tabs hidden",
          "Project Map page added at /admin/map",
        ],
      },
    },
  },
  {
    id: "automations-engine",
    type: "mapNode",
    position: { x: 0, y: 470 },
    data: {
      label: "Automations Engine",
      icon: "🤖",
      description: "AI automations · WAT pattern · TypeScript on Vercel",
      status: "in-progress",
      subNodes: ["Lead Reply", "Social Poster", "Review Collector"],
      keyFiles: ["lib/automations/", "app/api/automations/[key]/trigger/route.ts", "lib/automations/registry.ts"],
      skill: "/new-automation",
      issues: ["scripts/003_automation_runs.sql not yet applied to DB"],
      level2: {
        subNodes: [
          { id: "l2-trigger",    type: "subNode", position: { x: 130, y: 0   }, data: { label: "trigger/route.ts",    type: "api-route",        hint: "app/api/automations/[key]/trigger" } },
          { id: "l2-registry",   type: "subNode", position: { x: 130, y: 100 }, data: { label: "registry.ts",         type: "lib-file",         hint: "key → class mapping" } },
          { id: "l2-lead",       type: "subNode", position: { x: 0,   y: 210 }, data: { label: "Lead Reply",          type: "concept" } },
          { id: "l2-social",     type: "subNode", position: { x: 130, y: 210 }, data: { label: "Social Poster",       type: "concept" } },
          { id: "l2-review",     type: "subNode", position: { x: 260, y: 210 }, data: { label: "Review Collector",    type: "concept" } },
          { id: "l2-workflow",   type: "subNode", position: { x: 0,   y: 310 }, data: { label: "workflow.ts",         type: "lib-file",         hint: "buildSystemPrompt() — pure fn" } },
          { id: "l2-tools",      type: "subNode", position: { x: 130, y: 310 }, data: { label: "tools.ts",            type: "lib-file",         hint: "sendReply() etc — deterministic" } },
          { id: "l2-claude",     type: "subNode", position: { x: 0,   y: 410 }, data: { label: "Claude API",          type: "external-service", hint: "@anthropic-ai/sdk" } },
          { id: "l2-runs-db",    type: "subNode", position: { x: 200, y: 410 }, data: { label: "automation_runs",     type: "db-table",         hint: "status: pending_approval | approved | sent | failed" } },
        ],
        subEdges: [
          { id: "e-tr-re",  source: "l2-trigger",  target: "l2-registry",  type: "smoothstep" },
          { id: "e-re-le",  source: "l2-registry",  target: "l2-lead",      type: "smoothstep" },
          { id: "e-re-so",  source: "l2-registry",  target: "l2-social",    type: "smoothstep" },
          { id: "e-re-rv",  source: "l2-registry",  target: "l2-review",    type: "smoothstep" },
          { id: "e-le-wf",  source: "l2-lead",      target: "l2-workflow",  type: "smoothstep" },
          { id: "e-le-to",  source: "l2-lead",      target: "l2-tools",     type: "smoothstep" },
          { id: "e-wf-cl",  source: "l2-workflow",  target: "l2-claude",    type: "smoothstep", animated: true },
          { id: "e-le-rd",  source: "l2-lead",      target: "l2-runs-db",   type: "smoothstep", label: "logs run" },
          { id: "e-so-rd",  source: "l2-social",    target: "l2-runs-db",   type: "smoothstep" },
          { id: "e-rv-rd",  source: "l2-review",    target: "l2-runs-db",   type: "smoothstep" },
        ],
        targetState: [
          "All 3 automations working end-to-end on Casper's account",
          "Approval queue: drafts in automation_runs with status: pending_approval",
          "Client sees pending drafts in Automations tab — can approve / edit / reject",
          "Notification email sent to config.notify_email when draft is ready",
          "Voice samples pulled from Knowledge Hub automatically",
        ],
        plan: [
          "Apply scripts/003_automation_runs.sql migration to DB",
          "Finish Lead Reply: index.ts → workflow.ts → tools.ts (end-to-end test)",
          "Test trigger → draft stored → notification email fires",
          "Build approval queue UI in Automations tab",
          "Deploy and test on Casper's real inbound email",
        ],
        changelog: [
          "n8n completely removed — replaced with TypeScript WAT pattern",
          "Base AutomationRunner interface defined in lib/automations/base.ts",
          "Draft/approval mode scaffolded: require_approval + draft_mode config flags",
          "lib/email.ts notification email utility added (Resend-backed, fails silently)",
          "automation_runs table designed in scripts/003_automation_runs.sql (not applied yet)",
          "/new-automation skill ready to scaffold any new automation",
        ],
      },
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
      level2: {
        subNodes: [
          { id: "l2-ke-ui",      type: "subNode", position: { x: 130, y: 0   }, data: { label: "knowledge-editor.tsx",    type: "ui-component" } },
          { id: "l2-ke-db",      type: "subNode", position: { x: 0,   y: 110 }, data: { label: "knowledge_entries",       type: "db-table",         hint: "raw_content, extracted_facts, status" } },
          { id: "l2-extract",    type: "subNode", position: { x: 270, y: 110 }, data: { label: "/extract",                type: "api-route",        hint: "raw text → Claude → extracted_facts" } },
          { id: "l2-claude-f",   type: "subNode", position: { x: 270, y: 220 }, data: { label: "Claude API (fast)",       type: "external-service" } },
          { id: "l2-ctx",        type: "subNode", position: { x: 130, y: 330 }, data: { label: "getClientAIContext()",    type: "lib-file",         hint: "lib/ai-config.ts — objective + facts" } },
          { id: "l2-autofill",   type: "subNode", position: { x: 0,   y: 440 }, data: { label: "/autofill",              type: "api-route",        hint: "facts → Claude → suggested tab data" } },
          { id: "l2-tabdata",    type: "subNode", position: { x: 270, y: 440 }, data: { label: "Tab data (suggested)",   type: "concept" } },
        ],
        subEdges: [
          { id: "e-ui-db",    source: "l2-ke-ui",    target: "l2-ke-db",    type: "smoothstep", label: "CRUD" },
          { id: "e-ui-ex",    source: "l2-ke-ui",    target: "l2-extract",  type: "smoothstep" },
          { id: "e-ex-cl",    source: "l2-extract",  target: "l2-claude-f", type: "smoothstep", animated: true },
          { id: "e-cl-db",    source: "l2-claude-f", target: "l2-ke-db",    type: "smoothstep", label: "extracted_facts" },
          { id: "e-db-ctx",   source: "l2-ke-db",    target: "l2-ctx",      type: "smoothstep" },
          { id: "e-ctx-af",   source: "l2-ctx",      target: "l2-autofill", type: "smoothstep" },
          { id: "e-af-td",    source: "l2-autofill", target: "l2-tabdata",  type: "smoothstep" },
        ],
        targetState: [
          "Voice samples in Knowledge Hub auto-populate automation voice_samples config",
          "Gap analysis: shows which key facts are missing per client section",
          "KW research + URL structure + facts → landing page copy draft (future)",
          "Every AI feature in the app runs through getClientAIContext() as the single source of context",
        ],
        plan: [
          "Build UI link: Knowledge Hub voice samples → automations editor voice_samples field",
          "Gap analysis endpoint: /api/admin/clients/[id]/knowledge/gaps",
        ],
        changelog: [
          "getClientAIContext() centralized in lib/ai-config.ts (all AI features use it)",
          "Extraction pipeline built: raw_content → Claude (fast model) → extracted_facts → status: done",
          "Auto-fill route built: extracted_facts → Claude (primary) → suggested tab data shape",
          "Both autofill and extraction routes use aiModel() helper for model selection",
        ],
      },
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
      keyFiles: ["app/api/checkout/route.ts", "app/api/subscribe/route.ts", "app/api/webhooks/stripe/route.ts"],
      issues: ["Prices read from client request JSONB — needs server-side price_catalog table"],
      level2: {
        subNodes: [
          { id: "l2-exec-t",   type: "subNode", position: { x: 130, y: 0   }, data: { label: "Execution Tab",          type: "ui-component" } },
          { id: "l2-checkout", type: "subNode", position: { x: 0,   y: 110 }, data: { label: "/api/checkout",          type: "api-route",        hint: "one-time payment session" } },
          { id: "l2-subscribe",type: "subNode", position: { x: 270, y: 110 }, data: { label: "/api/subscribe",         type: "api-route",        hint: "recurring subscription" } },
          { id: "l2-stripe",   type: "subNode", position: { x: 130, y: 220 }, data: { label: "Stripe",                 type: "external-service" } },
          { id: "l2-webhook",  type: "subNode", position: { x: 130, y: 330 }, data: { label: "/webhooks/stripe",       type: "api-route",        hint: "idempotency guard → event processing" } },
          { id: "l2-pay-db",   type: "subNode", position: { x: 0,   y: 440 }, data: { label: "payments table",        type: "db-table" } },
          { id: "l2-idem-db",  type: "subNode", position: { x: 130, y: 440 }, data: { label: "stripe_webhook_events", type: "db-table",         hint: "idempotency — unique event_id PK" } },
          { id: "l2-sub-db",   type: "subNode", position: { x: 270, y: 440 }, data: { label: "subscriptions table",   type: "db-table" } },
        ],
        subEdges: [
          { id: "e-et-co",  source: "l2-exec-t",    target: "l2-checkout",  type: "smoothstep" },
          { id: "e-et-su",  source: "l2-exec-t",    target: "l2-subscribe", type: "smoothstep" },
          { id: "e-co-st",  source: "l2-checkout",  target: "l2-stripe",    type: "smoothstep", animated: true },
          { id: "e-su-st",  source: "l2-subscribe", target: "l2-stripe",    type: "smoothstep", animated: true },
          { id: "e-st-wh",  source: "l2-stripe",    target: "l2-webhook",   type: "smoothstep" },
          { id: "e-wh-pd",  source: "l2-webhook",   target: "l2-pay-db",    type: "smoothstep" },
          { id: "e-wh-id",  source: "l2-webhook",   target: "l2-idem-db",   type: "smoothstep", label: "idempotency" },
          { id: "e-wh-sd",  source: "l2-webhook",   target: "l2-sub-db",    type: "smoothstep" },
        ],
        targetState: [
          "Prices stored in price_catalog table — never read from client request",
          "All critical webhook events handled ✓ (invoice.paid, subscription.deleted, etc.)",
          "Idempotency guard prevents double-processing ✓ (stripe_webhook_events table)",
          "Invoice history visible to client in Execution tab",
        ],
        plan: [
          "Create price_catalog table and migrate existing prices out of JSONB",
          "Show invoice history in Execution tab UI (invoices array is stored, not yet displayed)",
        ],
        changelog: [
          "Idempotency guard: stripe_webhook_events table, atomic insert, 23505 = duplicate skip",
          "Subscription events handled: invoice.paid, invoice.payment_failed, customer.subscription.deleted/updated",
          "checkout.session.completed handles both one-time and subscription modes",
          "Subscription invoices stored in subscriptions.invoices JSONB array",
        ],
      },
    },
  },
];

// ── Level 1 edges ──────────────────────────────────────────────────────────

export const MAP_EDGES: Edge[] = [
  {
    id: "auth-portal",
    source: "auth",
    target: "client-portal",
    label: "guards",
    type: "smoothstep",
    style: { strokeDasharray: "5 3" },
  },
  {
    id: "auth-admin",
    source: "auth",
    target: "admin-panel",
    label: "guards",
    type: "smoothstep",
    style: { strokeDasharray: "5 3" },
  },
  {
    id: "admin-portal",
    source: "admin-panel",
    target: "client-portal",
    label: "configures",
    type: "smoothstep",
  },
  {
    id: "admin-knowledge",
    source: "admin-panel",
    target: "knowledge-hub",
    label: "manages",
    type: "smoothstep",
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
  },
];

// ── Status display config ──────────────────────────────────────────────────

export const STATUS_CONFIG: Record<NodeStatus, { label: string; color: string; bg: string }> = {
  done:          { label: "Done",        color: "#00c853", bg: "rgba(0,200,83,0.1)" },
  "in-progress": { label: "In Progress", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  planned:       { label: "Planned",     color: "#737373", bg: "rgba(115,115,115,0.1)" },
  broken:        { label: "Broken",      color: "#dc2626", bg: "rgba(220,38,38,0.1)" },
};
