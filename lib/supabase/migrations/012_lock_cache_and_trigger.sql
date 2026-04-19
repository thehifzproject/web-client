-- Lock down quran_cache and harden the handle_new_user() trigger.
--
-- H1: Previously any authenticated user could INSERT new rows into quran_cache
--     (and migration 008 still let them UPDATE expired rows). Combined with the
--     public SELECT policy, this let a malicious authenticated user poison the
--     cache with arbitrary JSON that the server would serve to everyone.
--     Fix: strip all write policies for normal users. Writes now flow through
--     the service-role admin client from server code only.
--
-- H2: handle_new_user() is SECURITY DEFINER but has no SET search_path, so a
--     hostile schema on the search path could shadow `profiles`/`preferences`
--     during the trigger and run attacker SQL as the function owner.
--     Fix: pin search_path to public, pg_catalog.

DROP POLICY IF EXISTS "Authenticated users can insert cache" ON quran_cache;
DROP POLICY IF EXISTS "Authenticated users can refresh expired cache" ON quran_cache;
DROP POLICY IF EXISTS "Authenticated users can update cache" ON quran_cache;

-- Public SELECT remains — the cached Quran data is not sensitive.
-- No INSERT/UPDATE/DELETE policies means only service_role can write.

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
    VALUES (new.id, new.raw_user_meta_data->>'display_name')
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO preferences (user_id)
    VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;
