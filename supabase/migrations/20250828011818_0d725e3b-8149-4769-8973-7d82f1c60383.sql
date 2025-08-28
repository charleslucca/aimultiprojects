-- Implementar sistema de prompts editáveis e versionamento de discovery
-- Tabela de templates de prompts personalizáveis
CREATE TABLE IF NOT EXISTS custom_prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_type TEXT NOT NULL, -- 'global', 'client', 'project'
  client_id UUID REFERENCES clients,
  project_id UUID REFERENCES projects,
  prompt_category TEXT NOT NULL, -- 'sla_risk', 'team_performance', 'cost_analysis', 'sprint_prediction', 'discovery', 'retrospective', '1on1'
  template_name TEXT NOT NULL,
  prompt_content TEXT NOT NULL,
  version_number INTEGER DEFAULT 1,
  parent_version_id UUID REFERENCES custom_prompt_templates,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scope_type, client_id, project_id, prompt_category, version_number)
);

-- Tabela de versões de sessões de discovery
CREATE TABLE IF NOT EXISTS discovery_session_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES smart_discovery_sessions NOT NULL,
  version_number INTEGER NOT NULL,
  version_name TEXT,
  changes_summary TEXT,
  snapshot_data JSONB NOT NULL, -- Dados completos da versão
  created_by UUID REFERENCES auth.users NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, version_number)
);

-- Tabela de anexos de sessões
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

-- Habilitar RLS nas novas tabelas
ALTER TABLE custom_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovery_session_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_attachments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para custom_prompt_templates
CREATE POLICY "Users can view prompt templates for their scope" ON custom_prompt_templates
  FOR SELECT USING (
    CASE 
      WHEN scope_type = 'global' THEN true
      WHEN scope_type = 'client' THEN EXISTS (
        SELECT 1 FROM project_permissions pp 
        JOIN projects p ON p.id = pp.project_id 
        WHERE p.client_id = custom_prompt_templates.client_id 
        AND pp.user_id = auth.uid() 
        AND pp.is_active = true
      )
      WHEN scope_type = 'project' THEN EXISTS (
        SELECT 1 FROM project_permissions pp 
        WHERE pp.project_id = custom_prompt_templates.project_id 
        AND pp.user_id = auth.uid() 
        AND pp.is_active = true
      )
      ELSE false
    END
  );

-- Políticas RLS para discovery_session_versions
CREATE POLICY "Users can view discovery versions for their sessions" ON discovery_session_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM smart_discovery_sessions sds 
      WHERE sds.id = discovery_session_versions.session_id 
      AND sds.user_id = auth.uid()
    )
  );

-- Políticas RLS para session_attachments
CREATE POLICY "Users can view session attachments for their sessions" ON session_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM smart_discovery_sessions sds 
      WHERE sds.id = session_attachments.session_id 
      AND sds.user_id = auth.uid()
    )
  );

-- Inserir prompts padrão para discovery
INSERT INTO custom_prompt_templates (scope_type, prompt_category, template_name, prompt_content, created_by) VALUES
('global', 'discovery', 'Business Model Canvas', 'Você é um especialista em Business Model Canvas. Seu objetivo é gerar perguntas estruturadas para uma reunião de descoberta sobre o modelo de negócio. 

Contexto atual da sessão: {session_context}
Histórico da conversa: {conversation_history}

Baseado nas informações coletadas até agora, gere 3-5 perguntas específicas que devem ser feitas em uma reunião para preencher o Business Model Canvas. Foque em:
- Proposta de valor
- Segmentos de clientes
- Canais de distribuição
- Fontes de receita
- Recursos principais

Formato de resposta:
```json
{
  "questions": [
    {
      "category": "proposta_valor",
      "question": "Pergunta específica",
      "context": "Por que esta pergunta é importante"
    }
  ],
  "next_steps": "Próximos passos sugeridos",
  "meeting_format": "Como conduzir a reunião"
}
```', (SELECT id FROM auth.users LIMIT 1)),

('global', 'discovery', 'Inception Workshop', 'Você é um facilitador experiente de Inception Workshops. Seu objetivo é gerar perguntas para uma reunião de inception que defina claramente o produto.

Contexto atual da sessão: {session_context}
Histórico da conversa: {conversation_history}

Gere perguntas específicas para uma reunião de inception focando em:
- Visão do produto
- Objetivos do projeto
- Personas
- Jornada do usuário
- Funcionalidades essenciais

Retorne no formato JSON com perguntas categorizadas.', (SELECT id FROM auth.users LIMIT 1)),

('global', 'discovery', 'Product Backlog Building', 'Você é um Product Owner experiente. Seu objetivo é gerar perguntas para uma reunião de construção de backlog priorizado.

Contexto atual da sessão: {session_context}
Histórico da conversa: {conversation_history}

Gere perguntas específicas para uma reunião de PBB focando em:
- Épicos e funcionalidades
- Critérios de priorização
- Definição de pronto
- Estimativas iniciais
- Dependências

Retorne no formato JSON com perguntas categorizadas.', (SELECT id FROM auth.users LIMIT 1)),

('global', 'discovery', 'Sprint 0', 'Você é um Scrum Master experiente. Seu objetivo é gerar perguntas para uma reunião de Sprint 0 que prepare a equipe para o desenvolvimento.

Contexto atual da sessão: {session_context}
Histórico da conversa: {conversation_history}

Gere perguntas específicas para uma reunião de Sprint 0 focando em:
- Configuração do ambiente
- Definição de ferramentas
- Padrões de código
- Processo de desenvolvimento
- Critérios de qualidade

Retorne no formato JSON com perguntas categorizadas.', (SELECT id FROM auth.users LIMIT 1));

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_custom_prompt_templates_updated_at BEFORE UPDATE ON custom_prompt_templates FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();