-- Fase 1: Corrigir RLS e adicionar estrutura para status de etapas

-- 1. Adicionar política INSERT faltante para discovery_session_versions
CREATE POLICY "Users can create discovery session versions for their sessions"
ON public.discovery_session_versions
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.smart_discovery_sessions sds
    WHERE sds.id = discovery_session_versions.session_id 
    AND sds.user_id = auth.uid()
  )
);

-- 2. Adicionar coluna stage_status para controlar status individual das etapas
ALTER TABLE public.smart_discovery_sessions 
ADD COLUMN IF NOT EXISTS stage_status JSONB DEFAULT '{"business_canvas": "pending", "inception": "pending", "pbb": "pending", "sprint0": "pending"}'::jsonb;

-- 3. Adicionar coluna para marcar quando sessão foi finalizada
ALTER TABLE public.smart_discovery_sessions 
ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- 4. Adicionar coluna para documento final gerado
ALTER TABLE public.smart_discovery_sessions 
ADD COLUMN IF NOT EXISTS final_document JSONB DEFAULT NULL;

-- 5. Adicionar política DELETE para permitir excluir sessões
CREATE POLICY "Users can delete their discovery sessions"
ON public.smart_discovery_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- 6. Atualizar política UPDATE para permitir updates em discovery_session_versions  
CREATE POLICY "Users can update discovery session versions for their sessions"
ON public.discovery_session_versions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.smart_discovery_sessions sds
    WHERE sds.id = discovery_session_versions.session_id 
    AND sds.user_id = auth.uid()
  )
);

-- 7. Adicionar função para validar completude das etapas
CREATE OR REPLACE FUNCTION public.validate_stage_completeness(
  session_data JSONB,
  stage_name TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  CASE stage_name
    WHEN 'business_canvas' THEN
      RETURN session_data->'business_canvas_data'->'questions' IS NOT NULL 
        AND jsonb_array_length(session_data->'business_canvas_data'->'questions') >= 3;
    WHEN 'inception' THEN
      RETURN session_data->'inception_data'->'questions' IS NOT NULL 
        AND jsonb_array_length(session_data->'inception_data'->'questions') >= 3;
    WHEN 'pbb' THEN
      RETURN session_data->'pbb_data'->'questions' IS NOT NULL 
        AND jsonb_array_length(session_data->'pbb_data'->'questions') >= 3;
    WHEN 'sprint0' THEN
      RETURN session_data->'sprint0_data'->'questions' IS NOT NULL 
        AND jsonb_array_length(session_data->'sprint0_data'->'questions') >= 3;
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;