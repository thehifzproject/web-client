-- Wrap auth.uid() in (select ...) inside every RLS policy so Postgres
-- evaluates it ONCE per query instead of per row. The Supabase performance
-- linter flags this; on tables with many rows per user (review_log,
-- *_cards) it's a meaningful speedup. See:
-- https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select

-- profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK ((select auth.uid()) = id);

-- preferences
DROP POLICY IF EXISTS "Users can manage own preferences" ON preferences;
CREATE POLICY "Users can manage own preferences" ON preferences
  FOR ALL USING ((select auth.uid()) = user_id);

-- known_surahs
DROP POLICY IF EXISTS "Users can manage own known surahs" ON known_surahs;
CREATE POLICY "Users can manage own known surahs" ON known_surahs
  FOR ALL USING ((select auth.uid()) = user_id);

-- word_cards
DROP POLICY IF EXISTS "Users can manage own word cards" ON word_cards;
CREATE POLICY "Users can manage own word cards" ON word_cards
  FOR ALL USING ((select auth.uid()) = user_id);

-- ayah_cards
DROP POLICY IF EXISTS "Users can manage own ayah cards" ON ayah_cards;
CREATE POLICY "Users can manage own ayah cards" ON ayah_cards
  FOR ALL USING ((select auth.uid()) = user_id);

-- surah_cards
DROP POLICY IF EXISTS "Users can manage own surah cards" ON surah_cards;
CREATE POLICY "Users can manage own surah cards" ON surah_cards
  FOR ALL USING ((select auth.uid()) = user_id);

-- user_curriculum_progress
DROP POLICY IF EXISTS "Users can manage own curriculum progress" ON user_curriculum_progress;
CREATE POLICY "Users can manage own curriculum progress" ON user_curriculum_progress
  FOR ALL USING ((select auth.uid()) = user_id);

-- review_log
DROP POLICY IF EXISTS "Users can manage own review log" ON review_log;
CREATE POLICY "Users can manage own review log" ON review_log
  FOR ALL USING ((select auth.uid()) = user_id);

-- subscriptions (read-only for users; writes via service-role)
DROP POLICY IF EXISTS "read_own_subscription" ON subscriptions;
CREATE POLICY "read_own_subscription" ON subscriptions
  FOR SELECT USING ((select auth.uid()) = user_id);

-- transcription_log
DROP POLICY IF EXISTS "read_own_transcription_log" ON transcription_log;
CREATE POLICY "read_own_transcription_log" ON transcription_log
  FOR SELECT USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "insert_own_transcription_log" ON transcription_log;
CREATE POLICY "insert_own_transcription_log" ON transcription_log
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);
