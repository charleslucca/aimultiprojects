-- RLS Policies for authorized_emails only (user_profiles policies already exist)
CREATE POLICY "Authorized users can view authorized emails" 
ON public.authorized_emails 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() AND is_authorized = true
  )
);

CREATE POLICY "Authorized users can manage authorized emails" 
ON public.authorized_emails 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE user_id = auth.uid() AND is_authorized = true
  )
);