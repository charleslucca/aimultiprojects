-- Fix the function search path security warning
ALTER FUNCTION public.is_admin_user() SET search_path = 'public';

-- Ensure the function is immutable and secure
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has admin role in user_profiles
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = 'public';