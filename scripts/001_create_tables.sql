-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  pin TEXT NOT NULL DEFAULT '0000',
  logo_url TEXT,

  -- Theme (HSL values stored as text, matching existing CSS custom property pattern)
  theme JSONB NOT NULL DEFAULT '{}',

  -- Font & radius
  font_family TEXT DEFAULT 'Inter',
  border_radius TEXT DEFAULT '0.5rem',

  -- Translations (per-client overrides: { "en": { "key": "value" }, "hr": { ... } })
  translations JSONB DEFAULT '{}',

  -- Languages
  available_languages TEXT[] DEFAULT ARRAY['en'],
  default_language TEXT DEFAULT 'en',

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create client_tabs table
CREATE TABLE IF NOT EXISTS public.client_tabs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  tab_key TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  sort_order INT DEFAULT 0,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(client_id, tab_key)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_clients_slug ON public.clients(slug);
CREATE INDEX IF NOT EXISTS idx_client_tabs_client_id ON public.client_tabs(client_id);
CREATE INDEX IF NOT EXISTS idx_client_tabs_client_tab ON public.client_tabs(client_id, tab_key);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_tabs ENABLE ROW LEVEL SECURITY;

-- RLS Policies: anyone can read (client-facing), only service role can write
CREATE POLICY "Anyone can read clients" ON public.clients FOR SELECT USING (true);
CREATE POLICY "Anyone can read client_tabs" ON public.client_tabs FOR SELECT USING (true);

-- Service role bypass (service role always bypasses RLS, but let's be explicit for admin writes)
CREATE POLICY "Service role can insert clients" ON public.clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update clients" ON public.clients FOR UPDATE USING (true);
CREATE POLICY "Service role can delete clients" ON public.clients FOR DELETE USING (true);

CREATE POLICY "Service role can insert client_tabs" ON public.client_tabs FOR INSERT WITH CHECK (true);
CREATE POLICY "Service role can update client_tabs" ON public.client_tabs FOR UPDATE USING (true);
CREATE POLICY "Service role can delete client_tabs" ON public.client_tabs FOR DELETE USING (true);

-- Create storage bucket for client logos
INSERT INTO storage.buckets (id, name, public) VALUES ('client-logos', 'client-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: public read, authenticated/service role write
CREATE POLICY "Public read logos" ON storage.objects FOR SELECT USING (bucket_id = 'client-logos');
CREATE POLICY "Service role upload logos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'client-logos');
CREATE POLICY "Service role update logos" ON storage.objects FOR UPDATE USING (bucket_id = 'client-logos');
CREATE POLICY "Service role delete logos" ON storage.objects FOR DELETE USING (bucket_id = 'client-logos');
