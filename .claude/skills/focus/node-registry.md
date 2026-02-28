# Node Registry

Maps user-friendly arguments to project nodes.
Referenced by the `/focus` skill.

---

## Level 1 nodes (full module scope)

| Argument(s) | Node ID | Section in PROJECT_MAP.md | Key files |
|-------------|---------|--------------------------|-----------|
| `auth` | auth | NODE: Auth | `lib/admin-auth.ts` · `app/api/verify-pin/route.ts` · `app/api/admin/auth/route.ts` |
| `portal`, `client-portal` | client-portal | NODE: Client Portal | `app/[slug]/page.tsx` · `components/client-app.tsx` · `components/tabs/` |
| `admin`, `admin-panel` | admin-panel | NODE: Admin Panel | `app/admin/` · `components/admin/client-editor.tsx` · `components/admin/admin-dashboard.tsx` |
| `automations`, `automations-engine` | automations-engine | NODE: Automations Engine | `lib/automations/` · `app/api/automations/` · `scripts/003_automation_runs.sql` |
| `knowledge`, `knowledge-hub` | knowledge-hub | NODE: Knowledge Hub | `app/api/admin/clients/[id]/knowledge/` · `lib/ai-config.ts` |
| `payments` | payments | NODE: Payments | `app/api/checkout/route.ts` · `app/api/subscribe/route.ts` · `app/api/webhooks/stripe/route.ts` |

---

## Level 2 sub-nodes (narrower scope — single automation or tab)

| Argument(s) | Parent node | Sub-node scope | Key files |
|-------------|------------|----------------|-----------|
| `lead-reply` | automations-engine | Lead Reply automation | `lib/automations/lead-reply/index.ts` · `lib/automations/lead-reply/workflow.ts` · `lib/automations/lead-reply/tools.ts` · `app/api/automations/[key]/trigger/route.ts` |
| `social-poster` | automations-engine | Social Poster automation | `lib/automations/social-poster/index.ts` · `lib/automations/social-poster/workflow.ts` · `lib/automations/social-poster/tools.ts` |
| `review-collector` | automations-engine | Review Collector automation | `lib/automations/review-collector/index.ts` · `lib/automations/review-collector/workflow.ts` · `lib/automations/review-collector/tools.ts` |
| `sales-tab`, `sales` | client-portal | Sales tab only | `components/tabs/sales-tab.tsx` · `app/api/sales/route.ts` |
| `demand-tab`, `demand` | client-portal | Demand tab (keyword data) | `components/tabs/demand-tab.tsx` |
| `activity-tab`, `activity` | client-portal | Activity log tab | `components/tabs/activity-tab.tsx` · `app/api/activity/route.ts` |
| `assets-tab`, `assets` | client-portal | Assets tab (brand kit) | `components/tabs/assets-tab.tsx` |
| `automations-tab` | client-portal | Automations tab UI (client-facing view) | `components/tabs/automations-tab.tsx` |
| `execution-tab`, `execution` | client-portal | Execution tab (roadmap + payments) | `components/tabs/execution-tab.tsx` · `app/api/checkout/route.ts` |
| `health-check`, `health` | admin-panel | Project health diagnostics + deep review | `components/admin/health-check-panel.tsx` · `app/api/admin/health/` |
| `north-star`, `project-objective` | admin-panel | Per-client AI context / north star | `components/admin/editors/general-editor.tsx` · `lib/ai-config.ts` |
| `client-editor` | admin-panel | Full client editor (all sections) | `components/admin/client-editor.tsx` · `app/admin/[clientId]/[section]/page.tsx` |
| `project-map`, `map` | admin-panel | Visual wiring diagram | `components/admin/project-map-view.tsx` · `lib/project-map-data.ts` |
| `knowledge-editor` | knowledge-hub | Knowledge Bank admin UI | `components/admin/editors/knowledge-editor.tsx` · `app/api/admin/clients/[id]/knowledge/` |
| `extraction`, `knowledge-extract` | knowledge-hub | AI extraction pipeline | `app/api/admin/clients/[id]/knowledge/extract/route.ts` · `app/api/admin/clients/[id]/knowledge/autofill/route.ts` |
| `ai-briefs`, `briefs` | knowledge-hub | AI brief generation | `app/api/admin/clients/[id]/knowledge/briefs/route.ts` |

---

## Pending migrations per node

Check these before starting a session — if the migration is not applied, the node cannot be tested end-to-end.

| Node | Migration file | Status |
|------|---------------|--------|
| automations-engine | `scripts/003_automation_runs.sql` | ✅ Applied (DB has draft_content, payload, all status values) |
| payments | `stripe_webhook_idempotency` migration | ✅ Applied |

---

## Status reference

| Value | Meaning |
|-------|---------|
| `planned` | Not started — design exists but no code |
| `in-progress` | Work underway — functional but incomplete |
| `done` | All target state items met, no known blocking issues |
| `broken` | Regression introduced or critical issue found |

---

## Adding a new node

1. Add a row to the Level 1 table above (or Level 2 if it's a sub-node)
2. Add a `## NODE: [Name]` section to `PROJECT_MAP.md`
3. Add a node entry to `lib/project-map-data.ts` (MAP_NODES array)
4. Add pending migration row if a DB change is required
