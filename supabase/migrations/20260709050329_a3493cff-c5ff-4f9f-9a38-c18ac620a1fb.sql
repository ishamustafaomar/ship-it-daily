
CREATE POLICY "ship_images_read" ON storage.objects FOR SELECT USING (bucket_id = 'ship-images');
CREATE POLICY "ship_images_insert_own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'ship-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "ship_images_update_own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'ship-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "ship_images_delete_own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'ship-images' AND auth.uid()::text = (storage.foldername(name))[1]);
