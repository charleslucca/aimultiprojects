-- RLS Policies for authorized_emails
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

-- RLS Policies for user_profiles (additional policies to existing ones)
CREATE POLICY "Users can view their own profile" 
ON public.user_profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile (except authorization)" 
ON public.user_profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND 
  -- Prevent users from changing their own authorization status
  is_authorized = (SELECT is_authorized FROM public.user_profiles WHERE user_id = auth.uid())
);

CREATE POLICY "System can insert user profiles" 
ON public.user_profiles 
FOR INSERT 
WITH CHECK (true);