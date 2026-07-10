
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS focus_tags text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.ships ADD COLUMN IF NOT EXISTS topic_tags text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS ships_topic_tags_gin ON public.ships USING GIN (topic_tags);
CREATE INDEX IF NOT EXISTS profiles_focus_tags_gin ON public.profiles USING GIN (focus_tags);
