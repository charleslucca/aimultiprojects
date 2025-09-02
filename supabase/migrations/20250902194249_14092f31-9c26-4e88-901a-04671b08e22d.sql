-- Add missing unique constraints for GitHub tables to support upsert operations

-- Add unique constraint for github_repositories (integration_id, github_id)
ALTER TABLE public.github_repositories 
ADD CONSTRAINT github_repositories_integration_github_id_unique 
UNIQUE (integration_id, github_id);

-- Add unique constraint for github_commits (sha, repository_id)
ALTER TABLE public.github_commits 
ADD CONSTRAINT github_commits_sha_repository_id_unique 
UNIQUE (sha, repository_id);

-- Add unique constraint for github_pull_requests (github_id, repository_id)  
ALTER TABLE public.github_pull_requests 
ADD CONSTRAINT github_pull_requests_github_repository_id_unique 
UNIQUE (github_id, repository_id);

-- Add unique constraint for github_contributors (github_id, repository_id)
ALTER TABLE public.github_contributors 
ADD CONSTRAINT github_contributors_github_repository_id_unique 
UNIQUE (github_id, repository_id);