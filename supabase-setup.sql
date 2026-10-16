-- StudyMate+ Database Setup
-- Run this SQL in your Supabase SQL Editor

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================
-- TABLES
-- ============================================

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_path TEXT NOT NULL,
    language TEXT DEFAULT 'English',
    subject TEXT,
    pages INTEGER,
    summary TEXT,
    status TEXT CHECK (status IN ('uploaded', 'processing', 'ready', 'failed')) DEFAULT 'uploaded',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document chunks for RAG
CREATE TABLE IF NOT EXISTS document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    page_number INTEGER,
    content TEXT NOT NULL,
    embedding vector(384), -- Hugging Face MiniLM dimension
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Q&A Sessions
CREATE TABLE IF NOT EXISTS qa_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT DEFAULT 'Q&A Session',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Q&A Messages
CREATE TABLE IF NOT EXISTS qa_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES qa_sessions(id) ON DELETE CASCADE,
    role TEXT CHECK (role IN ('user', 'assistant')) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Flashcards
CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    tag TEXT,
    due_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_reviewed TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quizzes
CREATE TABLE IF NOT EXISTS quizzes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')) DEFAULT 'medium',
    language TEXT DEFAULT 'English',
    score INTEGER NOT NULL,
    total_questions INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz Questions
CREATE TABLE IF NOT EXISTS quiz_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quiz_id UUID NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_answer TEXT NOT NULL,
    user_answer TEXT,
    explanation TEXT
);

-- Study Plans
CREATE TABLE IF NOT EXISTS study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    goal_type TEXT CHECK (goal_type IN ('daily', 'weekly')) DEFAULT 'weekly',
    goal_value INTEGER NOT NULL,
    start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    end_date DATE,
    status TEXT CHECK (status IN ('active', 'completed', 'paused')) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Study Plan Items
CREATE TABLE IF NOT EXISTS study_plan_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES study_plans(id) ON DELETE CASCADE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    task_title TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE
);

-- Study Sessions (for progress tracking)
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    duration INTEGER NOT NULL, -- in seconds
    subject TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Focus Sessions
CREATE TABLE IF NOT EXISTS focus_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    duration_minutes INTEGER NOT NULL,
    completed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collaboration Rooms
CREATE TABLE IF NOT EXISTS collab_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    room_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Collaboration Room Members
CREATE TABLE IF NOT EXISTS collab_room_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES collab_rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, user_id)
);

