-- Test GitHub sync by updating the integration timestamp
-- This will help us see if sync is working
UPDATE project_integrations 
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'), 
  '{test_sync}', 
  to_jsonb(now()::text)
) 
WHERE integration_type = 'github' AND id = 'd4ffbac3-b347-4a11-aa84-8067c7c55f80';

-- Add index for better performance on GitHub queries
CREATE INDEX IF NOT EXISTS idx_github_repositories_integration_id ON github_repositories(integration_id);
CREATE INDEX IF NOT EXISTS idx_github_commits_integration_id ON github_commits(integration_id);
CREATE INDEX IF NOT EXISTS idx_github_pull_requests_integration_id ON github_pull_requests(integration_id);