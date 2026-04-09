-- Add srs_stage column for WaniKani-style fixed-stage SRS (0-9)
-- Stage 0 = not started, 1-4 = Apprentice, 5-6 = Guru, 7 = Master, 8 = Enlightened, 9 = Burned

ALTER TABLE word_cards ADD COLUMN IF NOT EXISTS srs_stage int NOT NULL DEFAULT 0;
ALTER TABLE ayah_cards ADD COLUMN IF NOT EXISTS srs_stage int NOT NULL DEFAULT 0;
ALTER TABLE surah_cards ADD COLUMN IF NOT EXISTS srs_stage int NOT NULL DEFAULT 0;

-- Migrate existing FSRS data: map state+stability → srs_stage
UPDATE word_cards SET srs_stage = CASE
  WHEN state = 0 THEN 0
  WHEN state IN (1, 3) THEN 1
  WHEN state = 2 AND stability < 1 THEN 1
  WHEN state = 2 AND stability < 3 THEN 2
  WHEN state = 2 AND stability < 5 THEN 3
  WHEN state = 2 AND stability < 10 THEN 4
  WHEN state = 2 AND stability < 21 THEN 5
  WHEN state = 2 AND stability < 45 THEN 6
  WHEN state = 2 AND stability < 90 THEN 7
  WHEN state = 2 AND stability < 180 THEN 8
  ELSE 9
END;

UPDATE ayah_cards SET srs_stage = CASE
  WHEN state = 0 THEN 0
  WHEN state IN (1, 3) THEN 1
  WHEN state = 2 AND stability < 1 THEN 1
  WHEN state = 2 AND stability < 3 THEN 2
  WHEN state = 2 AND stability < 5 THEN 3
  WHEN state = 2 AND stability < 10 THEN 4
  WHEN state = 2 AND stability < 21 THEN 5
  WHEN state = 2 AND stability < 45 THEN 6
  WHEN state = 2 AND stability < 90 THEN 7
  WHEN state = 2 AND stability < 180 THEN 8
  ELSE 9
END;

UPDATE surah_cards SET srs_stage = CASE
  WHEN state = 0 THEN 0
  WHEN state IN (1, 3) THEN 1
  WHEN state = 2 AND stability < 1 THEN 1
  WHEN state = 2 AND stability < 3 THEN 2
  WHEN state = 2 AND stability < 5 THEN 3
  WHEN state = 2 AND stability < 10 THEN 4
  WHEN state = 2 AND stability < 21 THEN 5
  WHEN state = 2 AND stability < 45 THEN 6
  WHEN state = 2 AND stability < 90 THEN 7
  WHEN state = 2 AND stability < 180 THEN 8
  ELSE 9
END;

-- Burned cards should never appear in review
UPDATE word_cards SET due = '9999-12-31T00:00:00Z' WHERE srs_stage = 9;
UPDATE ayah_cards SET due = '9999-12-31T00:00:00Z' WHERE srs_stage = 9;
UPDATE surah_cards SET due = '9999-12-31T00:00:00Z' WHERE srs_stage = 9;

CREATE INDEX IF NOT EXISTS idx_word_cards_user_srs_stage ON word_cards(user_id, srs_stage);
CREATE INDEX IF NOT EXISTS idx_ayah_cards_user_srs_stage ON ayah_cards(user_id, srs_stage);
CREATE INDEX IF NOT EXISTS idx_surah_cards_user_srs_stage ON surah_cards(user_id, srs_stage);
