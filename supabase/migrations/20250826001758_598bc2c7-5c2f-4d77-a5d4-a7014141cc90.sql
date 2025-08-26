-- Add client_id to jira_configurations table for linking Jira configs to specific clients
ALTER TABLE public.jira_configurations 
ADD COLUMN client_id UUID REFERENCES public.clients(id);

-- Enhance clients table with status and health tracking fields
ALTER TABLE public.clients 
ADD COLUMN status_color TEXT DEFAULT 'green' CHECK (status_color IN ('red', 'yellow', 'green')),
ADD COLUMN risk_level TEXT DEFAULT 'low' CHECK (risk_level IN ('low', 'medium', 'high')),
ADD COLUMN overall_health JSONB DEFAULT '{"score": 100, "details": {}}',
ADD COLUMN last_health_update TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add indexes for better performance on new fields
CREATE INDEX idx_jira_configurations_client_id ON public.jira_configurations(client_id);
CREATE INDEX idx_clients_status_color ON public.clients(status_color);
CREATE INDEX idx_clients_risk_level ON public.clients(risk_level);