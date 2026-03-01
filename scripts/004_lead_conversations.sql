-- Lead conversations: every email flowing through a client's monitored inbox
-- Inbound = leads/clients writing in; Outbound = replies sent (AI-generated or manual)
-- Powers the AI Voice Training corpus in the Knowledge Hub
-- Applied: 2026-03-01

CREATE TABLE IF NOT EXISTS public.lead_conversations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         UUID        NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  lead_id           UUID        REFERENCES public.leads(id) ON DELETE SET NULL,
  automation_run_id UUID        REFERENCES public.automation_runs(id) ON DELETE SET NULL,

  direction         TEXT        NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_email        TEXT        NOT NULL,
  to_email          TEXT        NOT NULL,
  subject           TEXT,
  content           TEXT        NOT NULL DEFAULT '',

  -- Email headers for thread detection
  message_id        TEXT,       -- Message-ID header (for dedup reference)
  in_reply_to       TEXT,       -- In-Reply-To header (thread linking)

  -- Training signal quality markers
  was_ai_generated  BOOLEAN     NOT NULL DEFAULT false,
  was_edited        BOOLEAN     NOT NULL DEFAULT false,  -- client edited AI draft before approving

  sent_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_lead_conv_client_id   ON public.lead_conversations(client_id);
CREATE INDEX IF NOT EXISTS idx_lead_conv_from_email  ON public.lead_conversations(client_id, from_email);
CREATE INDEX IF NOT EXISTS idx_lead_conv_lead_id     ON public.lead_conversations(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_conv_sent_at     ON public.lead_conversations(client_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_conv_direction   ON public.lead_conversations(client_id, direction);

-- RLS
ALTER TABLE public.lead_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read lead_conversations"
  ON public.lead_conversations FOR SELECT USING (true);

CREATE POLICY "Service role can insert lead_conversations"
  ON public.lead_conversations FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update lead_conversations"
  ON public.lead_conversations FOR UPDATE USING (true);

CREATE POLICY "Service role can delete lead_conversations"
  ON public.lead_conversations FOR DELETE USING (true);
