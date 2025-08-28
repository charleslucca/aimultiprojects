-- Corrigir função para incluir search_path
CREATE OR REPLACE FUNCTION public.validate_stage_completeness(
  session_data JSONB,
  stage_name TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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