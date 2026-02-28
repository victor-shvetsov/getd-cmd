-- ── 004: leads table ─────────────────────────────────────────────────────────
-- Stores parsed inbound leads before and after the automation replies.

CREATE TABLE IF NOT EXISTS public.leads (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  from_name    TEXT,
  from_email   TEXT        NOT NULL,
  subject      TEXT,
  message      TEXT        NOT NULL,
  raw_email    TEXT,                      -- original raw body for debugging
  replied_at   TIMESTAMPTZ,              -- set after lead_reply automation succeeds
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast per-client queries, newest first
CREATE INDEX IF NOT EXISTS leads_client_id_idx
  ON public.leads (client_id, created_at DESC);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
-- Service role bypasses RLS automatically — no explicit policy needed.
