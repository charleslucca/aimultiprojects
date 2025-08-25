-- Make the project-files bucket public to fix the 400 Bad Request errors
UPDATE storage.buckets 
SET public = true 
WHERE id = 'project-files';

-- Create RLS policies for the project-files bucket
CREATE POLICY "Anyone can view files in project-files bucket" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'project-files');

CREATE POLICY "Authenticated users can upload files to project-files bucket" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'project-files' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own files in project-files bucket" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files in project-files bucket" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'project-files' AND auth.uid()::text = (storage.foldername(name))[1]);