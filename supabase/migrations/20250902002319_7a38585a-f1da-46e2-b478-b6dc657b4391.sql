-- Create unified smart hub chat table
CREATE TABLE public.smart_hub_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chat_name TEXT NOT NULL DEFAULT 'Nova Conversa',
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  generated_artifacts JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.smart_hub_chats ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own chats" 
ON public.smart_hub_chats 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chats" 
ON public.smart_hub_chats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats" 
ON public.smart_hub_chats 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats" 
ON public.smart_hub_chats 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_smart_hub_chats_updated_at
BEFORE UPDATE ON public.smart_hub_chats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update storage policies for unified uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('smart-hub-files', 'smart-hub-files', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for smart hub files
CREATE POLICY "Users can view their own smart hub files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'smart-hub-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own smart hub files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'smart-hub-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own smart hub files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'smart-hub-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own smart hub files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'smart-hub-files' AND auth.uid()::text = (storage.foldername(name))[1]);