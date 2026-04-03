CREATE TABLE IF NOT EXISTS user_curriculum_progress (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  curriculum_index int NOT NULL DEFAULT 0,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_curriculum_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own curriculum progress" ON user_curriculum_progress FOR ALL USING (auth.uid() = user_id);
