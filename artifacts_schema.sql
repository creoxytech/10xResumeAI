-- Create artifacts table for persistent storage
CREATE TABLE artifacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'pdf', 'javascript', 'html', etc.
  title TEXT NOT NULL,
  code TEXT NOT NULL, -- The actual code/content
  metadata JSONB DEFAULT '{}', -- Additional data like URLs, file info
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE artifacts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own artifacts" ON artifacts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own artifacts" ON artifacts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own artifacts" ON artifacts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own artifacts" ON artifacts
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX artifacts_user_id_idx ON artifacts(user_id);
CREATE INDEX artifacts_conversation_id_idx ON artifacts(conversation_id);
CREATE INDEX artifacts_type_idx ON artifacts(type);