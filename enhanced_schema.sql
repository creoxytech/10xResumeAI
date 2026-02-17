-- Create user_profiles table for persistent context
CREATE TABLE user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  name TEXT,
  title TEXT,
  contact JSONB DEFAULT '{}',
  target_role TEXT,
  preferred_template TEXT,
  skills JSONB DEFAULT '[]',
  experience_years INTEGER,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversation_context table for detailed context storage
CREATE TABLE conversation_context (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  context_data JSONB NOT NULL,
  context_type TEXT NOT NULL, -- 'user_input', 'agent_response', 'tool_execution'
  agent_type TEXT, -- 'creator', 'editor', 'designer', 'optimizer'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_context ENABLE ROW LEVEL SECURITY;

-- Create policies for user_profiles
CREATE POLICY "Users can view their own profiles" ON user_profiles
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own profiles" ON user_profiles
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own profiles" ON user_profiles
  FOR UPDATE USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

-- Create policies for conversation_context
CREATE POLICY "Users can view their own context" ON conversation_context
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own context" ON conversation_context
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM conversations WHERE user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX user_profiles_conversation_id_idx ON user_profiles(conversation_id);
CREATE INDEX conversation_context_conversation_id_idx ON conversation_context(conversation_id);
CREATE INDEX conversation_context_type_idx ON conversation_context(context_type);
CREATE INDEX conversation_context_agent_type_idx ON conversation_context(agent_type);

-- Update artifacts table to include agent information
ALTER TABLE artifacts ADD COLUMN agent_type TEXT;
ALTER TABLE artifacts ADD COLUMN tool_calls JSONB DEFAULT '[]';

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_artifacts_updated_at 
  BEFORE UPDATE ON artifacts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();