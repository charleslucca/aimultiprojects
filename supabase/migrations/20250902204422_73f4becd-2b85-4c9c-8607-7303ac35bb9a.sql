-- Create tables for GitHub workflows and releases to support AI insights

-- GitHub Workflows table
CREATE TABLE public.github_workflows (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL,
  repository_id UUID NOT NULL,
  github_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  state TEXT,
  badge_url TEXT,
  html_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  raw_data JSONB DEFAULT '{}'::JSONB,
  CONSTRAINT github_workflows_unique UNIQUE(github_id, repository_id)
);

-- GitHub Releases table
CREATE TABLE public.github_releases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL,
  repository_id UUID NOT NULL,
  github_id BIGINT NOT NULL,
  tag_name TEXT NOT NULL,
  name TEXT,
  body TEXT,
  draft BOOLEAN DEFAULT false,
  prerelease BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  raw_data JSONB DEFAULT '{}'::JSONB,
  CONSTRAINT github_releases_unique UNIQUE(github_id, repository_id)
);

-- GitHub Workflow Runs table for pipeline health insights
CREATE TABLE public.github_workflow_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL,
  repository_id UUID NOT NULL,
  workflow_id UUID NOT NULL,
  github_id BIGINT NOT NULL,
  run_number INTEGER,
  status TEXT,
  conclusion TEXT,
  workflow_name TEXT,
  head_branch TEXT,
  head_sha TEXT,
  run_started_at TIMESTAMP WITH TIME ZONE,
  run_updated_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  raw_data JSONB DEFAULT '{}'::JSONB,
  CONSTRAINT github_workflow_runs_unique UNIQUE(github_id, repository_id)
);

-- Enable RLS on all tables
ALTER TABLE public.github_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_releases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_workflow_runs ENABLE ROW LEVEL SECURITY;

-- Create policies for GitHub workflows
CREATE POLICY "System can manage GitHub workflows"
ON public.github_workflows
FOR ALL
USING (true);

CREATE POLICY "Users can view GitHub workflows for their project integrations"
ON public.github_workflows
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_integrations pi
    JOIN project_permissions pp ON pp.project_id = pi.project_id
    WHERE pi.id = github_workflows.integration_id
    AND pp.user_id = auth.uid()
    AND pp.is_active = true
  )
);

-- Create policies for GitHub releases
CREATE POLICY "System can manage GitHub releases"
ON public.github_releases
FOR ALL
USING (true);

CREATE POLICY "Users can view GitHub releases for their project integrations"
ON public.github_releases
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_integrations pi
    JOIN project_permissions pp ON pp.project_id = pi.project_id
    WHERE pi.id = github_releases.integration_id
    AND pp.user_id = auth.uid()
    AND pp.is_active = true
  )
);

-- Create policies for GitHub workflow runs
CREATE POLICY "System can manage GitHub workflow runs"
ON public.github_workflow_runs
FOR ALL
USING (true);

CREATE POLICY "Users can view GitHub workflow runs for their project integrations"
ON public.github_workflow_runs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_integrations pi
    JOIN project_permissions pp ON pp.project_id = pi.project_id
    WHERE pi.id = github_workflow_runs.integration_id
    AND pp.user_id = auth.uid()
    AND pp.is_active = true
  )
);

-- Add indexes for better performance
CREATE INDEX idx_github_workflows_integration_id ON public.github_workflows(integration_id);
CREATE INDEX idx_github_workflows_repository_id ON public.github_workflows(repository_id);
CREATE INDEX idx_github_releases_integration_id ON public.github_releases(integration_id);
CREATE INDEX idx_github_releases_repository_id ON public.github_releases(repository_id);
CREATE INDEX idx_github_releases_published_at ON public.github_releases(published_at);
CREATE INDEX idx_github_workflow_runs_integration_id ON public.github_workflow_runs(integration_id);
CREATE INDEX idx_github_workflow_runs_workflow_id ON public.github_workflow_runs(workflow_id);
CREATE INDEX idx_github_workflow_runs_status ON public.github_workflow_runs(status);
CREATE INDEX idx_github_workflow_runs_started_at ON public.github_workflow_runs(run_started_at);