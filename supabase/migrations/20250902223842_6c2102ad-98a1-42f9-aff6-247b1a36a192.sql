-- First, migrate existing Jira insights to unified_insights table, excluding invalid project_ids
INSERT INTO public.unified_insights (
  project_id,
  insight_type,
  source_type,
  title,
  content,
  metadata,
  confidence_score,
  criticality_score,
  expires_at,
  source_origin,
  created_at
)
SELECT 
  ji.project_id,
  ji.insight_type,
  'jira' as source_type,
  CASE 
    WHEN ji.insight_type = 'sla_risk' THEN 'Análise de Risco SLA'
    WHEN ji.insight_type = 'sprint_completion' THEN 'Previsão de Conclusão Sprint'
    WHEN ji.insight_type = 'team_performance' THEN 'Análise de Performance da Equipe'
    WHEN ji.insight_type = 'priority_rebalancing' THEN 'Rebalanceamento de Prioridades'
    WHEN ji.insight_type = 'sentiment_analysis' THEN 'Análise de Sentimento'
    WHEN ji.insight_type = 'cost_analysis' THEN 'Análise de Custos'
    WHEN ji.insight_type = 'productivity_economics' THEN 'Análise de Produtividade'
    WHEN ji.insight_type = 'budget_alerts' THEN 'Alertas de Orçamento'
    ELSE 'Insight Jira'
  END as title,
  ji.insight_data::text as content,
  jsonb_build_object(
    'executive_summary', ji.executive_summary,
    'alert_category', ji.alert_category,
    'issue_id', ji.issue_id
  ) as metadata,
  ji.confidence_score,
  ji.criticality_score,
  ji.expires_at,
  'jira-ai-insights' as source_origin,
  ji.created_at
FROM public.jira_ai_insights ji
INNER JOIN public.projects p ON p.id = ji.project_id  -- Only migrate insights with valid project_ids
WHERE NOT EXISTS (
  SELECT 1 FROM public.unified_insights ui 
  WHERE ui.project_id = ji.project_id 
  AND ui.insight_type = ji.insight_type 
  AND ui.source_type = 'jira'
  AND ui.created_at = ji.created_at
);