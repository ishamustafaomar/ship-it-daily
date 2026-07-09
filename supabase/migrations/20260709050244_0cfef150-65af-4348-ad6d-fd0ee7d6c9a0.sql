
-- =========================================================
-- PROFILES
-- =========================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  building_now TEXT,
  streak_count INT NOT NULL DEFAULT 0,
  longest_streak INT NOT NULL DEFAULT 0,
  last_ship_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX profiles_username_idx ON public.profiles (lower(username));
GRANT SELECT ON public.profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_self" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_self" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- =========================================================
-- SHIPS
-- =========================================================
CREATE TABLE public.ships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  tool_tag TEXT,
  link_url TEXT,
  image_url TEXT,
  parent_ship_id UUID REFERENCES public.ships(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ships_author_created_idx ON public.ships (author_id, created_at DESC);
CREATE INDEX ships_created_idx ON public.ships (created_at DESC);
CREATE INDEX ships_parent_idx ON public.ships (parent_ship_id);
CREATE INDEX ships_tool_tag_idx ON public.ships (tool_tag);
GRANT SELECT ON public.ships TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ships TO authenticated;
GRANT ALL ON public.ships TO service_role;
ALTER TABLE public.ships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ships_select_all" ON public.ships FOR SELECT USING (true);
CREATE POLICY "ships_insert_own" ON public.ships FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "ships_update_own" ON public.ships FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "ships_delete_own" ON public.ships FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- =========================================================
-- LIKES
-- =========================================================
CREATE TABLE public.likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ship_id UUID NOT NULL REFERENCES public.ships(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ship_id, user_id)
);
CREATE INDEX likes_ship_idx ON public.likes (ship_id);
CREATE INDEX likes_user_idx ON public.likes (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.likes TO authenticated;
GRANT SELECT ON public.likes TO anon;
GRANT ALL ON public.likes TO service_role;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes_select_all" ON public.likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_own" ON public.likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_own" ON public.likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- RESHIPS
-- =========================================================
CREATE TABLE public.reships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ship_id UUID NOT NULL REFERENCES public.ships(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (ship_id, user_id)
);
CREATE INDEX reships_ship_idx ON public.reships (ship_id);
CREATE INDEX reships_user_idx ON public.reships (user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reships TO authenticated;
GRANT SELECT ON public.reships TO anon;
GRANT ALL ON public.reships TO service_role;
ALTER TABLE public.reships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reships_select_all" ON public.reships FOR SELECT USING (true);
CREATE POLICY "reships_insert_own" ON public.reships FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reships_delete_own" ON public.reships FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- =========================================================
-- FOLLOWS
-- =========================================================
CREATE TABLE public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (follower_id, following_id),
  CHECK (follower_id <> following_id)
);
CREATE INDEX follows_follower_idx ON public.follows (follower_id);
CREATE INDEX follows_following_idx ON public.follows (following_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.follows TO authenticated;
GRANT SELECT ON public.follows TO anon;
GRANT ALL ON public.follows TO service_role;
ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "follows_select_all" ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows_insert_own" ON public.follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete_own" ON public.follows FOR DELETE TO authenticated USING (auth.uid() = follower_id);

-- =========================================================
-- NOTIFICATIONS
-- =========================================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('like','reship','reply','follow')),
  ship_id UUID REFERENCES public.ships(id) ON DELETE CASCADE,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notif_recipient_idx ON public.notifications (recipient_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notif_select_own" ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = recipient_id);
CREATE POLICY "notif_update_own" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = recipient_id) WITH CHECK (auth.uid() = recipient_id);
CREATE POLICY "notif_delete_own" ON public.notifications FOR DELETE TO authenticated USING (auth.uid() = recipient_id);
-- Inserts come only from SECURITY DEFINER triggers below; no INSERT policy needed.

-- =========================================================
-- new user -> profile row
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================
-- streak logic on top-level ship
-- =========================================================
CREATE OR REPLACE FUNCTION public.handle_ship_streak()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  today DATE := (NEW.created_at AT TIME ZONE 'UTC')::date;
  last_date DATE;
  new_streak INT;
  cur_longest INT;
BEGIN
  IF NEW.parent_ship_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT last_ship_date, longest_streak INTO last_date, cur_longest
  FROM public.profiles WHERE id = NEW.author_id FOR UPDATE;

  IF last_date = today THEN
    RETURN NEW;
  ELSIF last_date = today - 1 THEN
    UPDATE public.profiles
      SET streak_count = streak_count + 1,
          last_ship_date = today,
          longest_streak = GREATEST(longest_streak, streak_count + 1)
      WHERE id = NEW.author_id;
  ELSE
    UPDATE public.profiles
      SET streak_count = 1,
          last_ship_date = today,
          longest_streak = GREATEST(longest_streak, 1)
      WHERE id = NEW.author_id;
  END IF;

  RETURN NEW;
END;
$$;
CREATE TRIGGER on_ship_insert_streak
AFTER INSERT ON public.ships
FOR EACH ROW EXECUTE FUNCTION public.handle_ship_streak();

-- =========================================================
-- notifications triggers
-- =========================================================
CREATE OR REPLACE FUNCTION public.notify_like()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recipient UUID;
BEGIN
  SELECT author_id INTO recipient FROM public.ships WHERE id = NEW.ship_id;
  IF recipient IS NOT NULL AND recipient <> NEW.user_id THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, ship_id)
    VALUES (recipient, NEW.user_id, 'like', NEW.ship_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_like_notify AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.notify_like();

CREATE OR REPLACE FUNCTION public.notify_reship()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recipient UUID;
BEGIN
  SELECT author_id INTO recipient FROM public.ships WHERE id = NEW.ship_id;
  IF recipient IS NOT NULL AND recipient <> NEW.user_id THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, ship_id)
    VALUES (recipient, NEW.user_id, 'reship', NEW.ship_id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_reship_notify AFTER INSERT ON public.reships
FOR EACH ROW EXECUTE FUNCTION public.notify_reship();

CREATE OR REPLACE FUNCTION public.notify_reply()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recipient UUID;
BEGIN
  IF NEW.parent_ship_id IS NULL THEN RETURN NEW; END IF;
  SELECT author_id INTO recipient FROM public.ships WHERE id = NEW.parent_ship_id;
  IF recipient IS NOT NULL AND recipient <> NEW.author_id THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type, ship_id)
    VALUES (recipient, NEW.author_id, 'reply', NEW.id);
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_reply_notify AFTER INSERT ON public.ships
FOR EACH ROW EXECUTE FUNCTION public.notify_reply();

CREATE OR REPLACE FUNCTION public.notify_follow()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.follower_id <> NEW.following_id THEN
    INSERT INTO public.notifications (recipient_id, actor_id, type)
    VALUES (NEW.following_id, NEW.follower_id, 'follow');
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_follow_notify AFTER INSERT ON public.follows
FOR EACH ROW EXECUTE FUNCTION public.notify_follow();
