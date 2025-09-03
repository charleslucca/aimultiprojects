-- Add missing columns to existing user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS is_authorized BOOLEAN NOT NULL DEFAULT false;

-- Create function to check if email is authorized
CREATE OR REPLACE FUNCTION public.is_email_authorized(email_address TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.authorized_emails 
    WHERE email = email_address 
    AND is_active = true
  )
$$;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  profile_exists BOOLEAN;
BEGIN
  -- Check if profile already exists
  SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE user_id = NEW.id) INTO profile_exists;
  
  IF NOT profile_exists THEN
    -- Insert new profile with authorization check
    INSERT INTO public.user_profiles (
      user_id, 
      first_name, 
      last_name, 
      is_authorized
    ) VALUES (
      NEW.id,
      NEW.raw_user_meta_data ->> 'first_name',
      NEW.raw_user_meta_data ->> 'last_name',
      public.is_email_authorized(NEW.email)
    );
  ELSE
    -- Update existing profile with authorization status
    UPDATE public.user_profiles 
    SET 
      first_name = COALESCE(first_name, NEW.raw_user_meta_data ->> 'first_name'),
      last_name = COALESCE(last_name, NEW.raw_user_meta_data ->> 'last_name'),
      is_authorized = public.is_email_authorized(NEW.email)
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- Insert some initial authorized emails
INSERT INTO public.authorized_emails (email, notes) VALUES
('admin@empresa.com', 'Email administrativo principal'),
('charleslucca@gmail.com', 'Desenvolvedor principal')
ON CONFLICT (email) DO NOTHING;