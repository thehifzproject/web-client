CREATE TABLE IF NOT EXISTS surah_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surah_number int NOT NULL,
  due timestamptz NOT NULL DEFAULT now(),
  stability float NOT NULL DEFAULT 0,
  difficulty float NOT NULL DEFAULT 0,
  elapsed_days float NOT NULL DEFAULT 0,
  scheduled_days float NOT NULL DEFAULT 0,
  reps int NOT NULL DEFAULT 0,
  lapses int NOT NULL DEFAULT 0,
  state int NOT NULL DEFAULT 0,
  last_review timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, surah_number)
);

ALTER TABLE surah_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own surah cards" ON surah_cards FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_surah_cards_user_due ON surah_cards(user_id, due);
CREATE INDEX IF NOT EXISTS idx_surah_cards_user_state ON surah_cards(user_id, state);
