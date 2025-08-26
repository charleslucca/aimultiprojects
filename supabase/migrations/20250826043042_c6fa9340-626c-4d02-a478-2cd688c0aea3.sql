-- Create tables for Smart Hub functionality

-- Smart Discovery Sessions
CREATE TABLE public.smart_discovery_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  current_stage TEXT NOT NULL DEFAULT 'business_canvas',
  status TEXT NOT NULL DEFAULT 'in_progress',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Stage data
  business_canvas_data JSONB DEFAULT '{}',
  inception_data JSONB DEFAULT '{}',
  pbb_data JSONB DEFAULT '{}',
  sprint0_data JSONB DEFAULT '{}',
  
  -- Final outputs
  generated_backlog JSONB DEFAULT '[]',
  export_history JSONB DEFAULT '[]',
  
  -- Session metadata
  session_metadata JSONB DEFAULT '{}'
);

-- Smart Delivery Sessions
CREATE TABLE public.smart_delivery_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  session_name TEXT NOT NULL,
  delivery_type TEXT NOT NULL, -- 'estimation', 'capacity_planning', 'risk_assessment'
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Session data
  session_data JSONB NOT NULL DEFAULT '{}',
  results JSONB DEFAULT '{}',
  
  -- Session metadata
  session_metadata JSONB DEFAULT '{}'
);

-- Smart Hub File Uploads
CREATE TABLE public.smart_hub_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL, -- Can reference either discovery or delivery sessions
  session_type TEXT NOT NULL, -- 'discovery' or 'delivery'
  stage_name TEXT NOT NULL, -- Stage/module where file was uploaded
  user_id UUID NOT NULL,
  
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  
  -- AI Processing
  transcription TEXT,
  ai_analysis JSONB DEFAULT '{}',
  processing_status TEXT DEFAULT 'pending',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.smart_discovery_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_delivery_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smart_hub_uploads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Discovery Sessions
CREATE POLICY "Users can create discovery sessions" 
ON public.smart_discovery_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their discovery sessions" 
ON public.smart_discovery_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their discovery sessions" 
ON public.smart_discovery_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their discovery sessions" 
ON public.smart_discovery_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for Delivery Sessions
CREATE POLICY "Users can create delivery sessions" 
ON public.smart_delivery_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their delivery sessions" 
ON public.smart_delivery_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their delivery sessions" 
ON public.smart_delivery_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their delivery sessions" 
ON public.smart_delivery_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for Smart Hub Uploads
CREATE POLICY "Users can create smart hub uploads" 
ON public.smart_hub_uploads 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their smart hub uploads" 
ON public.smart_hub_uploads 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their smart hub uploads" 
ON public.smart_hub_uploads 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their smart hub uploads" 
ON public.smart_hub_uploads 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add update triggers
CREATE TRIGGER update_smart_discovery_sessions_updated_at
BEFORE UPDATE ON public.smart_discovery_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_smart_delivery_sessions_updated_at
BEFORE UPDATE ON public.smart_delivery_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_smart_hub_uploads_updated_at
BEFORE UPDATE ON public.smart_hub_uploads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();