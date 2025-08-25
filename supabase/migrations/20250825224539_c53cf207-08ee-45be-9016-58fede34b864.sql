-- Create enum for project roles
CREATE TYPE public.project_role AS ENUM (
  'developer',
  'tech_lead', 
  'scrum_master',
  'product_owner',
  'designer',
  'qa_engineer',
  'devops_engineer',
  'architect',
  'agile_coach',
  'business_analyst'
);

-- Create enum for contract types
CREATE TYPE public.contract_type AS ENUM (
  'clt',
  'pj',
  'freelancer',
  'consultant'
);

-- Create user project participations table
CREATE TABLE public.user_project_participations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  jira_project_key TEXT NOT NULL,
  jira_project_name TEXT,
  role project_role NOT NULL,
  allocation_percentage INTEGER NOT NULL DEFAULT 100 CHECK (allocation_percentage > 0 AND allocation_percentage <= 100),
  contract_type contract_type NOT NULL,
  monthly_salary DECIMAL(10,2),
  hourly_rate DECIMAL(8,2),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, jira_project_key)
);

-- Enable Row Level Security
ALTER TABLE public.user_project_participations ENABLE ROW LEVEL SECURITY;

-- Create policies for user project participations
CREATE POLICY "Users can view their own participations" 
ON public.user_project_participations 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own participations" 
ON public.user_project_participations 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participations" 
ON public.user_project_participations 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own participations" 
ON public.user_project_participations 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_user_project_participations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_project_participations_updated_at
BEFORE UPDATE ON public.user_project_participations
FOR EACH ROW
EXECUTE FUNCTION public.update_user_project_participations_updated_at();