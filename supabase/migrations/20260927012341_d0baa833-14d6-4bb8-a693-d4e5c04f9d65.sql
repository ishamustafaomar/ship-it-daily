CREATE OR REPLACE FUNCTION public.reschedule_autopost(_hour int)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, cron AS $$
BEGIN
  IF _hour < 0 OR _hour > 23 THEN RAISE EXCEPTION 'invalid hour'; END IF;
  PERFORM cron.alter_job(
    (SELECT jobid FROM cron.job WHERE jobname = 'shippedin-autopost-hourly'),
    schedule := format('0 %s * * *', _hour)
  );
END $$;
REVOKE EXECUTE ON FUNCTION public.reschedule_autopost(int) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_autopost(int) TO service_role;
SELECT public.reschedule_autopost((SELECT post_hour_utc FROM public.autopost_settings WHERE id = 1));