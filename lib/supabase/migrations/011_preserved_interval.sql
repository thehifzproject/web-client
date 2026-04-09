-- Stage 9 (Preserved) now has a ~1 year interval instead of never reviewing.
-- Fix existing stage 9 cards that were set to '9999-12-31' — set them due ~1 year from now.

UPDATE word_cards
SET due = NOW() + INTERVAL '1 year'
WHERE srs_stage = 9 AND due = '9999-12-31T00:00:00Z';

UPDATE ayah_cards
SET due = NOW() + INTERVAL '1 year'
WHERE srs_stage = 9 AND due = '9999-12-31T00:00:00Z';

UPDATE surah_cards
SET due = NOW() + INTERVAL '1 year'
WHERE srs_stage = 9 AND due = '9999-12-31T00:00:00Z';
