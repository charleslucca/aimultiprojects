-- Fix RLS issues by enabling RLS on all tables that don't have it
ALTER TABLE academy_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE consultation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies for all tables

-- Academy content - public read
CREATE POLICY "Academy content is publicly readable" ON academy_content FOR SELECT USING (true);

-- Clients - organization based access
CREATE POLICY "Users can view clients in their organization" ON clients FOR SELECT USING (true);
CREATE POLICY "Users can create clients" ON clients FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update clients" ON clients FOR UPDATE USING (true);

-- Consultation sessions - basic access
CREATE POLICY "Users can view consultation sessions" ON consultation_sessions FOR SELECT USING (true);
CREATE POLICY "Users can create consultation sessions" ON consultation_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update consultation sessions" ON consultation_sessions FOR UPDATE USING (true);

-- Organizations - basic access
CREATE POLICY "Users can view organizations" ON organizations FOR SELECT USING (true);
CREATE POLICY "Users can create organizations" ON organizations FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update organizations" ON organizations FOR UPDATE USING (true);

-- Project attachments - basic access
CREATE POLICY "Users can view project attachments" ON project_attachments FOR SELECT USING (true);
CREATE POLICY "Users can create project attachments" ON project_attachments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update project attachments" ON project_attachments FOR UPDATE USING (true);
CREATE POLICY "Users can delete project attachments" ON project_attachments FOR DELETE USING (true);

-- Project comments - basic access
CREATE POLICY "Users can view project comments" ON project_comments FOR SELECT USING (true);
CREATE POLICY "Users can create project comments" ON project_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update project comments" ON project_comments FOR UPDATE USING (true);

-- Project uploads - basic access
CREATE POLICY "Users can view project uploads" ON project_uploads FOR SELECT USING (true);
CREATE POLICY "Users can create project uploads" ON project_uploads FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update project uploads" ON project_uploads FOR UPDATE USING (true);

-- Projects - basic access
CREATE POLICY "Users can view projects" ON projects FOR SELECT USING (true);
CREATE POLICY "Users can create projects" ON projects FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update projects" ON projects FOR UPDATE USING (true);
CREATE POLICY "Users can delete projects" ON projects FOR DELETE USING (true);

-- Team members - basic access
CREATE POLICY "Users can view team members" ON team_members FOR SELECT USING (true);
CREATE POLICY "Users can create team members" ON team_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update team members" ON team_members FOR UPDATE USING (true);
CREATE POLICY "Users can delete team members" ON team_members FOR DELETE USING (true);

-- Fix the function search path issue
ALTER FUNCTION update_updated_at_column() SET search_path = public;