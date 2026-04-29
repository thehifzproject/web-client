-- Cleanup + hardening pass.
--
-- 1. Drop dead FSRS columns: the app moved to WaniKani-style fixed stages
--    (lib/srs.ts, migration 010). state/stability/difficulty/elapsed_days/
--    scheduled_days/reps/lapses/learning_steps are NOT NULL DEFAULT 0 and never
--    written by the app. Wasted storage and a footgun for future devs.
-- 2. Drop the now-unused (user_id, state) indexes.
-- 3. Add a CHECK on subscriptions.status to match Stripe's documented set.
-- 4. Create webhook_events for Stripe webhook idempotency.
-- 5. Add surah_cards.chain_start so the surah-chain card shows the same ayah
--    window across reviews instead of re-randomizing on every fetch.
-- 6. Add a transcription_log INSERT policy that scopes to auth.uid() so the
--    column-level grant is tightened (writes still flow through service role,
--    this is defense-in-depth in case a future caller forgets).
--
-- This migration is idempotent.

-- ─── 1 + 2: Drop dead FSRS columns and obsolete indexes ──────────────────────
ALTER TABLE word_cards
  DROP COLUMN IF EXISTS state,
  DROP COLUMN IF EXISTS stability,
  DROP COLUMN IF EXISTS difficulty,
  DROP COLUMN IF EXISTS elapsed_days,
  DROP COLUMN IF EXISTS scheduled_days,
  DROP COLUMN IF EXISTS reps,
  DROP COLUMN IF EXISTS lapses,
  DROP COLUMN IF EXISTS learning_steps;

ALTER TABLE ayah_cards
  DROP COLUMN IF EXISTS state,
  DROP COLUMN IF EXISTS stability,
  DROP COLUMN IF EXISTS difficulty,
  DROP COLUMN IF EXISTS elapsed_days,
  DROP COLUMN IF EXISTS scheduled_days,
  DROP COLUMN IF EXISTS reps,
  DROP COLUMN IF EXISTS lapses,
  DROP COLUMN IF EXISTS learning_steps;

ALTER TABLE surah_cards
  DROP COLUMN IF EXISTS state,
  DROP COLUMN IF EXISTS stability,
  DROP COLUMN IF EXISTS difficulty,
  DROP COLUMN IF EXISTS elapsed_days,
  DROP COLUMN IF EXISTS scheduled_days,
  DROP COLUMN IF EXISTS reps,
  DROP COLUMN IF EXISTS lapses,
  DROP COLUMN IF EXISTS learning_steps;

DROP INDEX IF EXISTS idx_word_cards_user_state;
DROP INDEX IF EXISTS idx_ayah_cards_user_state;
DROP INDEX IF EXISTS idx_surah_cards_user_state;

-- ─── 3: subscriptions.status CHECK ───────────────────────────────────────────
-- Stripe's documented Subscription.status values, plus billing.ts seeds with
-- 'incomplete' before checkout completes.
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN (
    'incomplete', 'incomplete_expired', 'trialing', 'active',
    'past_due', 'canceled', 'unpaid', 'paused'
  ));

-- ─── 4: webhook_events for Stripe idempotency ────────────────────────────────
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id text PRIMARY KEY,
  type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;
-- Only service_role writes (from the webhook handler). No policies → users
-- can't read or write through PostgREST.

-- ─── 5: surah_cards.chain_start ──────────────────────────────────────────────
ALTER TABLE surah_cards
  ADD COLUMN IF NOT EXISTS chain_start int;

-- ─── 6: transcription_log defense-in-depth INSERT policy ─────────────────────
-- The webhook handler writes via service-role (which bypasses RLS), so this
-- policy is only protective if a future caller accidentally writes from an
-- authenticated client.
DROP POLICY IF EXISTS "insert_own_transcription_log" ON transcription_log;
CREATE POLICY "insert_own_transcription_log" ON transcription_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
