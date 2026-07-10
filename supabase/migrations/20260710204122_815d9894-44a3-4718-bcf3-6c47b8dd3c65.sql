CREATE TABLE public.reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ship_id UUID NOT NULL REFERENCES public.ships(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('🔥','🚀','👏','💡','🎉')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ship_id, user_id, emoji)
);
CREATE INDEX reactions_ship_idx ON public.reactions(ship_id);
CREATE INDEX reactions_user_idx ON public.reactions(user_id);
GRANT SELECT, INSERT, DELETE ON public.reactions TO authenticated;
GRANT SELECT ON public.reactions TO anon;
GRANT ALL ON public.reactions TO service_role;
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reactions public read" ON public.reactions FOR SELECT USING (true);
CREATE POLICY "reactions insert own" ON public.reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reactions delete own" ON public.reactions FOR DELETE USING (auth.uid() = user_id);