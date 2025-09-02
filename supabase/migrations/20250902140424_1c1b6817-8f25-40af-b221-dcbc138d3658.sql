-- Criar tabelas para Azure Boards
CREATE TABLE public.azure_organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES project_integrations(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL,
  organization_url TEXT NOT NULL,
  azure_id TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  raw_data JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE public.azure_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES project_integrations(id) ON DELETE CASCADE,
  azure_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  state TEXT,
  visibility TEXT,
  last_update_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  raw_data JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE public.azure_work_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES project_integrations(id) ON DELETE CASCADE,
  azure_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  work_item_type TEXT NOT NULL,
  state TEXT,
  reason TEXT,
  assigned_to TEXT,
  created_by TEXT,
  area_path TEXT,
  iteration_path TEXT,
  story_points INTEGER,
  original_estimate INTEGER,
  remaining_work INTEGER,
  completed_work INTEGER,
  activity TEXT,
  priority INTEGER,
  severity TEXT,
  tags TEXT[],
  parent_id INTEGER,
  created_date TIMESTAMP WITH TIME ZONE,
  changed_date TIMESTAMP WITH TIME ZONE,
  resolved_date TIMESTAMP WITH TIME ZONE,
  closed_date TIMESTAMP WITH TIME ZONE,
  project_id UUID REFERENCES azure_projects(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  raw_data JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE public.azure_iterations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL REFERENCES project_integrations(id) ON DELETE CASCADE,
  azure_id TEXT NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE,
  finish_date TIMESTAMP WITH TIME ZONE,
  state TEXT,
  project_id UUID REFERENCES azure_projects(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  raw_data JSONB DEFAULT '{}'::jsonb
);

-- Adicionar índices para performance
CREATE INDEX idx_azure_organizations_integration_id ON azure_organizations(integration_id);
CREATE INDEX idx_azure_projects_integration_id ON azure_projects(integration_id);
CREATE INDEX idx_azure_work_items_integration_id ON azure_work_items(integration_id);
CREATE INDEX idx_azure_work_items_azure_id ON azure_work_items(azure_id);
CREATE INDEX idx_azure_work_items_project_id ON azure_work_items(project_id);
CREATE INDEX idx_azure_iterations_integration_id ON azure_iterations(integration_id);
CREATE INDEX idx_azure_iterations_project_id ON azure_iterations(project_id);

-- Adicionar coluna para suportar diferentes tipos de ferramenta em project_integrations
ALTER TABLE public.project_integrations 
ADD COLUMN IF NOT EXISTS integration_subtype TEXT;

-- Criar tabela unificada de insights
CREATE TABLE public.unified_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  integration_type TEXT NOT NULL, -- 'jira', 'azure_boards', 'github', etc.
  integration_id UUID REFERENCES project_integrations(id),
  insight_type TEXT NOT NULL,
  insight_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  confidence_score NUMERIC CHECK (confidence_score >= 0 AND confidence_score <= 1),
  criticality_score NUMERIC DEFAULT 0.5,
  alert_category TEXT,
  executive_summary TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para a tabela unified_insights
CREATE INDEX idx_unified_insights_project_id ON unified_insights(project_id);
CREATE INDEX idx_unified_insights_client_id ON unified_insights(client_id);
CREATE INDEX idx_unified_insights_integration_type ON unified_insights(integration_type);
CREATE INDEX idx_unified_insights_integration_id ON unified_insights(integration_id);
CREATE INDEX idx_unified_insights_insight_type ON unified_insights(insight_type);
CREATE INDEX idx_unified_insights_generated_at ON unified_insights(generated_at);

-- Atualizar project_integrations para suportar metadata adicional
ALTER TABLE public.project_integrations 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- RLS Policies para as novas tabelas Azure Boards
ALTER TABLE public.azure_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.azure_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.azure_work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.azure_iterations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_insights ENABLE ROW LEVEL SECURITY;

-- Policies para azure_organizations
CREATE POLICY "Users can view azure organizations for their project integrations" 
ON public.azure_organizations FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM project_integrations pi
  JOIN project_permissions pp ON pp.project_id = pi.project_id
  WHERE pi.id = azure_organizations.integration_id 
  AND pp.user_id = auth.uid() 
  AND pp.is_active = true
));

CREATE POLICY "System can manage azure organizations" 
ON public.azure_organizations FOR ALL 
USING (true);

-- Policies para azure_projects
CREATE POLICY "Users can view azure projects for their project integrations" 
ON public.azure_projects FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM project_integrations pi
  JOIN project_permissions pp ON pp.project_id = pi.project_id
  WHERE pi.id = azure_projects.integration_id 
  AND pp.user_id = auth.uid() 
  AND pp.is_active = true
));

CREATE POLICY "System can manage azure projects" 
ON public.azure_projects FOR ALL 
USING (true);

-- Policies para azure_work_items
CREATE POLICY "Users can view azure work items for their project integrations" 
ON public.azure_work_items FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM project_integrations pi
  JOIN project_permissions pp ON pp.project_id = pi.project_id
  WHERE pi.id = azure_work_items.integration_id 
  AND pp.user_id = auth.uid() 
  AND pp.is_active = true
));

CREATE POLICY "System can manage azure work items" 
ON public.azure_work_items FOR ALL 
USING (true);

-- Policies para azure_iterations
CREATE POLICY "Users can view azure iterations for their project integrations" 
ON public.azure_iterations FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM project_integrations pi
  JOIN project_permissions pp ON pp.project_id = pi.project_id
  WHERE pi.id = azure_iterations.integration_id 
  AND pp.user_id = auth.uid() 
  AND pp.is_active = true
));

CREATE POLICY "System can manage azure iterations" 
ON public.azure_iterations FOR ALL 
USING (true);

-- Policies para unified_insights
CREATE POLICY "Users can view unified insights for their projects" 
ON public.unified_insights FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM project_permissions pp
  WHERE pp.project_id = unified_insights.project_id 
  AND pp.user_id = auth.uid() 
  AND pp.is_active = true
));

CREATE POLICY "System can manage unified insights" 
ON public.unified_insights FOR ALL 
USING (true);