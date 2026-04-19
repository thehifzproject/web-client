-- Atomic reset for the "Reset all progress" settings action.
-- Previously the server issued 5 deletes + 2 updates across 7 tables without a
-- transaction, so a partial failure could leave a user stranded with stale
-- cards but no curriculum progress (or vice versa).

CREATE OR REPLACE FUNCTION reset_user_progress()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  DELETE FROM word_cards WHERE user_id = uid;
  DELETE FROM ayah_cards WHERE user_id = uid;
  DELETE FROM surah_cards WHERE user_id = uid;
  DELETE FROM review_log WHERE user_id = uid;
  DELETE FROM known_surahs WHERE user_id = uid;

  UPDATE user_curriculum_progress
    SET curriculum_index = 0
    WHERE user_id = uid;

  UPDATE profiles
    SET onboarding_complete = false
    WHERE id = uid;
END;
$$;

REVOKE ALL ON FUNCTION reset_user_progress() FROM public;
GRANT EXECUTE ON FUNCTION reset_user_progress() TO authenticated;
