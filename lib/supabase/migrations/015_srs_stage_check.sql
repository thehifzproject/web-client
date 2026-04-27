-- DB-level guard for srs_stage. The app already clamps stage in lib/srs.ts but
-- a bug there could write garbage; constraints stop bad writes at the wall.

ALTER TABLE word_cards  ADD CONSTRAINT word_cards_srs_stage_range  CHECK (srs_stage BETWEEN 0 AND 9);
ALTER TABLE ayah_cards  ADD CONSTRAINT ayah_cards_srs_stage_range  CHECK (srs_stage BETWEEN 0 AND 9);
ALTER TABLE surah_cards ADD CONSTRAINT surah_cards_srs_stage_range CHECK (srs_stage BETWEEN 0 AND 9);
