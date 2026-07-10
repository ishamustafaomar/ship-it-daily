
-- Track which ships were autoposted
ALTER TABLE public.ships ADD COLUMN IF NOT EXISTS is_autoposted BOOLEAN NOT NULL DEFAULT false;

-- Singleton settings table
CREATE TABLE IF NOT EXISTS public.autopost_settings (
  id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT false,
  post_hour_utc INTEGER NOT NULL DEFAULT 10 CHECK (post_hour_utc BETWEEN 0 AND 23),
  bot_user_id UUID,
  last_run_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.autopost_settings TO authenticated;
GRANT ALL ON public.autopost_settings TO service_role;

ALTER TABLE public.autopost_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read autopost settings"
  ON public.autopost_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert autopost settings"
  ON public.autopost_settings FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update autopost settings"
  ON public.autopost_settings FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.autopost_settings (id) VALUES (1)
  ON CONFLICT (id) DO NOTHING;

-- History / drafts
CREATE TABLE IF NOT EXISTS public.autopost_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  category TEXT NOT NULL,
  prompt TEXT NOT NULL,
  generated_text TEXT NOT NULL,
  post_type TEXT NOT NULL DEFAULT 'discussion',
  tool_tag TEXT,
  topic_tags TEXT[] NOT NULL DEFAULT '{}',
  length_band TEXT,
  ship_id UUID REFERENCES public.ships(id) ON DELETE SET NULL,
  published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  scheduled_for DATE,
  attempts INTEGER NOT NULL DEFAULT 1,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS autopost_history_generated_at_idx
  ON public.autopost_history (generated_at DESC);
CREATE INDEX IF NOT EXISTS autopost_history_published_idx
  ON public.autopost_history (published, published_at DESC);
CREATE INDEX IF NOT EXISTS autopost_history_scheduled_idx
  ON public.autopost_history (scheduled_for);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.autopost_history TO authenticated;
GRANT ALL ON public.autopost_history TO service_role;

ALTER TABLE public.autopost_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read autopost history"
  ON public.autopost_history FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert autopost history"
  ON public.autopost_history FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update autopost history"
  ON public.autopost_history FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete autopost history"
  ON public.autopost_history FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_autopost_settings_updated_at ON public.autopost_settings;
CREATE TRIGGER update_autopost_settings_updated_at
  BEFORE UPDATE ON public.autopost_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_autopost_history_updated_at ON public.autopost_history;
CREATE TRIGGER update_autopost_history_updated_at
  BEFORE UPDATE ON public.autopost_history
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
