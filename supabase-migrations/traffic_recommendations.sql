-- Create table for storing AI-generated traffic recommendations
CREATE TABLE IF NOT EXISTS traffic_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL,
  recommendations TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_traffic_recommendations_team 
  ON traffic_recommendations(team_name);

CREATE INDEX IF NOT EXISTS idx_traffic_recommendations_created_at 
  ON traffic_recommendations(created_at DESC);

-- Enable Row Level Security
ALTER TABLE traffic_recommendations ENABLE ROW LEVEL SECURITY;

-- Allow public read access (dashboard is public)
CREATE POLICY "Allow public read access"
  ON traffic_recommendations
  FOR SELECT
  USING (true);

-- Allow service role to insert/update
CREATE POLICY "Allow service role to manage"
  ON traffic_recommendations
  FOR ALL
  USING (auth.role() = 'service_role');
