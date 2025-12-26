-- AI Insights Table
-- Stores AI-generated tactical advice for targetologists

CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES traffic_users(id) ON DELETE CASCADE,
  insight_text TEXT NOT NULL,
  priority VARCHAR(10) CHECK (priority IN ('high', 'medium', 'low')) DEFAULT 'medium',
  category VARCHAR(20) CHECK (category IN ('creative', 'targeting', 'budget', 'optimization')) DEFAULT 'optimization',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_ai_insights_user_id ON ai_insights(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_created_at ON ai_insights(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_insights_priority ON ai_insights(priority) WHERE is_read = FALSE;

-- Comments
COMMENT ON TABLE ai_insights IS 'AI-generated tactical advice for targetologists using Groq API';
COMMENT ON COLUMN ai_insights.insight_text IS 'Short tactical advice (max 15 words) from AI analyst';
COMMENT ON COLUMN ai_insights.priority IS 'high = critical issue, medium = improvement needed, low = optimization tip';
COMMENT ON COLUMN ai_insights.category IS 'Type of insight: creative, targeting, budget, or optimization';
