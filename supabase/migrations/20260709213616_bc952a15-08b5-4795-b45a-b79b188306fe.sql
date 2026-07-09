REVOKE EXECUTE ON FUNCTION public.notify_reply() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_follow() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_reship() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_ship_streak() FROM PUBLIC, anon, authenticated;