REVOKE EXECUTE ON FUNCTION public.notify_follow() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_reply() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_like() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_reship() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_ship_streak() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.grant_admin_for_seed_email() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated;