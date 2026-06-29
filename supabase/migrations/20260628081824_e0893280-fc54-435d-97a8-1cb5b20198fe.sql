
-- Lock down translation cache inserts to authenticated only (not anon-equivalent)
DROP POLICY IF EXISTS "auth insert cache" ON public.translations_cache;
CREATE POLICY "auth insert cache" ON public.translations_cache FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Revoke public execution on security-definer helpers (triggers still work)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
-- authenticated still needs has_role for policies; that's fine
