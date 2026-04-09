-- Historical log of every review and learn event.
-- Used for accurate calendar heatmaps and future app sync.
-- Unlike last_review on card rows (which gets overwritten), this is append-only.

CREATE TABLE IF NOT EXISTS review_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_table text NOT NULL CHECK (card_table IN ('word_cards', 'ayah_cards', 'surah_cards')),
  card_id uuid,
  correct boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE review_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own review log" ON review_log FOR ALL USING (auth.uid() = user_id);

CREATE INDEX idx_review_log_user_date ON review_log(user_id, created_at);
