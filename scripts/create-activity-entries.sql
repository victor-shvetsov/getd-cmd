-- Activity entries table for Tab 3: "What is my marketing guy doing?"
-- Stores activity log entries that Victor adds from the admin panel.

CREATE TABLE IF NOT EXISTS activity_entries (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id     UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  category      TEXT DEFAULT 'general',    -- seo | ads | website | automation | general
  is_visible    BOOLEAN DEFAULT true,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Index for fast client lookups
CREATE INDEX IF NOT EXISTS idx_activity_entries_client
  ON activity_entries(client_id, created_at DESC);

-- Enable RLS
ALTER TABLE activity_entries ENABLE ROW LEVEL SECURITY;

-- Policy: service role can do everything (admin API uses service role key)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'activity_entries' AND policyname = 'admin_full_access_activity'
  ) THEN
    CREATE POLICY admin_full_access_activity ON activity_entries
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
