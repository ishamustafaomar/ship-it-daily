create or replace function public.enforce_ship_limits()
returns trigger language plpgsql security definer set search_path=public as $$
declare n int;
begin
  if NEW.parent_ship_id is null then
    select count(*) into n from ships where author_id=NEW.author_id and parent_ship_id is null
      and created_at >= date_trunc('day', coalesce(NEW.created_at, now())) and created_at < date_trunc('day', coalesce(NEW.created_at, now())) + interval '1 day';
    if n >= 5 then raise exception 'Daily limit reached: max 5 posts per day. Combine updates into one bigger post.'; end if;
  else
    select count(*) into n from ships where author_id=NEW.author_id and parent_ship_id=NEW.parent_ship_id
      and created_at > now() - interval '24 hours';
    if n >= 3 then raise exception 'Reply limit reached: max 3 replies per thread per day. Edit or combine your replies instead.'; end if;
  end if;
  select count(*) into n from ships where author_id=NEW.author_id
    and created_at > now() - interval '24 hours'
    and lower(left(regexp_replace(body,'\s+',' ','g'),120)) = lower(left(regexp_replace(NEW.body,'\s+',' ','g'),120));
  if n > 0 then raise exception 'Looks like a duplicate of a post from the last 24 hours.'; end if;
  return NEW;
end $$;
revoke execute on function public.enforce_ship_limits() from anon, authenticated, public;
drop trigger if exists ships_enforce_limits on public.ships;
create trigger ships_enforce_limits before insert on public.ships for each row execute function public.enforce_ship_limits();