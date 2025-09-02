-- Fix RLS policies for project_integrations table to allow INSERT, UPDATE, DELETE operations

-- Create policy to allow users to insert integrations for projects they have access to
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
  )
);

-- Create policy to allow users to update integrations for projects they have access to
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
  )
);

-- Create policy to allow users to delete integrations for projects they have access to
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
  )
);