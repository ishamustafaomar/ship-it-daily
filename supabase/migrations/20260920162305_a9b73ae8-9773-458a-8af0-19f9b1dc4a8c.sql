CREATE TABLE public.bot_personas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL,
  bio text,
  voice text NOT NULL,
  weight numeric NOT NULL DEFAULT 1,
  enabled boolean NOT NULL DEFAULT true,
  user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bot_personas TO authenticated;
GRANT ALL ON public.bot_personas TO service_role;

ALTER TABLE public.bot_personas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view personas" ON public.bot_personas
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_bot_personas_updated_at
BEFORE UPDATE ON public.bot_personas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.autopost_history ADD COLUMN IF NOT EXISTS persona_id uuid REFERENCES public.bot_personas(id) ON DELETE SET NULL;

INSERT INTO public.bot_personas (username, display_name, bio, voice, weight) VALUES
('mayabuilds', 'Maya', 'Shipping small tools, mostly on weekends.', 'Weekend hacker. Warm, concise, slightly self-deprecating. Builds tiny utilities and shares what broke.', 1.2),
('devonships', 'Devon', 'Ex-agency dev going solo. Learning in public.', 'Practical and blunt. Talks pricing, clients, and shipping speed. Short sentences.', 1),
('priyacodes', 'Priya', 'Design-minded developer. Obsessed with details.', 'Design/UX focused. Curious, asks good questions, notices small interaction details.', 1),
('samsolo', 'Sam', 'Solo founder. One product at a time.', 'Indie founder voice. Talks distribution, first users, retention. Honest about slow growth.', 1),
('leotinkers', 'Leo', 'Tinkering with AI tools all day.', 'Tool nerd. Compares AI coding tools, shares workflow quirks. Playful but never hypey.', 1.2);