-- AI Jobs (for background processing)
CREATE TABLE IF NOT EXISTS ai_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    job_type TEXT CHECK (job_type IN ('chunking', 'embeddings', 'flashcards', 'quiz')) NOT NULL,
    status TEXT CHECK (status IN ('queued', 'running', 'completed', 'failed')) DEFAULT 'queued',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON documents(user_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_qa_sessions_user_id ON qa_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_qa_messages_session_id ON qa_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_due_date ON flashcards(due_date);
CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_study_plans_user_id ON study_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_collab_rooms_owner_id ON collab_rooms(owner_id);

-- Vector similarity search index
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding ON document_chunks 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE qa_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcards ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plan_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE collab_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE collab_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Documents policies
DROP POLICY IF EXISTS "Users can view own documents" ON documents;
CREATE POLICY "Users can view own documents" ON documents FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own documents" ON documents;
CREATE POLICY "Users can insert own documents" ON documents FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own documents" ON documents;
CREATE POLICY "Users can update own documents" ON documents FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
CREATE POLICY "Users can delete own documents" ON documents FOR DELETE USING (auth.uid() = user_id);

-- Document chunks policies
DROP POLICY IF EXISTS "Users can view chunks of own documents" ON document_chunks;
CREATE POLICY "Users can view chunks of own documents" ON document_chunks FOR SELECT 
USING (EXISTS (SELECT 1 FROM documents WHERE documents.id = document_chunks.document_id AND documents.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert chunks for own documents" ON document_chunks;
CREATE POLICY "Users can insert chunks for own documents" ON document_chunks FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM documents WHERE documents.id = document_chunks.document_id AND documents.user_id = auth.uid()));

-- QA Sessions policies
DROP POLICY IF EXISTS "Users can view own sessions" ON qa_sessions;
CREATE POLICY "Users can view own sessions" ON qa_sessions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON qa_sessions;
CREATE POLICY "Users can insert own sessions" ON qa_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON qa_sessions;
CREATE POLICY "Users can update own sessions" ON qa_sessions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own sessions" ON qa_sessions;
CREATE POLICY "Users can delete own sessions" ON qa_sessions FOR DELETE USING (auth.uid() = user_id);

-- QA Messages policies
DROP POLICY IF EXISTS "Users can view messages in own sessions" ON qa_messages;
CREATE POLICY "Users can view messages in own sessions" ON qa_messages FOR SELECT 
USING (EXISTS (SELECT 1 FROM qa_sessions WHERE qa_sessions.id = qa_messages.session_id AND qa_sessions.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert messages in own sessions" ON qa_messages;
CREATE POLICY "Users can insert messages in own sessions" ON qa_messages FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM qa_sessions WHERE qa_sessions.id = qa_messages.session_id AND qa_sessions.user_id = auth.uid()));

-- Flashcards policies
DROP POLICY IF EXISTS "Users can view own flashcards" ON flashcards;
CREATE POLICY "Users can view own flashcards" ON flashcards FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own flashcards" ON flashcards;
CREATE POLICY "Users can insert own flashcards" ON flashcards FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own flashcards" ON flashcards;
CREATE POLICY "Users can update own flashcards" ON flashcards FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own flashcards" ON flashcards;
CREATE POLICY "Users can delete own flashcards" ON flashcards FOR DELETE USING (auth.uid() = user_id);

-- Quizzes policies
DROP POLICY IF EXISTS "Users can view own quizzes" ON quizzes;
CREATE POLICY "Users can view own quizzes" ON quizzes FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own quizzes" ON quizzes;
CREATE POLICY "Users can insert own quizzes" ON quizzes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Quiz questions policies
DROP POLICY IF EXISTS "Users can view questions in own quizzes" ON quiz_questions;
CREATE POLICY "Users can view questions in own quizzes" ON quiz_questions FOR SELECT 
USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert questions in own quizzes" ON quiz_questions;
CREATE POLICY "Users can insert questions in own quizzes" ON quiz_questions FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update questions in own quizzes" ON quiz_questions;
CREATE POLICY "Users can update questions in own quizzes" ON quiz_questions FOR UPDATE 
USING (EXISTS (SELECT 1 FROM quizzes WHERE quizzes.id = quiz_questions.quiz_id AND quizzes.user_id = auth.uid()));

-- Study plans policies
DROP POLICY IF EXISTS "Users can view own plans" ON study_plans;
CREATE POLICY "Users can view own plans" ON study_plans FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own plans" ON study_plans;
CREATE POLICY "Users can insert own plans" ON study_plans FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own plans" ON study_plans;
CREATE POLICY "Users can update own plans" ON study_plans FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own plans" ON study_plans;
CREATE POLICY "Users can delete own plans" ON study_plans FOR DELETE USING (auth.uid() = user_id);

-- Study plan items policies
DROP POLICY IF EXISTS "Users can view items in own plans" ON study_plan_items;
CREATE POLICY "Users can view items in own plans" ON study_plan_items FOR SELECT 
USING (EXISTS (SELECT 1 FROM study_plans WHERE study_plans.id = study_plan_items.plan_id AND study_plans.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert items in own plans" ON study_plan_items;
CREATE POLICY "Users can insert items in own plans" ON study_plan_items FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM study_plans WHERE study_plans.id = study_plan_items.plan_id AND study_plans.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update items in own plans" ON study_plan_items;
CREATE POLICY "Users can update items in own plans" ON study_plan_items FOR UPDATE 
USING (EXISTS (SELECT 1 FROM study_plans WHERE study_plans.id = study_plan_items.plan_id AND study_plans.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete items in own plans" ON study_plan_items;
CREATE POLICY "Users can delete items in own plans" ON study_plan_items FOR DELETE 
USING (EXISTS (SELECT 1 FROM study_plans WHERE study_plans.id = study_plan_items.plan_id AND study_plans.user_id = auth.uid()));

-- Focus sessions policies
DROP POLICY IF EXISTS "Users can view own sessions" ON focus_sessions;
CREATE POLICY "Users can view own sessions" ON focus_sessions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON focus_sessions;
CREATE POLICY "Users can insert own sessions" ON focus_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Study sessions policies
DROP POLICY IF EXISTS "Users can view own study sessions" ON study_sessions;
CREATE POLICY "Users can view own study sessions" ON study_sessions FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own study sessions" ON study_sessions;
CREATE POLICY "Users can insert own study sessions" ON study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own study sessions" ON study_sessions;
CREATE POLICY "Users can update own study sessions" ON study_sessions FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own study sessions" ON study_sessions;
CREATE POLICY "Users can delete own study sessions" ON study_sessions FOR DELETE USING (auth.uid() = user_id);

-- Collaboration rooms policies
DROP POLICY IF EXISTS "Users can view rooms they own or are members of" ON collab_rooms;
CREATE POLICY "Users can view rooms they own or are members of" ON collab_rooms FOR SELECT 
USING (auth.uid() = owner_id OR EXISTS (SELECT 1 FROM collab_room_members WHERE collab_room_members.room_id = collab_rooms.id AND collab_room_members.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert own rooms" ON collab_rooms;
CREATE POLICY "Users can insert own rooms" ON collab_rooms FOR INSERT WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can update own rooms" ON collab_rooms;
CREATE POLICY "Owners can update own rooms" ON collab_rooms FOR UPDATE USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "Owners can delete own rooms" ON collab_rooms;
CREATE POLICY "Owners can delete own rooms" ON collab_rooms FOR DELETE USING (auth.uid() = owner_id);

-- Collaboration room members policies
DROP POLICY IF EXISTS "Users can view members of rooms they're in" ON collab_room_members;
CREATE POLICY "Users can view members of rooms they're in" ON collab_room_members FOR SELECT 
USING (EXISTS (SELECT 1 FROM collab_rooms WHERE collab_rooms.id = collab_room_members.room_id AND (collab_rooms.owner_id = auth.uid() OR EXISTS (SELECT 1 FROM collab_room_members cm WHERE cm.room_id = collab_rooms.id AND cm.user_id = auth.uid()))));

DROP POLICY IF EXISTS "Room owners can add members" ON collab_room_members;
CREATE POLICY "Room owners can add members" ON collab_room_members FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM collab_rooms WHERE collab_rooms.id = collab_room_members.room_id AND collab_rooms.owner_id = auth.uid()));

DROP POLICY IF EXISTS "Users can remove themselves from rooms" ON collab_room_members;
CREATE POLICY "Users can remove themselves from rooms" ON collab_room_members FOR DELETE 
USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM collab_rooms WHERE collab_rooms.id = collab_room_members.room_id AND collab_rooms.owner_id = auth.uid()));

-- AI jobs policies
DROP POLICY IF EXISTS "Users can view jobs for own documents" ON ai_jobs;
CREATE POLICY "Users can view jobs for own documents" ON ai_jobs FOR SELECT 
USING (EXISTS (SELECT 1 FROM documents WHERE documents.id = ai_jobs.document_id AND documents.user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert jobs for own documents" ON ai_jobs;
CREATE POLICY "Users can insert jobs for own documents" ON ai_jobs FOR INSERT 
WITH CHECK (EXISTS (SELECT 1 FROM documents WHERE documents.id = ai_jobs.document_id AND documents.user_id = auth.uid()));

-- ============================================
-- STORAGE
-- ============================================

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DROP POLICY IF EXISTS "Users can upload own documents" ON storage.objects;
CREATE POLICY "Users can upload own documents" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can view own documents" ON storage.objects;
CREATE POLICY "Users can view own documents" ON storage.objects FOR SELECT 
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own documents" ON storage.objects;
CREATE POLICY "Users can delete own documents" ON storage.objects FOR DELETE 
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to match document chunks using vector similarity
CREATE OR REPLACE FUNCTION match_document_chunks (
  query_embedding vector(384),
  match_threshold float,
  match_count int,
  filter_document_ids uuid[]
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  page_number int,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    document_chunks.id,
    document_chunks.document_id,
    document_chunks.content,
    document_chunks.page_number,
    1 - (document_chunks.embedding <=> query_embedding) AS similarity
  FROM document_chunks
  WHERE (document_chunks.document_id = ANY(filter_document_ids))
    AND 1 - (document_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY document_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'))
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- COMPLETION MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE 'StudyMate+ database setup completed successfully!';
END $$;
