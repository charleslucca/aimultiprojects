-- Create storage bucket for project files
INSERT INTO storage.buckets (id, name, public) VALUES ('project-files', 'project-files', false);

-- Create storage policies for project files
CREATE POLICY "Users can view their project files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their project files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their project files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their project files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update project_attachments table to store real file data
ALTER TABLE project_attachments 
ADD COLUMN IF NOT EXISTS file_size BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS storage_path TEXT,
ADD COLUMN IF NOT EXISTS analysis_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS extracted_content TEXT,
ADD COLUMN IF NOT EXISTS file_metadata JSONB DEFAULT '{}';

-- Create project intelligence profiles table
CREATE TABLE IF NOT EXISTS project_intelligence_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  methodology TEXT DEFAULT 'scrum',
  story_points_to_hours NUMERIC DEFAULT 8,
  average_hourly_rate NUMERIC DEFAULT 100,
  business_context TEXT,
  success_metrics JSONB DEFAULT '{}',
  custom_prompts JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on project intelligence profiles
ALTER TABLE project_intelligence_profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for project intelligence profiles
CREATE POLICY "Users can view project intelligence profiles they have access to" 
ON project_intelligence_profiles 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_intelligence_profiles.project_id
  )
);

CREATE POLICY "Users can create project intelligence profiles for their projects" 
ON project_intelligence_profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_intelligence_profiles.project_id
  )
);

CREATE POLICY "Users can update project intelligence profiles for their projects" 
ON project_intelligence_profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM projects 
    WHERE projects.id = project_intelligence_profiles.project_id
  )
);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_project_intelligence_profiles_updated_at
    BEFORE UPDATE ON project_intelligence_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();