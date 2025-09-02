-- Criar tabelas para Azure Boards (sem unified_insights que já existe)
CREATE TABLE IF NOT EXISTS public.azure_organizations (
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

CREATE TABLE IF NOT EXISTS public.azure_projects (
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

CREATE TABLE IF NOT EXISTS public.azure_work_items (
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

CREATE TABLE IF NOT EXISTS public.azure_iterations (
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

-- Adicionar índices para performance (apenas se não existirem)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_azure_organizations_integration_id') THEN
    CREATE INDEX idx_azure_organizations_integration_id ON azure_organizations(integration_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_azure_projects_integration_id') THEN
    CREATE INDEX idx_azure_projects_integration_id ON azure_projects(integration_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_azure_work_items_integration_id') THEN
    CREATE INDEX idx_azure_work_items_integration_id ON azure_work_items(integration_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_azure_work_items_azure_id') THEN
    CREATE INDEX idx_azure_work_items_azure_id ON azure_work_items(azure_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_azure_work_items_project_id') THEN
    CREATE INDEX idx_azure_work_items_project_id ON azure_work_items(project_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_azure_iterations_integration_id') THEN
    CREATE INDEX idx_azure_iterations_integration_id ON azure_iterations(integration_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_azure_iterations_project_id') THEN
    CREATE INDEX idx_azure_iterations_project_id ON azure_iterations(project_id);
  END IF;
END $$;

-- Adicionar colunas se não existirem
ALTER TABLE public.project_integrations 
ADD COLUMN IF NOT EXISTS integration_subtype TEXT;

ALTER TABLE public.project_integrations 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- RLS Policies para as novas tabelas Azure Boards
ALTER TABLE public.azure_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.azure_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.azure_work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.azure_iterations ENABLE ROW LEVEL SECURITY;

-- Policies para azure_organizations
DROP POLICY IF EXISTS "Users can view azure organizations for their project integrations" ON public.azure_organizations;
CREATE POLICY "Users can view azure organizations for their project integrations" 
ON public.azure_organizations FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM project_integrations pi
  JOIN project_permissions pp ON pp.project_id = pi.project_id
  WHERE pi.id = azure_organizations.integration_id 
  AND pp.user_id = auth.uid() 
  AND pp.is_active = true
));

DROP POLICY IF EXISTS "System can manage azure organizations" ON public.azure_organizations;
CREATE POLICY "System can manage azure organizations" 
ON public.azure_organizations FOR ALL 
USING (true);

-- Policies para azure_projects
DROP POLICY IF EXISTS "Users can view azure projects for their project integrations" ON public.azure_projects;
CREATE POLICY "Users can view azure projects for their project integrations" 
ON public.azure_projects FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM project_integrations pi
  JOIN project_permissions pp ON pp.project_id = pi.project_id
  WHERE pi.id = azure_projects.integration_id 
  AND pp.user_id = auth.uid() 
  AND pp.is_active = true
));

DROP POLICY IF EXISTS "System can manage azure projects" ON public.azure_projects;
CREATE POLICY "System can manage azure projects" 
ON public.azure_projects FOR ALL 
USING (true);

-- Policies para azure_work_items
DROP POLICY IF EXISTS "Users can view azure work items for their project integrations" ON public.azure_work_items;
CREATE POLICY "Users can view azure work items for their project integrations" 
ON public.azure_work_items FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM project_integrations pi
  JOIN project_permissions pp ON pp.project_id = pi.project_id
  WHERE pi.id = azure_work_items.integration_id 
  AND pp.user_id = auth.uid() 
  AND pp.is_active = true
));

DROP POLICY IF EXISTS "System can manage azure work items" ON public.azure_work_items;
CREATE POLICY "System can manage azure work items" 
ON public.azure_work_items FOR ALL 
USING (true);

-- Policies para azure_iterations
DROP POLICY IF EXISTS "Users can view azure iterations for their project integrations" ON public.azure_iterations;
CREATE POLICY "Users can view azure iterations for their project integrations" 
ON public.azure_iterations FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM project_integrations pi
  JOIN project_permissions pp ON pp.project_id = pi.project_id
  WHERE pi.id = azure_iterations.integration_id 
  AND pp.user_id = auth.uid() 
  AND pp.is_active = true
));

DROP POLICY IF EXISTS "System can manage azure iterations" ON public.azure_iterations;
CREATE POLICY "System can manage azure iterations" 
ON public.azure_iterations FOR ALL 
USING (true);