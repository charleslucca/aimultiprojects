-- FASE 1 CONTINUAÇÃO: Comentários como Insights e Prompts Especializados
CREATE TABLE project_insights_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects NOT NULL,
  client_id UUID REFERENCES clients,
  content TEXT NOT NULL,
  insight_origin TEXT NOT NULL, -- 'CSM', 'SALES', 'BRAINSTORM', '1:1', 'RETROSPECTIVE', 'OTHER'
  insight_type TEXT DEFAULT 'external',
  tags TEXT[] DEFAULT '{}',
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed BOOLEAN DEFAULT false,
  ai_analysis JSONB
);

-- Sistema de Prompts Especializados
CREATE TABLE custom_prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type TEXT NOT NULL, -- 'global', 'client', 'project'
  client_id UUID REFERENCES clients,
  project_id UUID REFERENCES projects,
  prompt_category TEXT NOT NULL, -- 'sla_risk', 'team_performance', 'cost_analysis', 'sprint_prediction', 'discovery', 'retrospective', '1on1'
  template_name TEXT NOT NULL,
  prompt_content TEXT NOT NULL,
  version_number INTEGER DEFAULT 1,
  parent_version_id UUID REFERENCES custom_prompt_templates,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scope_type, client_id, project_id, prompt_category, version_number)
);

-- Sistema de Discovery Melhorado
ALTER TABLE smart_discovery_sessions ADD COLUMN discovery_name TEXT NOT NULL DEFAULT 'Discovery sem nome';
ALTER TABLE smart_discovery_sessions ADD COLUMN discovery_type TEXT DEFAULT 'standalone'; -- 'standalone', 'project_related'
ALTER TABLE smart_discovery_sessions ADD COLUMN related_project_id UUID REFERENCES projects;
ALTER TABLE smart_discovery_sessions ADD COLUMN can_create_project BOOLEAN DEFAULT true;
ALTER TABLE smart_discovery_sessions ADD COLUMN version_number INTEGER DEFAULT 1;
ALTER TABLE smart_discovery_sessions ADD COLUMN parent_session_id UUID REFERENCES smart_discovery_sessions;

-- Versionamento de Discovery
CREATE TABLE discovery_session_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES smart_discovery_sessions NOT NULL,
  version_number INTEGER NOT NULL,
  version_name TEXT,
  changes_summary TEXT,
  snapshot_data JSONB NOT NULL,
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, version_number)
);

-- Anexos de Discovery
CREATE TABLE session_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES smart_discovery_sessions NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  ai_analysis JSONB
);

-- Enable RLS
ALTER TABLE project_insights_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_session_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies para comentários
CREATE POLICY "Users can view comments for projects they have access to" ON project_insights_comments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM project_permissions pp 
    WHERE pp.project_id = project_insights_comments.project_id 
    AND pp.user_id = auth.uid() 
    AND pp.is_active = true
  )
);

CREATE POLICY "Users can create comments for projects they have write access to" ON project_insights_comments FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_permissions pp 
    WHERE pp.project_id = project_insights_comments.project_id 
    AND pp.user_id = auth.uid() 
    AND pp.permission_type IN ('insights_write', 'admin', 'write')
    AND pp.is_active = true
  ) AND auth.uid() = created_by
);

-- RLS Policies para prompts
CREATE POLICY "Users can view prompt templates for their scope" ON custom_prompt_templates FOR SELECT USING (
  CASE 
    WHEN scope_type = 'global' THEN true
    WHEN scope_type = 'client' THEN EXISTS (
      SELECT 1 FROM project_permissions pp 
      JOIN projects p ON p.id = pp.project_id 
      WHERE p.client_id = custom_prompt_templates.client_id 
      AND pp.user_id = auth.uid() 
      AND pp.is_active = true
    )
    WHEN scope_type = 'project' THEN EXISTS (
      SELECT 1 FROM project_permissions pp 
      WHERE pp.project_id = custom_prompt_templates.project_id 
      AND pp.user_id = auth.uid() 
      AND pp.is_active = true
    )
    ELSE false
  END
);

-- RLS Policies para versionamento
CREATE POLICY "Users can view discovery versions for their sessions" ON discovery_session_versions FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM smart_discovery_sessions sds 
    WHERE sds.id = discovery_session_versions.session_id 
    AND sds.user_id = auth.uid()
  )
);

CREATE POLICY "Users can view session attachments for their sessions" ON session_attachments FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM smart_discovery_sessions sds 
    WHERE sds.id = session_attachments.session_id 
    AND sds.user_id = auth.uid()
  )
);