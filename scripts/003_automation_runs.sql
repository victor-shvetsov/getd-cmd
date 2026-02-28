-- Migration: add automation_runs table + update automations table
-- Run this in the Supabase SQL editor.
--
-- NOTE: This file reflects the ACTUAL current DB state (already applied to prod).
-- The original migration was applied and then extended in-place.
-- This is the authoritative version to use for fresh setup.

-- ── 1. Drop webhook_url from automations (no longer used) ──────────────
ALTER TABLE public.automations
  DROP COLUMN IF EXISTS webhook_url;

-- ── 2. Create automation_runs table ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.automation_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id   UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  client_id       UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN (
                      'pending',
                      'running',
                      'success',
                      'error',
                      'pending_approval',   -- draft waiting for client review
                      'approved',           -- client approved and message was sent
                      'discarded'           -- client discarded the draft
                    )),
  input_summary   TEXT,          -- short description of what triggered this run
  output_summary  TEXT,          -- short description of what was done
  error           TEXT,          -- error message if status = 'error'
  draft_content   TEXT,          -- generated content when status = 'pending_approval'
  payload         JSONB,         -- original trigger payload (stored for approve endpoint)
  ran_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast per-client and per-automation queries
CREATE INDEX IF NOT EXISTS automation_runs_client_id_idx
  ON public.automation_runs (client_id, ran_at DESC);

CREATE INDEX IF NOT EXISTS automation_runs_automation_id_idx
  ON public.automation_runs (automation_id, ran_at DESC);

-- Index for fast pending_approval lookups (approval queue)
CREATE INDEX IF NOT EXISTS automation_runs_pending_idx
  ON public.automation_runs (client_id, status)
  WHERE status = 'pending_approval';

-- ── 3. RPC: atomic counter increment ──────────────────────────────────
-- Called by the trigger route after a successful automation run.
CREATE OR REPLACE FUNCTION public.increment_automation_counter(
  p_automation_id UUID,
  p_increment     INT DEFAULT 1
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.automations
  SET
    counter_value = counter_value + p_increment,
    updated_at    = now()
  WHERE id = p_automation_id;
$$;

-- ── 4. RLS: service role writes, public reads own rows ─────────────────
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;

-- Service role (used by API routes) bypasses RLS automatically.
-- No explicit policy needed for service role.

-- Public: no direct read access (runs are admin/internal only)
-- If you want clients to see their own run history in future, add:
-- CREATE POLICY "clients_read_own_runs" ON public.automation_runs
--   FOR SELECT USING (
--     client_id = (
--       SELECT id FROM public.clients
--       WHERE slug = current_setting('app.client_slug', true)
--     )
--   );
