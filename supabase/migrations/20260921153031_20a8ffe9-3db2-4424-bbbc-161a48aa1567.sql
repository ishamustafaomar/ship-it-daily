CREATE TABLE public.autopost_scheduler_credentials (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.autopost_scheduler_credentials TO service_role;

ALTER TABLE public.autopost_scheduler_credentials ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_autopost_scheduler_credentials_updated_at
BEFORE UPDATE ON public.autopost_scheduler_credentials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.autopost_scheduler_credentials (id, token)
VALUES (1, encode(gen_random_bytes(48), 'hex'));

SELECT cron.schedule(
  'shippedin-autopost-hourly',
  '0 * * * *',
  $cron$
  SELECT net.http_post(
    url := 'https://project--2812e9fb-75d6-4025-9715-3d9d9b4a6cca.lovable.app/api/public/hooks/autopost',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', token
    ),
    body := '{}'::jsonb
  ) AS request_id
  FROM public.autopost_scheduler_credentials
  WHERE id = 1;
  $cron$
);