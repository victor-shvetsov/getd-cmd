# Supabase MCP — getd-cmd Project

Project ID: `jjciiswzkaxlunjkwprp`

Always use the `mcp__supabase__execute_sql` tool for verification queries.
Always use `mcp__supabase__list_tables` to check table existence.

---

## Key tables

| Table | Purpose | Key columns |
|-------|---------|-------------|
| `clients` | One row per client | id, slug, pin, pin_hash, primary_color, secondary_color, font_family, border_radius |
| `client_tabs` | Tab config per client | client_id, tab_key, data (JSONB), is_visible, sort_order |
| `automations` | One per automation per client | client_id, automation_key, is_enabled, require_approval, config (JSONB), counter_value, counter_label |
| `automation_runs` | Every execution log | automation_id, client_id, status, draft_content, payload, input_summary, output_summary, ran_at |
| `knowledge_entries` | Knowledge Hub entries | client_id, raw_content, extracted_facts (JSONB), status (pending/processing/done/error) |
| `leads` | Inbound leads | client_id, from_email, from_name, subject, message, replied_at |
| `payments` | One-time payment records | client_id, stripe_session_id, status, paid_at |
| `subscriptions` | Recurring billing | client_id, stripe_subscription_id, status, invoices (JSONB array) |
| `pin_login_attempts` | Rate limiting for PIN auth | slug, attempted_at |
| `stripe_webhook_events` | Stripe idempotency | event_id (PRIMARY KEY), processed_at |

---

## Verification queries

### PIN security status
```sql
SELECT id, slug,
  CASE WHEN pin_hash IS NOT NULL THEN '✅ hashed' ELSE '🚨 plaintext' END AS pin_status
FROM clients
ORDER BY slug;
```

### Rate limiting table exists
```sql
SELECT COUNT(*) FROM pin_login_attempts;
```

### Stripe idempotency table exists
```sql
SELECT COUNT(*) FROM stripe_webhook_events;
```

### Automation schema (approval queue columns)
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'automations'
  AND column_name IN ('require_approval', 'config', 'counter_value')
ORDER BY column_name;
```

### automation_runs schema (draft mode columns)
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'automation_runs'
  AND column_name IN ('draft_content', 'payload', 'status')
ORDER BY column_name;
```

### automation_runs status constraint (valid statuses)
```sql
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name LIKE '%automation_runs_status%';
```

### All automations and their state
```sql
SELECT a.automation_key, a.is_enabled, a.require_approval,
       a.counter_value, c.slug AS client_slug
FROM automations a
JOIN clients c ON c.id = a.client_id
ORDER BY c.slug, a.automation_key;
```

### Pending approval drafts
```sql
SELECT r.id, r.status, r.ran_at, a.automation_key, c.slug
FROM automation_runs r
JOIN automations a ON a.id = r.automation_id
JOIN clients c ON c.id = r.client_id
WHERE r.status = 'pending_approval'
ORDER BY r.ran_at DESC;
```

### Tab visibility per client
```sql
SELECT c.slug, ct.tab_key, ct.is_visible, ct.sort_order
FROM client_tabs ct
JOIN clients c ON c.id = ct.client_id
ORDER BY c.slug, ct.sort_order;
```

### Knowledge entries pipeline status
```sql
SELECT c.slug, ke.status,
  CASE WHEN ke.extracted_facts IS NOT NULL THEN '✅ has facts' ELSE '❌ no facts' END AS facts_status
FROM knowledge_entries ke
JOIN clients c ON c.id = ke.client_id
ORDER BY c.slug;
```

### Clients missing the 6 core tabs
```sql
SELECT c.slug, array_agg(ct.tab_key) AS existing_tabs
FROM clients c
LEFT JOIN client_tabs ct ON ct.client_id = c.id
GROUP BY c.id, c.slug
HAVING NOT (array_agg(ct.tab_key) @> ARRAY['sales','demand','activity','assets','automations','execution'])
ORDER BY c.slug;
```
