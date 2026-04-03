CREATE TABLE IF NOT EXISTS quran_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cache_key text UNIQUE NOT NULL,
  data jsonb NOT NULL,
  cached_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

ALTER TABLE quran_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read cache" ON quran_cache FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert cache" ON quran_cache FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update cache" ON quran_cache FOR UPDATE TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_quran_cache_key ON quran_cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_quran_cache_expires ON quran_cache(expires_at);
