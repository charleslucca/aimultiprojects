-- Update existing users to check their authorization status
UPDATE public.user_profiles 
SET is_authorized = public.is_email_authorized(
  (SELECT email FROM auth.users WHERE id = user_profiles.user_id)
)
WHERE user_profiles.user_id IS NOT NULL;