-- Fix infinite recursion in project_permissions RLS policy
-- Remove the problematic policy and create a simpler one

DROP POLICY IF EXISTS "Users can view permissions for projects they have access to" ON public.project_permissions;

-- Create a simple policy that allows users to see their own permissions
CREATE POLICY "Users can view their own permissions" 
ON public.project_permissions 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create a policy for admins to see all permissions (using a security definer function)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has admin role in user_profiles
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

CREATE POLICY "Admins can view all permissions" 
ON public.project_permissions 
FOR SELECT 
USING (public.is_admin_user());

-- Create policies for other operations
CREATE POLICY "Users can insert their own permissions" 
ON public.project_permissions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own permissions" 
ON public.project_permissions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all permissions" 
ON public.project_permissions 
FOR ALL 
USING (public.is_admin_user());