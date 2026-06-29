
-- RLS for renders + audio-uploads buckets (user-scoped by folder = auth.uid())
CREATE POLICY "renders read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'renders' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "renders insert own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'renders' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "renders delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'renders' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "audio read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'audio-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "audio insert own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'audio-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "audio delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'audio-uploads' AND (storage.foldername(name))[1] = auth.uid()::text);
