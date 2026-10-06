create or replace function public.enforce_ship_limits()
returns trigger language plpgsql security definer set search_path=public as $$
declare n int;
begin
  if NEW.parent_ship_id is null then
    select count(*) into n from ships where author_id=NEW.author_id and parent_ship_id is null
      and created_at > now() - interval '24 hours';
    if n >= 50 then raise exception 'That''s a lot of posts today. Take a break and try again later.'; end if;
  else
    select count(*) into n from ships where author_id=NEW.author_id and parent_ship_id=NEW.parent_ship_id
      and created_at > now() - interval '24 hours';
    if n >= 20 then raise exception 'That''s a lot of replies on one post. Try again later.'; end if;
  end if;
  select count(*) into n from ships where author_id=NEW.author_id
    and created_at > now() - interval '24 hours'
    and lower(left(regexp_replace(body,'\s+',' ','g'),120)) = lower(left(regexp_replace(NEW.body,'\s+',' ','g'),120));
  if n > 0 then raise exception 'Looks like a duplicate of a post from the last 24 hours.'; end if;
  return NEW;
end $$;