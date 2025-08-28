-- Verificar e criar apenas o que não existe para discovery system

-- Tabela de versões de sessões de discovery (se não existir)
CREATE TABLE IF NOT EXISTS discovery_session_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES smart_discovery_sessions NOT NULL,
  version_number INTEGER NOT NULL,
  version_name TEXT,
  changes_summary TEXT,
  snapshot_data JSONB NOT NULL,
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, version_number)
);

-- Tabela de anexos de sessões (se não existir)
CREATE TABLE IF NOT EXISTS session_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES smart_discovery_sessions NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID REFERENCES auth.users NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  ai_analysis JSONB
);

-- Verificar se as políticas RLS não existem antes de criar
DO $$
BEGIN
  -- RLS para discovery_session_versions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'discovery_session_versions' 
    AND policyname = 'Users can view discovery versions for their sessions'
  ) THEN
    ALTER TABLE discovery_session_versions ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view discovery versions for their sessions" ON discovery_session_versions
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM smart_discovery_sessions sds 
          WHERE sds.id = discovery_session_versions.session_id 
          AND sds.user_id = auth.uid()
        )
      );
  END IF;

  -- RLS para session_attachments
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'session_attachments' 
    AND policyname = 'Users can view session attachments for their sessions'
  ) THEN
    ALTER TABLE session_attachments ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can view session attachments for their sessions" ON session_attachments
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM smart_discovery_sessions sds 
          WHERE sds.id = session_attachments.session_id 
          AND sds.user_id = auth.uid()
        )
      );
  END IF;
END $$;