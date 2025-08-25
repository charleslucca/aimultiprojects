-- Create tables for Jira integration and AI insights

-- Jira configuration table
CREATE TABLE public.jira_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES organizations(id),
  jira_url TEXT NOT NULL,
  api_token_encrypted TEXT,
  username TEXT,
  project_keys TEXT[],
  sync_enabled BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Jira projects cache
CREATE TABLE public.jira_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  jira_id TEXT NOT NULL,
  jira_key TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  project_type TEXT,
  lead_name TEXT,
  config_id UUID REFERENCES jira_configurations(id) ON DELETE CASCADE,
  raw_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Jira issues cache
CREATE TABLE public.jira_issues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  jira_id TEXT NOT NULL,
  jira_key TEXT NOT NULL,
  summary TEXT NOT NULL,
  description TEXT,
  issue_type TEXT,
  status TEXT,
  priority TEXT,
  assignee_name TEXT,
  reporter_name TEXT,
  project_key TEXT,
  config_id UUID REFERENCES jira_configurations(id) ON DELETE CASCADE,
  story_points INTEGER,
  original_estimate INTEGER,
  remaining_estimate INTEGER,
  time_spent INTEGER,
  created_date TIMESTAMP WITH TIME ZONE,
  updated_date TIMESTAMP WITH TIME ZONE,
  resolved_date TIMESTAMP WITH TIME ZONE,
  labels TEXT[],
  components TEXT[],
  fix_versions TEXT[],
  raw_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- AI insights table
CREATE TABLE public.jira_ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  issue_id UUID REFERENCES jira_issues(id) ON DELETE CASCADE,
  project_id UUID REFERENCES jira_projects(id) ON DELETE CASCADE,
  insight_type TEXT NOT NULL, -- 'sla_risk', 'effort_prediction', 'priority_suggestion', 'sentiment', etc.
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00
  insight_data JSONB NOT NULL,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Jira sprints cache
CREATE TABLE public.jira_sprints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  jira_id TEXT NOT NULL,
  name TEXT NOT NULL,
  state TEXT, -- 'future', 'active', 'closed'
  board_id TEXT,
  project_key TEXT,
  config_id UUID REFERENCES jira_configurations(id) ON DELETE CASCADE,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  complete_date TIMESTAMP WITH TIME ZONE,
  goal TEXT,
  raw_data JSONB,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Jira webhooks log
CREATE TABLE public.jira_webhook_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  config_id UUID REFERENCES jira_configurations(id) ON DELETE CASCADE,
  webhook_event TEXT NOT NULL,
  issue_key TEXT,
  payload JSONB NOT NULL,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Dashboard widgets configuration
CREATE TABLE public.jira_dashboard_widgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  organization_id UUID REFERENCES organizations(id),
  widget_type TEXT NOT NULL, -- 'sprint_health', 'team_performance', 'risk_matrix', etc.
  widget_config JSONB NOT NULL,
  position_x INTEGER DEFAULT 0,
  position_y INTEGER DEFAULT 0,
  width INTEGER DEFAULT 4,
  height INTEGER DEFAULT 3,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.jira_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_webhook_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jira_dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for jira_configurations
CREATE POLICY "Users can view jira configurations" ON public.jira_configurations FOR SELECT USING (true);
CREATE POLICY "Users can create jira configurations" ON public.jira_configurations FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update jira configurations" ON public.jira_configurations FOR UPDATE USING (true);
CREATE POLICY "Users can delete jira configurations" ON public.jira_configurations FOR DELETE USING (true);

-- RLS Policies for jira_projects
CREATE POLICY "Users can view jira projects" ON public.jira_projects FOR SELECT USING (true);
CREATE POLICY "Users can create jira projects" ON public.jira_projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update jira projects" ON public.jira_projects FOR UPDATE USING (true);
CREATE POLICY "Users can delete jira projects" ON public.jira_projects FOR DELETE USING (true);

-- RLS Policies for jira_issues
CREATE POLICY "Users can view jira issues" ON public.jira_issues FOR SELECT USING (true);
CREATE POLICY "Users can create jira issues" ON public.jira_issues FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update jira issues" ON public.jira_issues FOR UPDATE USING (true);
CREATE POLICY "Users can delete jira issues" ON public.jira_issues FOR DELETE USING (true);

-- RLS Policies for jira_ai_insights
CREATE POLICY "Users can view jira ai insights" ON public.jira_ai_insights FOR SELECT USING (true);
CREATE POLICY "Users can create jira ai insights" ON public.jira_ai_insights FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update jira ai insights" ON public.jira_ai_insights FOR UPDATE USING (true);
CREATE POLICY "Users can delete jira ai insights" ON public.jira_ai_insights FOR DELETE USING (true);

-- RLS Policies for jira_sprints
CREATE POLICY "Users can view jira sprints" ON public.jira_sprints FOR SELECT USING (true);
CREATE POLICY "Users can create jira sprints" ON public.jira_sprints FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update jira sprints" ON public.jira_sprints FOR UPDATE USING (true);
CREATE POLICY "Users can delete jira sprints" ON public.jira_sprints FOR DELETE USING (true);

-- RLS Policies for jira_webhook_logs
CREATE POLICY "Users can view jira webhook logs" ON public.jira_webhook_logs FOR SELECT USING (true);
CREATE POLICY "Users can create jira webhook logs" ON public.jira_webhook_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update jira webhook logs" ON public.jira_webhook_logs FOR UPDATE USING (true);

-- RLS Policies for jira_dashboard_widgets
CREATE POLICY "Users can view their dashboard widgets" ON public.jira_dashboard_widgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their dashboard widgets" ON public.jira_dashboard_widgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their dashboard widgets" ON public.jira_dashboard_widgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their dashboard widgets" ON public.jira_dashboard_widgets FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_jira_issues_project_key ON jira_issues(project_key);
CREATE INDEX idx_jira_issues_status ON jira_issues(status);
CREATE INDEX idx_jira_issues_assignee ON jira_issues(assignee_name);
CREATE INDEX idx_jira_issues_updated ON jira_issues(updated_date);
CREATE INDEX idx_jira_ai_insights_type ON jira_ai_insights(insight_type);
CREATE INDEX idx_jira_sprints_state ON jira_sprints(state);
CREATE INDEX idx_jira_dashboard_widgets_user ON jira_dashboard_widgets(user_id);

-- Create triggers for updated_at
CREATE TRIGGER update_jira_configurations_updated_at
BEFORE UPDATE ON public.jira_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_jira_dashboard_widgets_updated_at
BEFORE UPDATE ON public.jira_dashboard_widgets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();