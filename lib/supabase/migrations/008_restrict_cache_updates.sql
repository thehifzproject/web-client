-- Tighten quran_cache RLS to prevent cache poisoning.
-- Previously any authenticated user could overwrite any cache entry.
-- Now only expired entries can be refreshed.

DROP POLICY IF EXISTS "Authenticated users can update cache" ON quran_cache;

CREATE POLICY "Authenticated users can refresh expired cache" ON quran_cache
  FOR UPDATE TO authenticated
  USING (expires_at < now());
