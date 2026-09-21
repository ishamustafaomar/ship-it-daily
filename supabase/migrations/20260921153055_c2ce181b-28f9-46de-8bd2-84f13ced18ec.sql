CREATE POLICY "Backend can read autopost scheduler credentials"
ON public.autopost_scheduler_credentials
FOR SELECT
TO service_role
USING (true);