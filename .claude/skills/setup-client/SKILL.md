---
name: setup-client
description: >
  Guided onboarding checklist for adding a new client to the platform.
  Covers DB record creation, tab seeding, branding setup, PIN generation,
  and automation configuration. Use when Victor asks to "set up a client",
  "add a new client", or "onboard a client".
argument-hint: "<client-name> [archetype: thomas|casper|full]"
context: fork
---

# /setup-client

## Goal
Walk through every step needed to get a new client fully live on the platform —
from DB record to branded portal with the right tabs enabled.

## Reference files
- `client-archetypes.md` — Thomas, Casper, Full-service: tabs, automations, and config per archetype
- `supabase-mcp.md` — verification queries using Supabase MCP

---

## Step 0 — Parse arguments
Read `<client-name>` and `[archetype]` from the slash command arguments.

If archetype is not provided, ask the user:
> "Which client type best describes this client?
> - **thomas** — e-commerce, needs Sales + Demand + Assets + Execution
> - **casper** — service business, needs Automations + Execution only
> - **full** — full-service marketing client, all 6 tabs

Confirm before proceeding.

---

## Step 1 — Gather required details

Ask the user to provide (or confirm defaults):

| Field | Required | Default |
|-------|----------|---------|
| Client name | Yes | — |
| Slug (URL key, lowercase-hyphen) | Yes | auto-suggest from name |
| PIN (4–8 digits) | Yes | generate random 6-digit |
| Primary color (hex) | No | `#2563eb` |
| Logo URL | No | blank |
| Language | No | `da` |
| Contact email (for automation notifications) | No | — |

**HUMAN CHECKPOINT** — show all values in a table. Wait for approval before touching the DB.

---

## Step 2 — Create client record

Use `mcp__supabase__execute_sql` to insert the client:

```sql
INSERT INTO clients (
  name, slug, pin,
  primary_color, secondary_color,
  logo_url, language
) VALUES (
  '<name>', '<slug>', '<pin>',
  '<primary_color>', '<secondary_color>',
  '<logo_url>', '<language>'
)
RETURNING id, name, slug;
```

Capture the returned `id` — it's needed for every subsequent step.

---

## Step 3 — Seed tabs for the archetype

Look up the archetype in `client-archetypes.md` to get the tab list.

For each tab in the archetype's tab list, insert a `client_tabs` row:

```sql
INSERT INTO client_tabs (client_id, tab_key, sort_order, data, is_visible)
VALUES
  ('<client_id>', 'sales',       0, '{}', <is_visible>),
  ('<client_id>', 'demand',      1, '{}', <is_visible>),
  ('<client_id>', 'activity',    2, '{}', <is_visible>),
  ('<client_id>', 'assets',      3, '{}', <is_visible>),
  ('<client_id>', 'automations', 4, '{}', <is_visible>),
  ('<client_id>', 'execution',   5, '{}', <is_visible>);
```

For hidden tabs (not in the archetype), set `is_visible = false`.
For the archetype's active tabs, set `is_visible = true`.

---

## Step 4 — Seed automations (Casper archetype only)

If archetype is `casper`, create the three automation rows.
Read the full config spec from `client-archetypes.md` → Casper section.

```sql
INSERT INTO automations (client_id, key, name, is_enabled, config)
VALUES
  ('<client_id>', 'lead-reply',       'Lead Reply',       false, '<config_json>'),
  ('<client_id>', 'social-poster',    'Social Poster',    false, '<config_json>'),
  ('<client_id>', 'review-collector', 'Review Collector', false, '<config_json>');
```

All start `is_enabled = false`. Victor or the client enables them after setup.

For `thomas` and `full` archetypes, skip this step (no automations pre-seeded).

---

## Step 5 — Verify with Supabase MCP

Run the verification queries from `supabase-mcp.md`:
1. Client exists and has correct slug
2. Correct number of tabs, correct visibility flags
3. Automation rows present (Casper only)
4. Portal URL is reachable

---

## Step 6 — Deliver handoff summary

Output a formatted summary:

```
✅ Client setup complete: <name>

Portal URL:   https://getd.dk/<slug>
Admin URL:    https://getd.dk/admin → search "<name>"
PIN:          <pin>
Archetype:    <archetype>
Tabs enabled: <list>

Next steps:
1. Upload logo at: Admin → <name> → Branding
2. Fill in Knowledge Bank (at least one entry, then Extract)
3. Set currency and revenue goal in Sales tab
4. [ Casper only ] Configure automation voice samples in Automations tab
5. Share portal URL + PIN with client
```

---

## Rules
- Never create a client without the human checkpoint in Step 1
- Never reuse a slug — check for conflicts before inserting
- Never hardcode the Supabase project URL — use MCP tools
- PIN is stored plaintext (known issue — don't make it worse, don't hash it differently)
- If a step fails, report the error and stop — do not proceed to later steps with broken state

---

## Self-improvement
If a new archetype is added to the product, add it to `client-archetypes.md`.
If the DB schema changes, update the SQL templates in this file.
If a common setup mistake is found, add it to the Rules section.
