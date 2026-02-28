---
name: qa
description: Full QA evaluation of the client portal against the product vision — covers all 6 tabs, automations, payments, auth, Knowledge Hub, and admin. Run after every feature sprint or when something feels off.
context: fork
---

## Goal

Produce a structured, prioritized QA report telling Victor exactly what is working, what has gaps, and what is broken — in the right order to fix. Evaluate against what was promised to clients, not against code conventions.

## Before you start

Load these reference files:
- [evaluation-criteria.md](evaluation-criteria.md) — exact checklist per area
- [product-context.md](product-context.md) — north star for all evaluation decisions

Also read `PRODUCT_VISION.md` and `CLAUDE.md` from the project root.

## Tools

- Read, Glob, Grep — codebase exploration (read-only, make no changes)
- Supabase MCP — verify live DB state (see [supabase-mcp.md](supabase-mcp.md))
- Bash — run `pnpm build` for TypeScript check

## Process

### 1. Build check
Run `pnpm build`. Any TypeScript error or build failure = 🚨 Critical regardless of everything else.

### 2. Auth & security
Check: bcrypt PIN hashing, rate limiting on /api/verify-pin, admin Bearer token.
Verify in DB: `pin_hash` column exists and is populated, `pin_login_attempts` table exists.

### 3. Six client-facing tabs
For each tab, check code completeness AND query DB to verify schema supports it.
Use evaluation-criteria.md as the exact checklist for each tab.

Order: Sales → Demand → Activity → Assets → Automations → Execution

### 4. Automation system
Check: WAT folder structure (index.ts + workflow.ts + tools.ts per automation), draftMode handling, registry completeness, trigger endpoint, approval queue (DB columns + UI draft cards), draft notification email.
Verify in DB: `automations.require_approval` column exists, `automation_runs.draft_content` and `automation_runs.payload` exist.

### 5. Admin panel
Check: client CRUD, tab visibility toggles, automation editor (require_approval toggle, notify_email field shown when approval is on), PIN migration endpoint, Knowledge Hub editor.

### 6. Payments
Check: Stripe webhook idempotency (`stripe_webhook_events` table), price validation is server-side (not from request body), subscription flow.

### 7. Knowledge Hub → AI pipeline
Check: `/api/admin/clients/[id]/knowledge/extract` saves `extracted_facts` with status='done', `getClientAIContext()` in `lib/ai-config.ts` fetches from `knowledge_entries`, both autofill routes call `getClientAIContext`.

### 8. i18n
Check: `langToLocale()` helper used in sales-tab.tsx and activity-tab.tsx, no hardcoded `"da-DK"` locale strings remaining, `se` → `sv-SE` mapping present.

### 9. Known tech debt
Work through the "Known Issues" list in CLAUDE.md — verify which are resolved and which remain open.

---

**Human checkpoint** — present a draft of your findings before writing the final report.
Ask: *"Does this match what you know? Anything to add or adjust before I prioritize?"*

Wait for response.

---

### 10. Produce final report

```
## QA Report — [date]

### Build: ✅ Clean / 🚨 [N errors]

---

### 🚨 Critical (blocks client usage or causes data loss)
- [issue] — [file:line if relevant] — [why it breaks something]

### ⚠️ Gaps (product promise not met)
- [issue] — [what was promised vs what exists]

### ✅ Working
- [area]: [one-line status]

---

### Priority fix list
Phase 1 — Security & stability
1. [fix] — [file] — [why first]

Phase 2 — Integrity
...

Phase 3 — Completeness
...

Phase 4 — Tech debt
...
```

## Rules

- Read-only. Make no code changes during a QA run.
- Evaluate against the product vision, not code style.
- North star: "Would Thomas understand this in 3 seconds? Would Casper trust this running while under a sink?"
- If a feature is coded but the DB schema doesn't support it → 🚨 Critical.
- Don't mark anything ✅ without verifying both code AND DB state via Supabase MCP.
- Social poster marked "coming soon" is intentional — do not flag as a gap.
- Rate limiting and bcrypt are implemented — verify they're correctly wired, don't just assume.

## Self-improvement

After each run:
- If a recurring issue type is not covered in evaluation-criteria.md, add it there.
- If a new product area exists that the process above doesn't cover, add it to the process.
- If a rule would have prevented a false positive or false negative, add it.
