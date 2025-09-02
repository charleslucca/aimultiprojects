-- Create GitHub repositories table
CREATE TABLE public.github_repositories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL,
  github_id BIGINT NOT NULL,
  name TEXT NOT NULL,
  full_name TEXT NOT NULL,
  description TEXT,
  private BOOLEAN DEFAULT false,
  default_branch TEXT DEFAULT 'main',
  language TEXT,
  size_kb INTEGER DEFAULT 0,
  stars_count INTEGER DEFAULT 0,
  forks_count INTEGER DEFAULT 0,
  open_issues_count INTEGER DEFAULT 0,
  watchers_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  pushed_at TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  raw_data JSONB DEFAULT '{}'::jsonb,
  project_id UUID
);

-- Create GitHub commits table
CREATE TABLE public.github_commits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL,
  repository_id UUID NOT NULL,
  sha TEXT NOT NULL,
  message TEXT NOT NULL,
  author_name TEXT,
  author_email TEXT,
  committer_name TEXT,
  committer_email TEXT,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  changed_files INTEGER DEFAULT 0,
  commit_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  raw_data JSONB DEFAULT '{}'::jsonb
);

-- Create GitHub pull requests table
CREATE TABLE public.github_pull_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL,
  repository_id UUID NOT NULL,
  github_id BIGINT NOT NULL,
  number INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  state TEXT NOT NULL, -- open, closed, merged
  author_login TEXT,
  assignee_login TEXT,
  base_branch TEXT,
  head_branch TEXT,
  mergeable BOOLEAN,
  merged BOOLEAN DEFAULT false,
  draft BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  closed_at TIMESTAMP WITH TIME ZONE,
  merged_at TIMESTAMP WITH TIME ZONE,
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  raw_data JSONB DEFAULT '{}'::jsonb
);

-- Create GitHub contributors table
CREATE TABLE public.github_contributors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL,
  repository_id UUID NOT NULL,
  login TEXT NOT NULL,
  github_id BIGINT NOT NULL,
  avatar_url TEXT,
  contributions INTEGER DEFAULT 0,
  commits_count INTEGER DEFAULT 0,
  additions INTEGER DEFAULT 0,
  deletions INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  synced_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  raw_data JSONB DEFAULT '{}'::jsonb
);

-- Create GitHub code metrics table
CREATE TABLE public.github_code_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id UUID NOT NULL,
  repository_id UUID NOT NULL,
  metric_type TEXT NOT NULL, -- lines_of_code, complexity, test_coverage, technical_debt
  metric_value NUMERIC,
  metric_data JSONB DEFAULT '{}'::jsonb,
  measured_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all GitHub tables
ALTER TABLE public.github_repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_commits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_pull_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_code_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for GitHub repositories
CREATE POLICY "Users can view GitHub repositories for their project integrations"
ON public.github_repositories
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_integrations pi
    JOIN project_permissions pp ON pp.project_id = pi.project_id
    WHERE pi.id = github_repositories.integration_id
    AND pp.user_id = auth.uid()
    AND pp.is_active = true
  )
);

CREATE POLICY "System can manage GitHub repositories"
ON public.github_repositories
FOR ALL
USING (true);

-- Create RLS policies for GitHub commits
CREATE POLICY "Users can view GitHub commits for their project integrations"
ON public.github_commits
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM github_repositories gr
    JOIN project_integrations pi ON pi.id = gr.integration_id
    JOIN project_permissions pp ON pp.project_id = pi.project_id
    WHERE gr.id = github_commits.repository_id
    AND pp.user_id = auth.uid()
    AND pp.is_active = true
  )
);

CREATE POLICY "System can manage GitHub commits"
ON public.github_commits
FOR ALL
USING (true);

-- Create RLS policies for GitHub pull requests
CREATE POLICY "Users can view GitHub PRs for their project integrations"
ON public.github_pull_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM github_repositories gr
    JOIN project_integrations pi ON pi.id = gr.integration_id
    JOIN project_permissions pp ON pp.project_id = pi.project_id
    WHERE gr.id = github_pull_requests.repository_id
    AND pp.user_id = auth.uid()
    AND pp.is_active = true
  )
);

CREATE POLICY "System can manage GitHub PRs"
ON public.github_pull_requests
FOR ALL
USING (true);

-- Create RLS policies for GitHub contributors
CREATE POLICY "Users can view GitHub contributors for their project integrations"
ON public.github_contributors
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM github_repositories gr
    JOIN project_integrations pi ON pi.id = gr.integration_id
    JOIN project_permissions pp ON pp.project_id = pi.project_id
    WHERE gr.id = github_contributors.repository_id
    AND pp.user_id = auth.uid()
    AND pp.is_active = true
  )
);

CREATE POLICY "System can manage GitHub contributors"
ON public.github_contributors
FOR ALL
USING (true);

-- Create RLS policies for GitHub code metrics
CREATE POLICY "Users can view GitHub metrics for their project integrations"
ON public.github_code_metrics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM github_repositories gr
    JOIN project_integrations pi ON pi.id = gr.integration_id
    JOIN project_permissions pp ON pp.project_id = pi.project_id
    WHERE gr.id = github_code_metrics.repository_id
    AND pp.user_id = auth.uid()
    AND pp.is_active = true
  )
);

CREATE POLICY "System can manage GitHub metrics"
ON public.github_code_metrics
FOR ALL
USING (true);

-- Create indexes for better performance
CREATE INDEX idx_github_repositories_integration_id ON public.github_repositories(integration_id);
CREATE INDEX idx_github_commits_repository_id ON public.github_commits(repository_id);
CREATE INDEX idx_github_commits_commit_date ON public.github_commits(commit_date);
CREATE INDEX idx_github_pull_requests_repository_id ON public.github_pull_requests(repository_id);
CREATE INDEX idx_github_pull_requests_state ON public.github_pull_requests(state);
CREATE INDEX idx_github_contributors_repository_id ON public.github_contributors(repository_id);
CREATE INDEX idx_github_code_metrics_repository_id ON public.github_code_metrics(repository_id);
CREATE INDEX idx_github_code_metrics_type ON public.github_code_metrics(metric_type);