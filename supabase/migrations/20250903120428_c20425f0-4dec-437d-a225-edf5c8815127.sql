-- Create smart_hub_chats table for storing technical expert conversations
CREATE TABLE IF NOT EXISTS public.smart_hub_chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  chat_type TEXT NOT NULL DEFAULT 'product_expert',
  messages JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.smart_hub_chats ENABLE ROW LEVEL SECURITY;

-- Create policies for smart_hub_chats
CREATE POLICY "Users can create their own chats" 
ON public.smart_hub_chats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own chats" 
ON public.smart_hub_chats 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own chats" 
ON public.smart_hub_chats 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own chats" 
ON public.smart_hub_chats 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add technical expert prompt templates
INSERT INTO public.custom_prompt_templates (
  template_name, 
  prompt_category, 
  scope_type, 
  prompt_content, 
  created_by
) VALUES 
(
  'technical_repository_analysis',
  'technical',
  'global',
  'Analise este repositório e gere uma documentação completa da arquitetura em markdown. Inclua: estrutura de pastas, dependências principais, padrões arquiteturais, pontos de entrada, fluxo de dados, e recomendações de melhoria.',
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'technical_security_analysis',
  'technical', 
  'global',
  'Realize uma análise de segurança detalhada do código. Identifique vulnerabilidades potenciais, práticas inseguras, dependências com problemas conhecidos, e forneça recomendações específicas para correção.',
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'technical_performance_analysis',
  'technical',
  'global', 
  'Analise o código em busca de problemas de performance. Identifique bottlenecks potenciais, uso ineficiente de recursos, consultas lentas, e sugira otimizações específicas com exemplos de código.',
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'technical_quality_analysis',
  'technical',
  'global',
  'Realize uma análise de qualidade do código focando em: aderência a padrões, code smells, complexidade ciclomática, cobertura de testes, documentação, e manutenibilidade. Forneça sugestões práticas de melhoria.',
  (SELECT id FROM auth.users LIMIT 1)
),
(
  'technical_test_generation',
  'technical',
  'global',
  'Analise o código e sugira uma estratégia abrangente de testes automatizados. Inclua: testes unitários, testes de integração, testes E2E, mocks necessários, e exemplos de implementação.',
  (SELECT id FROM auth.users LIMIT 1)
);

-- Create updated_at trigger for smart_hub_chats
CREATE OR REPLACE FUNCTION update_smart_hub_chats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_smart_hub_chats_updated_at
    BEFORE UPDATE ON public.smart_hub_chats
    FOR EACH ROW
    EXECUTE FUNCTION update_smart_hub_chats_updated_at();