-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  pin TEXT NOT NULL DEFAULT '0000',
  logo_url TEXT,
  theme JSONB NOT NULL DEFAULT '{}',
  font_family TEXT DEFAULT 'Inter',
  border_radius TEXT DEFAULT '0.5rem',
  translations JSONB DEFAULT '{}',
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
