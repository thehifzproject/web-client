-- Add learning_steps column required by ts-fsrs v5.
-- Without this, cards in Learning/Relearning state lose their step
-- position on reload, causing incorrect review intervals.

ALTER TABLE word_cards ADD COLUMN IF NOT EXISTS learning_steps int NOT NULL DEFAULT 0;
ALTER TABLE ayah_cards ADD COLUMN IF NOT EXISTS learning_steps int NOT NULL DEFAULT 0;
ALTER TABLE surah_cards ADD COLUMN IF NOT EXISTS learning_steps int NOT NULL DEFAULT 0;
