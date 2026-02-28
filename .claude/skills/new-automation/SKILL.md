---
name: new-automation
description: Scaffold a complete new automation following the WAT pattern — creates index.ts, workflow.ts, tools.ts, registers in registry, and outputs the DB migration SQL. Use when adding any new automation to lib/automations/.
argument-hint: <automation-key> "<Automation Name>"
---

## Goal

Scaffold a production-ready automation following the exact WAT pattern used in this project. The output should be ready to implement — not a skeleton, but a working starting point with the right structure, error handling, draft mode support, and registry entry.

## Before you start

Load these reference files:
- [automation-patterns.md](automation-patterns.md) — interface, conventions, and required patterns
- [example/index.ts](example/index.ts) — canonical implementation (lead-reply)
- [example/workflow.ts](example/workflow.ts) — canonical system prompt builder
- [example/tools.ts](example/tools.ts) — canonical tool function

Also read `lib/automations/base.ts` and `lib/automations/registry.ts` from the project.

## Process

### 1. Parse arguments
From `$ARGUMENTS`:
- First word = `automation_key` (snake_case, e.g. `social_poster`)
- Remaining = human name (e.g. "Social Media Auto-Poster")

If no arguments provided, ask: "What should the automation key and name be?"

### 2. Gather requirements (human checkpoint)

Ask these questions (can be answered together):
> 1. **What triggers this automation?** (inbound email / external webhook / scheduled cron)
> 2. **What does it send or post?** (email reply / social post / SMS / webhook call)
> 3. **What payload fields does the trigger send?** (e.g. `from_email`, `customer_name`, `image_url`)
> 4. **What config fields does Victor set per client?** (e.g. `from_email`, `voice_samples`, `review_link`)
> 5. **Should draft mode be supported?** (yes for most — client can review before sending)

Wait for answers before scaffolding.

### 3. Scaffold the files

Create these files (follow [example/](example/) exactly for structure):

**`lib/automations/[key]/workflow.ts`**
- Single exported function: `buildSystemPrompt(config: { ... }): string`
- System prompt instructs Claude to produce the specific output (email, caption, etc.)
- Rules section: what NOT to do, length limits, tone constraints
- Mirrors the voice/persona from config

**`lib/automations/[key]/tools.ts`**
- One or more deterministic async functions
- Each returns `{ success: boolean; error?: string; [key]?: unknown }`
- Import Resend or relevant SDK at top
- Checks for API key env var at the start, returns error if missing

**`lib/automations/[key]/index.ts`**
- Class implementing `AutomationRunner` from `../base`
- `readonly key` matches the automation_key exactly
- Validates payload at top (return early with error if missing required fields)
- Validates config at top (return early with error if missing required config)
- Calls `buildSystemPrompt()` from workflow.ts
- Calls Claude API (`new Anthropic()`, model: `"claude-sonnet-4-6"`)
- **Always implements draft mode check** before calling tools:
  ```typescript
  if (config.draftMode) {
    return { success: true, summary: `Draft created for ...`, draftContent: generatedText, increment: 0 };
  }
  ```
- Calls tool function, checks result.success
- Returns correct increment (usually 1 per action taken)

### 4. Registry entry (human checkpoint)

Show the import line and array entry to add to `lib/automations/registry.ts`.
Ask: *"Should I update registry.ts now?"*

If yes, add the import and register the new automation.

### 5. DB migration SQL

Output the SQL to insert the automation into the `automations` table.
Do NOT apply it — print it so Victor can run it via Supabase MCP or admin panel:

```sql
INSERT INTO automations (client_id, automation_key, name, description, counter_label, is_enabled, require_approval, config, sort_order)
VALUES (
  '[CLIENT_ID]',  -- replace with actual client UUID
  '[key]',
  '[Name]',
  '[One sentence: what it does for the client]',
  '[action unit plural, e.g. "reviews collected"]',
  false,          -- disabled until configured
  false,          -- approval mode off by default
  '{
    "from_email": "",
    "from_name": "",
    [other config fields with empty defaults]
  }',
  [sort_order]
);
```

### 6. Summary

Print a checklist of what was created and what's left to do:
```
✅ lib/automations/[key]/workflow.ts — created
✅ lib/automations/[key]/tools.ts — created
✅ lib/automations/[key]/index.ts — created
✅ lib/automations/registry.ts — updated
⏳ DB record — run the SQL above via Supabase MCP or admin panel
⏳ Configure client config (from_email, voice_samples, etc.)
⏳ Set up Resend/API credentials if needed
⏳ Test with pnpm build
```

## Rules

- Never skip draft mode support — all automations must implement the `config.draftMode` check
- `automation_key` in the class must exactly match the DB `automation_key` value
- Tools must check for required env vars and return `{ success: false, error: "..." }` if missing — never throw
- Keep `workflow.ts` as a pure function — no API calls, no side effects
- Keep `SKILL.md` focused on process — add new patterns to `automation-patterns.md` instead
- Always use `claude-sonnet-4-6` as the model for production automations in this project
- Run `pnpm build` after scaffolding — TypeScript errors must be fixed before marking done

## Self-improvement

After each scaffolding run:
- If a new pattern was used that isn't in automation-patterns.md, add it there
- If a config field convention was used that differs from the pattern, update the convention
- If an edge case was handled that could apply to other automations, add it as a rule
