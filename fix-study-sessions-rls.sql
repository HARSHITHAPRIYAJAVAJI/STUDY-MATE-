-- Fix Study Sessions 403 Forbidden Error
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/qwzreaommojtkfrzagwu/sql

-- 1. Ensure study_sessions table exists with proper structure
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    duration INTEGER NOT NULL, -- in seconds
    subject TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;

-- 3. Create RLS Policies for study_sessions
DROP POLICY IF EXISTS "Users can view own study sessions" ON study_sessions;
CREATE POLICY "Users can view own study sessions" ON study_sessions 
    FOR SELECT 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own study sessions" ON study_sessions;
CREATE POLICY "Users can insert own study sessions" ON study_sessions 
    FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own study sessions" ON study_sessions;
CREATE POLICY "Users can update own study sessions" ON study_sessions 
    FOR UPDATE 
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own study sessions" ON study_sessions;
CREATE POLICY "Users can delete own study sessions" ON study_sessions 
    FOR DELETE 
    USING (auth.uid() = user_id);

-- 4. Notify completion
SELECT 'Study sessions RLS policies successfully applied!' as status;
