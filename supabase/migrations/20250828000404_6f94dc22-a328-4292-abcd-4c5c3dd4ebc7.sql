-- FASE 1: INFRAESTRUTURA BASE - Sistema de Perfis e Organizações
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  organization_id UUID REFERENCES organizations,
  full_name TEXT,
  avatar_url TEXT,
  role_in_organization TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sistema de Conectores Múltiplos
CREATE TABLE project_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects NOT NULL,
  client_id UUID REFERENCES clients,
  integration_type TEXT NOT NULL, -- 'jira', 'azure_boards', 'github', 'trello'
  configuration JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sistema de Permissões Granulares
CREATE TABLE project_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects NOT NULL,
  user_id UUID REFERENCES auth.users NOT NULL,
  permission_type TEXT NOT NULL, -- 'read', 'write', 'admin', 'insights_read', 'insights_write', 'discovery_access'
  granted_by UUID REFERENCES auth.users,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  UNIQUE(project_id, user_id, permission_type)
);

-- Sistema de Insights Unificado
CREATE TABLE unified_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects,
  client_id UUID REFERENCES clients,
  insight_type TEXT NOT NULL, -- 'strategic', 'cost_analysis', 'team_performance', 'sla_risk', 'people_burnout', 'external_csm', 'external_sales', 'external_files'
  insight_category TEXT, -- 'HR_CRITICAL', 'FINANCIAL', 'SLA_RISK', 'GENERAL'
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence_score DECIMAL(3,2),
  criticality_score DECIMAL(3,2),
  source_type TEXT NOT NULL, -- 'ai_generated', 'manual_comment', 'file_analysis', 'meeting_transcription'
  source_origin TEXT, -- 'CSM', 'SALES', 'BRAINSTORM', '1:1', 'RETROSPECTIVE', 'OTHER'
  source_id UUID, -- ID da fonte (comentário, arquivo, sessão)
  metadata JSONB DEFAULT '{}',
  created_by UUID REFERENCES auth.users,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE unified_insights ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own profile" ON user_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON user_profiles FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view project integrations they have access to" ON project_integrations FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM project_permissions pp 
    WHERE pp.project_id = project_integrations.project_id 
    AND pp.user_id = auth.uid() 
    AND pp.is_active = true
  )
);

CREATE POLICY "Users can view permissions for projects they have access to" ON project_permissions FOR SELECT USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM project_permissions pp 
    WHERE pp.project_id = project_permissions.project_id 
    AND pp.user_id = auth.uid() 
    AND pp.permission_type IN ('admin', 'write')
    AND pp.is_active = true
  )
);

CREATE POLICY "Users can view insights for projects they have access to" ON unified_insights FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM project_permissions pp 
    WHERE pp.project_id = unified_insights.project_id 
    AND pp.user_id = auth.uid() 
    AND pp.permission_type IN ('insights_read', 'insights_write', 'admin', 'write', 'read')
    AND pp.is_active = true
  )
);