CREATE TABLE IF NOT EXISTS word_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_key text NOT NULL,
  card_type text NOT NULL CHECK (card_type IN ('transliteration', 'meaning')),
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
  UNIQUE (user_id, word_key, card_type)
);

ALTER TABLE word_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own word cards" ON word_cards FOR ALL USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_word_cards_user_due ON word_cards(user_id, due);
CREATE INDEX IF NOT EXISTS idx_word_cards_user_word ON word_cards(user_id, word_key);
CREATE INDEX IF NOT EXISTS idx_word_cards_user_state ON word_cards(user_id, state);
