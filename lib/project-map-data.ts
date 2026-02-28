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

/** Full metadata shown when a Level 2 sub-node is clicked. */
export interface SubNodeDetail {
  description: string;
  targetState: string[];
  plan: string[];
  keyFiles: string[];
  skill?: string;
  issues?: string[];
  changelog?: string[];
}

export interface SubNodeData extends Record<string, unknown> {
  label: string;
  type: SubNodeType;
  hint?: string;
  /** If present, this sub-node is clickable and shows a detail panel. */
  details?: SubNodeDetail;
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
  // ── AUTH ────────────────────────────────────────────────────────────────
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
          { id: "l2-client-browser", type: "subNode", position: { x: 0,   y: 0   }, data: { label: "Client Browser",  type: "concept",
            details: { description: "PIN entry gate shown to clients at /{slug}", targetState: ["PIN hashed with bcrypt before storage", "Brute-force protection: lockout after 5 wrong attempts"], plan: ["Migrate existing PINs to bcrypt hashes on first successful login"], keyFiles: ["components/pin-gate.tsx", "app/api/verify-pin/route.ts"], changelog: ["Initial: plaintext PIN compare in DB"] } } },
          { id: "l2-admin-browser",  type: "subNode", position: { x: 210, y: 0   }, data: { label: "Admin Browser",   type: "concept",
            details: { description: "Password gate for Victor and team at /admin", targetState: ["Real JWT with 24h expiry", "Multi-user: Victor (full) + team (scoped)"], plan: ["Replace base64 token with signed JWT", "Add role field to token payload"], keyFiles: ["components/admin/admin-login.tsx", "app/api/admin/auth/route.ts"], changelog: ["Initial: base64(password) Bearer token"] } } },
          { id: "l2-verify-pin",     type: "subNode", position: { x: 0,   y: 100 }, data: { label: "verify-pin API",  type: "api-route", hint: "app/api/verify-pin/route.ts",
            details: { description: "Validates client PIN, returns session token", targetState: ["PIN compared against bcrypt hash", "Rate limit: 10 req / 15 min per IP", "Failure events logged"], plan: ["Add bcrypt compare", "Add rate limiting middleware"], keyFiles: ["app/api/verify-pin/route.ts"], issues: ["Currently plaintext compare — exploitable"], changelog: ["Initial implementation"] } } },
          { id: "l2-admin-auth",     type: "subNode", position: { x: 210, y: 100 }, data: { label: "admin/auth API",  type: "api-route", hint: "app/api/admin/auth/route.ts" } },
          { id: "l2-sessionstorage", type: "subNode", position: { x: 105, y: 210 }, data: { label: "sessionStorage",  type: "concept",   hint: "pin_auth_{slug} · admin_token" } },
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
        ],
        changelog: [
          "Initial: basic PIN string compare against plaintext value in DB",
          "Admin token: base64-encoded password, validated via string compare",
        ],
      },
    },
  },

  // ── CLIENT PORTAL ────────────────────────────────────────────────────────
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
          { id: "l2-slug-page",    type: "subNode", position: { x: 130, y: 0   }, data: { label: "/[slug]/page.tsx",  type: "lib-file" } },
          { id: "l2-client-app",   type: "subNode", position: { x: 130, y: 100 }, data: { label: "client-app.tsx",    type: "ui-component", hint: "applies branding CSS vars, auth gate" } },
          { id: "l2-sales-tab",    type: "subNode", position: { x: 0,   y: 220 }, data: { label: "Sales",             type: "ui-component",
            details: { description: "Monthly revenue vs goal, product category breakdown, offline sales entry", targetState: ["Revenue goal and currency always set before client launch", "Category breakdown reflects actual client product mix", "Locale-aware formatting for all currencies and numbers"], plan: ["Verify all currency symbols display correctly for non-DKK clients"], keyFiles: ["components/tabs/sales-tab.tsx", "app/api/sales/route.ts"], skill: "/focus sales-tab", changelog: ["Locale hardcoding fixed: langToLocale() helper replaces hardcoded da-DK"] } } },
          { id: "l2-demand-tab",   type: "subNode", position: { x: 110, y: 220 }, data: { label: "Demand",            type: "ui-component",
            details: { description: "Google Keyword Planner market data — shows search demand and opportunity by keyword and page", targetState: ["Keyword data always sourced from real PPC research uploads (not AI-generated)", "Chart visualisation clearly shows opportunity vs competition", "Empty state explains how to upload keyword data"], plan: ["Review empty state UX — does Thomas understand what to do?"], keyFiles: ["components/tabs/demand-tab.tsx", "components/admin/editors/demand-hub-editor.tsx"], changelog: ["Initial implementation"] } } },
          { id: "l2-activity-tab", type: "subNode", position: { x: 220, y: 220 }, data: { label: "Activity",          type: "ui-component",
            details: { description: "Chronological log of work done — shows Thomas what the agency is actually doing each month", targetState: ["Every completed deliverable appears here within 24h", "Grouped by month, relative dates for recent items", "Locale-aware date formatting for all 8 languages"], plan: ["Ensure admin editors can easily add activity entries after each deliverable"], keyFiles: ["components/tabs/activity-tab.tsx", "app/api/admin/clients/[id]/knowledge/"], changelog: ["Locale hardcoding fixed: langToLocale() helper"] } } },
          { id: "l2-assets-tab",   type: "subNode", position: { x: 0,   y: 310 }, data: { label: "Assets",            type: "ui-component",
            details: { description: "Brand kit (logos, colors, fonts), content photos, website links — tap to download", targetState: ["All client brand assets accessible in one place", "Download works on mobile (tap-to-download)", "Brief documents linked here for designer/photographer handoff"], plan: ["Verify mobile download UX on iOS Safari"], keyFiles: ["components/tabs/assets-tab.tsx", "components/admin/editors/assets-hub-editor.tsx"], changelog: ["Initial implementation"] } } },
          { id: "l2-auto-tab",     type: "subNode", position: { x: 110, y: 310 }, data: { label: "Automations",       type: "ui-component",
            details: { description: "Client-facing view: on/off toggles, run counters, approval queue for pending drafts", targetState: ["Shows live automation status (enabled/disabled)", "Approval queue visible: Casper can read, edit, approve/reject each draft", "Counter shows how many times each automation has run"], plan: ["Build approval queue UI (blocked on automation_runs table migration)", "Test approval flow end-to-end with Casper's account"], keyFiles: ["components/tabs/automations-tab.tsx"], issues: ["Approval queue UI not built yet — depends on automation_runs table"], changelog: ["Initial: toggle + counter display"] } } },
          { id: "l2-exec-tab",     type: "subNode", position: { x: 220, y: 310 }, data: { label: "Execution",         type: "ui-component",
            details: { description: "Project roadmap items with Stripe payment integration — clients can pay for items directly from the tab", targetState: ["Roadmap items clearly communicate what's planned, in-progress, done", "One-time payments work via embedded Stripe checkout", "Subscriptions show billing history and next invoice date"], plan: ["Show invoice history for subscriptions (data is stored, UI not built)", "Create price_catalog table so prices aren't read from JSONB"], keyFiles: ["components/tabs/execution-tab.tsx", "app/api/checkout/route.ts", "app/api/subscribe/route.ts"], issues: ["Prices read from client JSONB — should come from server-side price table"], changelog: ["Stripe embedded checkout added", "Subscription display added"] } } },
        ],
        subEdges: [
          { id: "e-sp-ca",   source: "l2-slug-page",  target: "l2-client-app",   type: "smoothstep" },
          { id: "e-ca-s",    source: "l2-client-app",  target: "l2-sales-tab",    type: "smoothstep" },
          { id: "e-ca-d",    source: "l2-client-app",  target: "l2-demand-tab",   type: "smoothstep" },
          { id: "e-ca-act",  source: "l2-client-app",  target: "l2-activity-tab", type: "smoothstep" },
          { id: "e-ca-as",   source: "l2-client-app",  target: "l2-assets-tab",   type: "smoothstep" },
          { id: "e-ca-au",   source: "l2-client-app",  target: "l2-auto-tab",     type: "smoothstep" },
          { id: "e-ca-ex",   source: "l2-client-app",  target: "l2-exec-tab",     type: "smoothstep" },
        ],
        targetState: [
          "Every tab instantly understandable to Thomas / Casper (3-second rule)",
          "Tab visibility correct per client archetype (is_visible flag)",
          "Automations tab shows live approval queue for Casper",
          "Zero hardcoded UI strings — full i18n across all 8 languages",
        ],
        plan: [
          "Approval queue in Automations Tab (blocked on: Automations Engine node)",
          "Invoice history in Execution tab",
        ],
        changelog: [
          "Locale hardcoding removed — langToLocale() helper in sales-tab + activity-tab",
          "Tab visibility (is_visible) implemented and toggleable from admin",
        ],
      },
    },
  },

  // ── ADMIN PANEL ──────────────────────────────────────────────────────────
  {
    id: "admin-panel",
    type: "mapNode",
    position: { x: 740, y: 230 },
    data: {
      label: "Admin Panel",
      icon: "⚙️",
      description: "Victor's workspace · All client management",
      status: "in-progress",
      subNodes: ["Dashboard", "Client Editor", "North Star", "Health Check", "Project Map", "Branding"],
      keyFiles: ["app/admin/", "components/admin/client-editor.tsx", "components/admin/admin-dashboard.tsx"],
      level2: {
        subNodes: [
          { id: "l2-admin-page",  type: "subNode", position: { x: 130, y: 0   }, data: { label: "admin/page.tsx",     type: "lib-file" } },
          { id: "l2-dashboard",   type: "subNode", position: { x: 0,   y: 110 }, data: { label: "Dashboard",          type: "ui-component", hint: "client list + search + map + health",
            details: { description: "Main admin landing page — client card grid with search, quick actions (edit, copy link, open portal)", targetState: ["All clients visible with colour swatches and language", "One-click to Project Map or Health Check", "New client creation auto-seeds correct tabs"], plan: ["No active plan — stable"], keyFiles: ["components/admin/admin-dashboard.tsx"], changelog: ["Map button added to header", "New client auto-seeds 6 tabs"] } } },
          { id: "l2-client-ed",   type: "subNode", position: { x: 260, y: 110 }, data: { label: "Client Editor",      type: "ui-component", hint: "section tabs + all editors",
            details: { description: "Per-client editor with horizontal section tab bar. Each section is a dedicated editor component.", targetState: ["All 8 sections work: General, Branding, Sales, Demand, Activity, Assets, Automations, Execution", "Tab visibility toggle (is_visible) works per section", "Section URL: /admin/[clientId]/[section]"], plan: ["Multi-user: scope team access to specific sections"], keyFiles: ["components/admin/client-editor.tsx", "components/admin/editors/"], changelog: ["URL routing: /admin/[clientId]/[section]", "Tab visibility toggle added", "creatableSections limited to active tab keys"] } } },
          { id: "l2-north-star",  type: "subNode", position: { x: 0,   y: 240 }, data: { label: "North Star",         type: "concept", hint: "clients.project_objective — feeds getClientAIContext()",
            details: { description: "The per-client project objective field in the General tab. It's the client-level CLAUDE.md — every AI feature in the app reads this first. Victor writes 2-3 sentences about what success looks like for this client.", targetState: ["Every client has a project_objective filled in before any AI feature is used", "getClientAIContext() always includes objective as the first section of every AI prompt", "Objective is prominent in the admin General tab with a clear placeholder"], plan: ["Add a visual reminder in the admin if objective is empty before any AI action", "Consider a guided 'set up your client' flow that makes objective the first step"], keyFiles: ["app/admin/[clientId]/general (section)", "lib/ai-config.ts — getClientAIContext()", "components/admin/editors/ (general section)"], skill: "/focus admin", changelog: ["project_objective column added to clients table", "getClientAIContext() includes objective as PROJECT OBJECTIVE section"] } } },
          { id: "l2-health",      type: "subNode", position: { x: 260, y: 240 }, data: { label: "Health Check",       type: "ui-component",
            details: { description: "20+ automated checks that evaluate whether each client's setup is complete and correct. Plus a Deep Review that uses Claude to score client readiness A-F.", targetState: ["All health checks pass for every active client before launch", "Deep Review gives actionable A-F scoring with specific recommendations", "Health Check accessible from dashboard header"], plan: ["Review what checks are currently implemented", "Add check: automation_runs table exists", "Add check: project_objective is filled"], keyFiles: ["components/admin/health-check.tsx", "app/api/admin/health/route.ts", "app/api/admin/health/deep-review/route.ts"], skill: "/qa", changelog: ["Deep Review (AI scoring) added", "Map button added to dashboard alongside Health"] } } },
          { id: "l2-map-page",    type: "subNode", position: { x: 130, y: 380 }, data: { label: "Project Map",        type: "ui-component",
            details: { description: "This page — interactive wiring diagram of the entire project. Level 1 shows all modules, clicking opens Level 2 sub-diagram with target state, plan, key files, changelog.", targetState: ["Every node is clickable with full detail", "All sub-nodes are clickable with their own target state and plan", "Changelog updated at the end of every focus session"], plan: ["All sub-nodes clickable (in progress)", "Add /focus skill invocation directly from node panel"], keyFiles: ["app/admin/map/page.tsx", "components/admin/project-map-view.tsx", "lib/project-map-data.ts"], skill: "/focus admin", changelog: ["Level 1 map built with React Flow", "Level 2 sub-diagrams per node", "Detail panel with sub-diagram, target state, plan, key files, changelog", "Sub-node clickability added"] } } },
        ],
        subEdges: [
          { id: "e-ap-d",   source: "l2-admin-page", target: "l2-dashboard",   type: "smoothstep" },
          { id: "e-ap-ce",  source: "l2-admin-page", target: "l2-client-ed",   type: "smoothstep" },
          { id: "e-ce-ns",  source: "l2-client-ed",  target: "l2-north-star",  type: "smoothstep", label: "General tab" },
          { id: "e-d-h",    source: "l2-dashboard",  target: "l2-health",      type: "smoothstep" },
          { id: "e-d-m",    source: "l2-dashboard",  target: "l2-map-page",    type: "smoothstep" },
        ],
        targetState: [
          "Multi-user: Victor (full access) + team members (scoped to their sections)",
          "Audit log: every admin mutation recorded (who, what, when)",
          "North Star (project_objective) always filled before AI features are used",
          "Health Check passes for every client before they receive portal access",
          "Project Map as the navigation hub — start every session here",
        ],
        plan: [
          "Link Knowledge Hub voice samples → automations editor config UI",
          "Multi-user admin auth (roles: Victor = full, team = scoped)",
          "Add Health Check: project_objective filled?",
        ],
        changelog: [
          "Admin URL routing: /admin/[clientId]/[section] replaces state-based navigation",
          "Tab visibility toggle (VisibilityBadge) added per content section",
          "New clients auto-seed 6 tabs on creation",
          "Project Map page added at /admin/map",
          "North Star concept formalised in this map",
        ],
      },
    },
  },

  // ── AUTOMATIONS ENGINE ───────────────────────────────────────────────────
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
          { id: "l2-trigger",  type: "subNode", position: { x: 130, y: 0   }, data: { label: "trigger/route.ts",  type: "api-route",  hint: "app/api/automations/[key]/trigger" } },
          { id: "l2-registry", type: "subNode", position: { x: 130, y: 100 }, data: { label: "registry.ts",       type: "lib-file",   hint: "key → class mapping" } },
          { id: "l2-lead",     type: "subNode", position: { x: 0,   y: 210 }, data: { label: "Lead Reply",        type: "concept",
            details: { description: "When a new email lead arrives, Claude writes a personal reply in the client's voice and either sends it immediately or stores it as a draft for approval.", targetState: ["Reply is generated in Casper's voice using voice samples from Knowledge Hub", "Draft stored in automation_runs with status: pending_approval when require_approval=true", "Client notified via email when draft is ready", "Client can approve / edit / reject in the Automations tab"], plan: ["Test with real inbound email to Casper's inbox", "Link voice samples from Knowledge Hub into automation config automatically"], keyFiles: ["lib/automations/lead-reply/index.ts", "lib/automations/lead-reply/workflow.ts", "lib/automations/lead-reply/tools.ts", "app/api/webhooks/inbound-lead/route.ts", "lib/automations/lead-reply/parse-email.ts"], skill: "/focus lead-reply", changelog: ["WAT architecture scaffolded — index.ts, workflow.ts, tools.ts, parse-email.ts", "Draft mode: require_approval config flag + pending_approval status in automation_runs", "Notification email: lib/email.ts notifies config.notify_email when draft ready", "Approval UI built in automations-tab.tsx: expand/edit/approve/discard", "parse-email.ts: JSON.parse error handling improved with explicit error messages", "workflow.ts: language detection rule added (reply in lead's language)", "Inbound email domain made configurable via NEXT_PUBLIC_RESEND_INBOUND_DOMAIN"] } } },
          { id: "l2-social",   type: "subNode", position: { x: 130, y: 210 }, data: { label: "Social Poster",     type: "concept",
            details: { description: "Casper sends a WhatsApp photo of a finished job — automation writes a caption in his voice and posts it to Facebook/Instagram.", targetState: ["Photo + job description → Claude caption in Casper's voice", "Post published to Facebook Page automatically (or draft for approval)", "Draft approval flow same as Lead Reply"], plan: ["Scaffold index.ts + workflow.ts + tools.ts (use /new-automation)", "Obtain Facebook Page access token for Casper", "Test post flow end-to-end"], keyFiles: ["lib/automations/social-poster/index.ts", "lib/automations/social-poster/workflow.ts", "lib/automations/social-poster/tools.ts"], skill: "/new-automation", changelog: ["WAT scaffolded but not yet functional"] } } },
          { id: "l2-review",   type: "subNode", position: { x: 260, y: 210 }, data: { label: "Review Collector",  type: "concept",
            details: { description: "After a job is marked complete, automatically emails the customer asking for a Trustpilot review.", targetState: ["Email sent within 24h of job completion", "Review link goes directly to Casper's Trustpilot profile", "No approval needed — safe to send automatically"], plan: ["Complete index.ts + workflow.ts + tools.ts", "Get Casper's Trustpilot profile URL", "Set up trigger: job completion → automation fires"], keyFiles: ["lib/automations/review-collector/index.ts", "lib/automations/review-collector/workflow.ts", "lib/automations/review-collector/tools.ts"], skill: "/new-automation", changelog: ["WAT scaffolded but not yet functional"] } } },
          { id: "l2-workflow", type: "subNode", position: { x: 0,   y: 310 }, data: { label: "workflow.ts",       type: "lib-file", hint: "buildSystemPrompt() — pure fn" } },
          { id: "l2-tools",    type: "subNode", position: { x: 130, y: 310 }, data: { label: "tools.ts",          type: "lib-file", hint: "sendReply() etc — deterministic" } },
          { id: "l2-claude",   type: "subNode", position: { x: 0,   y: 410 }, data: { label: "Claude API",        type: "external-service", hint: "@anthropic-ai/sdk" } },
          { id: "l2-runs-db",  type: "subNode", position: { x: 200, y: 410 }, data: { label: "automation_runs",   type: "db-table", hint: "status: pending_approval | approved | sent | failed" } },
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
        ],
        plan: [
          "Test Lead Reply end-to-end on Casper's account (real inbound email)",
          "Link voice samples from Knowledge Hub into automation config automatically",
          "Social Poster: scaffold index.ts + tools.ts + obtain Facebook token",
          "Review Collector: complete end-to-end test",
        ],
        changelog: [
          "Lead Reply workflow hardened: parse-email.ts error handling + language detection in workflow.ts",
          "Inbound email domain configurable via NEXT_PUBLIC_RESEND_INBOUND_DOMAIN env var",
          "003_automation_runs.sql updated to reflect actual applied DB schema",
          "n8n completely removed — replaced with TypeScript WAT pattern",
          "Draft/approval mode fully wired: require_approval → pending_approval → client approves in tab",
          "lib/email.ts notification email utility added",
          "automation_runs table applied to prod (draft_content, payload, all approval statuses)",
        ],
      },
    },
  },

  // ── KNOWLEDGE HUB ────────────────────────────────────────────────────────
  {
    id: "knowledge-hub",
    type: "mapNode",
    position: { x: 370, y: 470 },
    data: {
      label: "Knowledge Hub",
      icon: "🧠",
      description: "Client facts · AI extraction · Feeds automations",
      status: "in-progress",
      subNodes: ["Entry Management", "Extraction Pipeline", "Auto-fill", "AI Briefs"],
      keyFiles: ["app/api/admin/clients/[id]/knowledge/", "lib/ai-config.ts"],
      level2: {
        subNodes: [
          { id: "l2-ke-ui",    type: "subNode", position: { x: 130, y: 0   }, data: { label: "knowledge-editor.tsx",  type: "ui-component",
            details: { description: "Admin UI for managing knowledge entries: upload raw text/notes, trigger extraction, view extracted facts, run gap analysis and autofill", targetState: ["Easy to paste call transcript or notes and hit Extract", "Shows extracted facts in a readable structured view", "Gap analysis shows exactly what's missing before autofill"], plan: ["Review UX — is it obvious how to add entries?"], keyFiles: ["components/admin/editors/knowledge-bank.tsx", "components/admin/autofill-preview.tsx"], changelog: ["Initial implementation"] } } },
          { id: "l2-ke-db",    type: "subNode", position: { x: 0,   y: 110 }, data: { label: "knowledge_entries",     type: "db-table",     hint: "raw_content, extracted_facts, status" } },
          { id: "l2-extract",  type: "subNode", position: { x: 270, y: 110 }, data: { label: "Extraction Pipeline",   type: "api-route",    hint: "raw text → Claude → extracted_facts",
            details: { description: "Takes raw content (call transcript, notes, any text) and uses Claude to extract structured facts: business info, target audience, marketing history, brand voice", targetState: ["One click: raw text → structured JSON facts stored in extracted_facts column", "Status transitions: pending → processing → done | error", "Extraction uses fast Claude model to keep cost low"], plan: ["Review extraction prompt — is brand voice being captured well?"], keyFiles: ["app/api/admin/clients/[id]/knowledge/extract/route.ts"], changelog: ["Initial implementation using Claude fast model"] } } },
          { id: "l2-claude-f", type: "subNode", position: { x: 270, y: 220 }, data: { label: "Claude API (fast)",     type: "external-service" } },
          { id: "l2-ctx",      type: "subNode", position: { x: 130, y: 330 }, data: { label: "getClientAIContext()",  type: "lib-file",     hint: "lib/ai-config.ts — objective + facts",
            details: { description: "The single function that assembles AI context for any feature. Fetches client.project_objective (North Star) and all extracted_facts. Every AI call in the app goes through this.", targetState: ["Every AI route calls getClientAIContext() — no direct DB queries for facts", "Returns promptBlock ready to inject into any system prompt", "Including North Star objective as first section (highest priority)"], plan: ["No changes planned — it's the right pattern"], keyFiles: ["lib/ai-config.ts"], skill: "/focus knowledge", changelog: ["Created: centralises objective + extracted_facts into one promptBlock"] } } },
          { id: "l2-autofill", type: "subNode", position: { x: 0,   y: 440 }, data: { label: "Auto-fill",            type: "api-route",    hint: "facts → Claude → suggested tab data",
            details: { description: "Uses extracted knowledge to suggest content for any admin tab. Claude receives the tab schema + client facts and generates a structured JSON matching the expected shape.", targetState: ["Autofill works for all 6 active tabs", "Autofill-all runs autofill on every tab in one click", "Suggestions shown in preview before applying"], plan: ["Review autofill quality — are suggestions actually useful?"], keyFiles: ["app/api/admin/clients/[id]/knowledge/autofill/route.ts", "app/api/admin/clients/[id]/knowledge/autofill-all/route.ts"], changelog: ["Initial implementation"] } } },
          { id: "l2-briefs",   type: "subNode", position: { x: 270, y: 440 }, data: { label: "AI Briefs",            type: "api-route",    hint: "knowledge → designer/photographer/dev briefs",
            details: { description: "Generates professional creative briefs for the agency team (designer, photographer, developer) based on extracted client knowledge. Each brief is a downloadable document.", targetState: ["One click generates a brief the designer can act on immediately", "Brief includes: brand voice, visual preferences, deliverables needed, inspiration references", "Available as a PDF or copyable text"], plan: ["Check if briefs are actually being used — get feedback from the team", "Add brief to Assets tab for client to download"], keyFiles: ["app/api/admin/clients/[id]/knowledge/briefs/route.ts"], changelog: ["Initial implementation"] } } },
        ],
        subEdges: [
          { id: "e-ui-db",    source: "l2-ke-ui",   target: "l2-ke-db",    type: "smoothstep", label: "CRUD" },
          { id: "e-ui-ex",    source: "l2-ke-ui",   target: "l2-extract",  type: "smoothstep" },
          { id: "e-ex-cl",    source: "l2-extract",  target: "l2-claude-f", type: "smoothstep", animated: true },
          { id: "e-cl-db",    source: "l2-claude-f", target: "l2-ke-db",    type: "smoothstep", label: "extracted_facts" },
          { id: "e-db-ctx",   source: "l2-ke-db",   target: "l2-ctx",      type: "smoothstep" },
          { id: "e-ctx-af",   source: "l2-ctx",     target: "l2-autofill", type: "smoothstep" },
          { id: "e-ctx-br",   source: "l2-ctx",     target: "l2-briefs",   type: "smoothstep" },
        ],
        targetState: [
          "Voice samples in Knowledge Hub auto-populate automation voice_samples config",
          "Gap analysis shows which key facts are missing per client section",
          "Every AI feature uses getClientAIContext() — no raw DB queries for facts",
          "AI Briefs used by the team for every new client deliverable",
        ],
        plan: [
          "Build UI link: Knowledge Hub voice samples → automations editor voice_samples field",
          "Review AI Briefs quality with design and photography team",
        ],
        changelog: [
          "getClientAIContext() centralised in lib/ai-config.ts",
          "Extraction pipeline: raw text → Claude (fast) → extracted_facts",
          "Auto-fill and autofill-all routes built",
          "AI Briefs endpoint added: /knowledge/briefs",
        ],
      },
    },
  },

  // ── PAYMENTS ─────────────────────────────────────────────────────────────
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
          { id: "l2-exec-t",    type: "subNode", position: { x: 130, y: 0   }, data: { label: "Execution Tab",          type: "ui-component" } },
          { id: "l2-checkout",  type: "subNode", position: { x: 0,   y: 110 }, data: { label: "One-time Checkout",      type: "api-route",        hint: "app/api/checkout/route.ts",
            details: { description: "Client clicks 'Pay' on a roadmap item → Stripe embedded checkout session opens. On success, webhook confirms and marks item as paid.", targetState: ["Price comes from server-side price_catalog table (not client JSONB)", "Checkout session created with correct metadata (client_id, item_index)", "Payment confirmation visible in Execution tab within 30s of payment"], plan: ["Create price_catalog table and migrate existing prices"], keyFiles: ["app/api/checkout/route.ts", "components/tabs/execution-tab.tsx", "components/checkout-modal.tsx"], issues: ["Price read from JSONB — client could manipulate"], changelog: ["Initial implementation with Stripe embedded checkout"] } } },
          { id: "l2-subscribe", type: "subNode", position: { x: 260, y: 110 }, data: { label: "Subscriptions",          type: "api-route",        hint: "app/api/subscribe/route.ts",
            details: { description: "Client enrolls in a recurring service — monthly retainer, SEO package, etc. Stripe handles recurring billing.", targetState: ["Subscription created with correct interval and amount", "Terms acceptance recorded before enrollment", "Invoice history displayed in Execution tab"], plan: ["Show invoice history in Execution tab (stored in subscriptions.invoices, not yet displayed)"], keyFiles: ["app/api/subscribe/route.ts", "app/api/subscribe/accept-terms/route.ts", "components/admin/subscriptions-manager.tsx"], changelog: ["Subscription flow implemented", "Terms acceptance step added"] } } },
          { id: "l2-stripe",    type: "subNode", position: { x: 130, y: 220 }, data: { label: "Stripe",                 type: "external-service" } },
          { id: "l2-webhook",   type: "subNode", position: { x: 130, y: 330 }, data: { label: "Stripe Webhook",         type: "api-route",        hint: "idempotency guard → event processing",
            details: { description: "Handles all Stripe events. Idempotency guard prevents double-processing via stripe_webhook_events table.", targetState: ["All critical events handled ✓", "Idempotency guard prevents duplicate processing ✓", "Webhook signature verified before processing ✓"], plan: ["No active plan — this is stable"], keyFiles: ["app/api/webhooks/stripe/route.ts"], changelog: ["Idempotency guard: stripe_webhook_events table, atomic insert", "Events handled: checkout.session.completed, invoice.paid, invoice.payment_failed, customer.subscription.deleted/updated"] } } },
          { id: "l2-pay-db",    type: "subNode", position: { x: 0,   y: 440 }, data: { label: "payments table",        type: "db-table" } },
          { id: "l2-idem-db",   type: "subNode", position: { x: 130, y: 440 }, data: { label: "stripe_webhook_events", type: "db-table",         hint: "idempotency — unique event_id PK" } },
          { id: "l2-sub-db",    type: "subNode", position: { x: 260, y: 440 }, data: { label: "subscriptions table",   type: "db-table" } },
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
          "All critical webhook events handled ✓",
          "Idempotency guard prevents double-processing ✓",
          "Invoice history visible to client in Execution tab",
        ],
        plan: [
          "Create price_catalog table and migrate existing prices out of JSONB",
          "Show invoice history in Execution tab",
        ],
        changelog: [
          "Idempotency guard: stripe_webhook_events table, atomic insert, 23505 = duplicate skip",
          "All subscription webhook events handled",
          "checkout.session.completed handles both one-time and subscription modes",
        ],
      },
    },
  },
];

