CREATE TABLE IF NOT EXISTS ayah_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  surah_number int NOT NULL,
  ayah_number int NOT NULL,
  card_type text NOT NULL CHECK (card_type IN ('identify', 'recite')),
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
  UNIQUE (user_id, surah_number, ayah_number, card_type)
);

ALTER TABLE ayah_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own ayah cards" ON ayah_cards FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_ayah_cards_user_due ON ayah_cards(user_id, due);
CREATE INDEX IF NOT EXISTS idx_ayah_cards_user_surah ON ayah_cards(user_id, surah_number);
CREATE INDEX IF NOT EXISTS idx_ayah_cards_user_state ON ayah_cards(user_id, state);
