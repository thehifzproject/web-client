CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  onboarding_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_new_words int DEFAULT 10,
  daily_new_ayahs int DEFAULT 3,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS known_surahs (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  surah_number int NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, surah_number)
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

ALTER TABLE preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own preferences" ON preferences FOR ALL USING (auth.uid() = user_id);

ALTER TABLE known_surahs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own known surahs" ON known_surahs FOR ALL USING (auth.uid() = user_id);

-- Auto-create profile and preferences on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
    VALUES (new.id, new.raw_user_meta_data->>'display_name')
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO preferences (user_id)
    VALUES (new.id)
    ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