// ── Level 1 edges ──────────────────────────────────────────────────────────

export const MAP_EDGES: Edge[] = [
  { id: "auth-portal",         source: "auth",             target: "client-portal",     label: "guards",       type: "smoothstep", style: { strokeDasharray: "5 3" } },
  { id: "auth-admin",          source: "auth",             target: "admin-panel",       label: "guards",       type: "smoothstep", style: { strokeDasharray: "5 3" } },
  { id: "admin-portal",        source: "admin-panel",      target: "client-portal",     label: "configures",   type: "smoothstep" },
  { id: "admin-knowledge",     source: "admin-panel",      target: "knowledge-hub",     label: "manages",      type: "smoothstep" },
  { id: "knowledge-automations", source: "knowledge-hub",  target: "automations-engine", label: "feeds context", type: "smoothstep", animated: true },
  { id: "portal-automations",  source: "client-portal",    target: "automations-engine", label: "renders tab",  type: "smoothstep", style: { strokeDasharray: "5 3" } },
  { id: "portal-payments",     source: "client-portal",    target: "payments",          label: "checkout",     type: "smoothstep", animated: true },
  { id: "payments-portal",     source: "payments",         target: "client-portal",     label: "confirms",     type: "smoothstep" },
];

// ── Status display config ──────────────────────────────────────────────────

export const STATUS_CONFIG: Record<NodeStatus, { label: string; color: string; bg: string }> = {
  done:          { label: "Done",        color: "#00c853", bg: "rgba(0,200,83,0.1)" },
  "in-progress": { label: "In Progress", color: "#f59e0b", bg: "rgba(245,158,11,0.1)" },
  planned:       { label: "Planned",     color: "#737373", bg: "rgba(115,115,115,0.1)" },
  broken:        { label: "Broken",      color: "#dc2626", bg: "rgba(220,38,38,0.1)" },
};
