-- First, add cascade delete to project_comments foreign key
ALTER TABLE project_comments 
DROP CONSTRAINT IF EXISTS project_comments_project_id_fkey;

ALTER TABLE project_comments 
ADD CONSTRAINT project_comments_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Also add cascade delete to other related tables that might prevent project deletion
ALTER TABLE project_attachments 
DROP CONSTRAINT IF EXISTS project_attachments_project_id_fkey;

ALTER TABLE project_attachments 
ADD CONSTRAINT project_attachments_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE project_uploads 
DROP CONSTRAINT IF EXISTS project_uploads_project_id_fkey;

ALTER TABLE project_uploads 
ADD CONSTRAINT project_uploads_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE team_members 
DROP CONSTRAINT IF EXISTS team_members_project_id_fkey;

ALTER TABLE team_members 
ADD CONSTRAINT team_members_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

ALTER TABLE project_intelligence_profiles 
DROP CONSTRAINT IF EXISTS project_intelligence_profiles_project_id_fkey;

ALTER TABLE project_intelligence_profiles 
ADD CONSTRAINT project_intelligence_profiles_project_id_fkey 
FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;

-- Add cascade delete for projects -> clients relationship
ALTER TABLE projects 
DROP CONSTRAINT IF EXISTS projects_client_id_fkey;

ALTER TABLE projects 
ADD CONSTRAINT projects_client_id_fkey 
FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE;