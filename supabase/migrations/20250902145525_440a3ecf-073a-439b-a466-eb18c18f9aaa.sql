-- Fix function search_path security issue
CREATE OR REPLACE FUNCTION public.grant_creator_permissions()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
$$;