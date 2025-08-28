-- Create executive_reports table
CREATE TABLE public.executive_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_type TEXT NOT NULL,
  date_range JSONB NOT NULL DEFAULT '{}',
  project_ids UUID[] DEFAULT '{}',
  generated_by UUID NOT NULL,
  content JSONB NOT NULL DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.executive_reports ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own executive reports" 
ON public.executive_reports 
FOR SELECT 
USING (auth.uid() = generated_by);

CREATE POLICY "Users can create their own executive reports" 
ON public.executive_reports 
FOR INSERT 
WITH CHECK (auth.uid() = generated_by);

CREATE POLICY "Users can update their own executive reports" 
ON public.executive_reports 
FOR UPDATE 
USING (auth.uid() = generated_by);

-- Create indexes
CREATE INDEX idx_executive_reports_generated_by ON public.executive_reports(generated_by);
CREATE INDEX idx_executive_reports_report_type ON public.executive_reports(report_type);
CREATE INDEX idx_executive_reports_created_at ON public.executive_reports(created_at);

-- Add trigger for updated_at
CREATE TRIGGER update_executive_reports_updated_at
BEFORE UPDATE ON public.executive_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();