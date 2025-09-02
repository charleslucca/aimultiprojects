-- Fix RLS policies and add project creator permissions
-- First, check if projects table has created_by column
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Create a function to automatically grant admin permissions to project creator
CREATE OR REPLACE FUNCTION public.grant_creator_permissions()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert admin permission for project creator
  INSERT INTO public.project_permissions (
    project_id,
    user_id,
    permission_type,
    granted_by,
    is_active
  ) VALUES (
    NEW.id,
    COALESCE(NEW.created_by, auth.uid()),
    'admin',
    auth.uid(),
    true
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically grant permissions on project creation
DROP TRIGGER IF EXISTS auto_grant_creator_permissions ON public.projects;
CREATE TRIGGER auto_grant_creator_permissions
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.grant_creator_permissions();

-- Alternative: Add policy to allow project creators to manage integrations
-- This policy allows users who created projects (or if created_by is null, any authenticated user) to manage integrations
DROP POLICY IF EXISTS "Users can create project integrations for their projects" ON public.project_integrations;
DROP POLICY IF EXISTS "Users can update project integrations for their projects" ON public.project_integrations;
DROP POLICY IF EXISTS "Users can delete project integrations for their projects" ON public.project_integrations;

-- More permissive policies that check both permissions and project ownership
CREATE POLICY "Users can create project integrations for their projects" 
ON public.project_integrations 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM project_permissions pp 
    WHERE pp.project_id = project_integrations.project_id 
    AND pp.user_id = auth.uid() 
    AND pp.permission_type IN ('admin', 'write') 
    AND pp.is_active = true
  ) OR EXISTS (
    SELECT 1 
    FROM projects p 
    WHERE p.id = project_integrations.project_id 
    AND (p.created_by = auth.uid() OR p.created_by IS NULL)
  )
);

CREATE POLICY "Users can update project integrations for their projects" 
ON public.project_integrations 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM project_permissions pp 
    WHERE pp.project_id = project_integrations.project_id 
    AND pp.user_id = auth.uid() 
    AND pp.permission_type IN ('admin', 'write') 
    AND pp.is_active = true
  ) OR EXISTS (
    SELECT 1 
    FROM projects p 
    WHERE p.id = project_integrations.project_id 
    AND (p.created_by = auth.uid() OR p.created_by IS NULL)
  )
);

CREATE POLICY "Users can delete project integrations for their projects" 
ON public.project_integrations 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 
    FROM project_permissions pp 
    WHERE pp.project_id = project_integrations.project_id 
    AND pp.user_id = auth.uid() 
    AND pp.permission_type IN ('admin', 'write') 
    AND pp.is_active = true
  ) OR EXISTS (
    SELECT 1 
    FROM projects p 
    WHERE p.id = project_integrations.project_id 
    AND (p.created_by = auth.uid() OR p.created_by IS NULL)
  )
);