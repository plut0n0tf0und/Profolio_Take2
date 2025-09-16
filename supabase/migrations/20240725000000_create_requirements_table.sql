-- supabase/migrations/20240725000000_create_requirements_table.sql

CREATE TABLE IF NOT EXISTS requirements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    problem_statement TEXT,
    role TEXT,
    output_type TEXT[],
    outcome TEXT[],
    device_type TEXT[],
    project_type TEXT CHECK (project_type IN ('new', 'old')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE requirements ENABLE ROW LEVEL SECURITY;

-- Policies for RLS
-- 1. Users can insert their own requirements
CREATE POLICY "Users can insert their own requirements"
ON requirements
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 2. Users can view their own requirements
CREATE POLICY "Users can view their own requirements"
ON requirements
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Users can update their own requirements
CREATE POLICY "Users can update their own requirements"
ON requirements
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Users can delete their own requirements
CREATE POLICY "Users can delete their own requirements"
ON requirements
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
