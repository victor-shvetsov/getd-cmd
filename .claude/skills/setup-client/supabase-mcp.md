# Supabase MCP — Setup Client Verification

Supabase project ID: `jjciiswzkaxlunjkwprp`

Use `mcp__supabase__execute_sql` with `project_id: "jjciiswzkaxlunjkwprp"` for all queries.

---

## 1 — Verify client was created

```sql
SELECT id, name, slug, pin, language, primary_color, created_at
FROM clients
WHERE slug = '<slug>'
LIMIT 1;
```

Expected: 1 row. If 0 rows → insert failed, check for constraint errors.

---

## 2 — Check slug is unique (run BEFORE inserting)

```sql
SELECT id, name FROM clients WHERE slug = '<slug>';
```

Expected: 0 rows. If any rows exist → slug is taken, pick a different one.

---

## 3 — Verify tabs were seeded

```sql
SELECT tab_key, sort_order, is_visible
FROM client_tabs
WHERE client_id = '<client_id>'
ORDER BY sort_order;
```

Expected results by archetype:

**Thomas (5 visible):**
```
sales       | 0 | true
demand      | 1 | true
activity    | 2 | true
assets      | 3 | true
automations | 4 | false
execution   | 5 | true
```

**Casper (2 visible):**
```
sales       | 0 | false
demand      | 1 | false
activity    | 2 | false
assets      | 3 | false
automations | 4 | true
execution   | 5 | true
```

**Full (6 visible):**
All 6 rows with `is_visible = true`.

---

## 4 — Verify automations (Casper only)

```sql
SELECT key, name, is_enabled,
       config->>'require_approval' AS require_approval,
       config->>'notify_email'     AS notify_email,
       config->>'draft_mode'       AS draft_mode
FROM automations
WHERE client_id = '<client_id>'
ORDER BY key;
```

Expected: 3 rows — `lead-reply`, `review-collector`, `social-poster`.
All should have `is_enabled = false`.
`lead-reply` and `social-poster` should have `require_approval = true`.

---

## 5 — Verify no orphaned tabs (sanity check)

```sql
SELECT COUNT(*) AS tab_count
FROM client_tabs
WHERE client_id = '<client_id>';
```

Expected: exactly 6 rows. More than 6 means duplicate inserts occurred.

---

## 6 — List all clients (for admin overview)

```sql
SELECT id, name, slug, language, created_at
FROM clients
ORDER BY created_at DESC
LIMIT 20;
```

---

## 7 — Check existing automations for a client

```sql
SELECT key, name, is_enabled, created_at
FROM automations
WHERE client_id = '<client_id>'
ORDER BY created_at;
```

---

## Common errors and fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `duplicate key value violates unique constraint "clients_slug_key"` | Slug already taken | Change slug and retry |
| `insert or update on table "client_tabs" violates foreign key constraint` | `client_id` doesn't exist | Verify client was inserted first (Step 2) |
| `null value in column "client_id"` | Forgot to capture returned ID | Re-run Step 2, capture `id` from RETURNING |
| 0 tab rows after insert | Insert silently failed | Check RLS — use service role key |
