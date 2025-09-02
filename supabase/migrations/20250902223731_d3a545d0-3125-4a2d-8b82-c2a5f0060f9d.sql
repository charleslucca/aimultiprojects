-- Migrate existing Jira insights to unified_insights table
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
  project_id,
  insight_type,
  'jira' as source_type,
  CASE 
    WHEN insight_type = 'sla_risk' THEN 'Análise de Risco SLA'
    WHEN insight_type = 'sprint_completion' THEN 'Previsão de Conclusão Sprint'
    WHEN insight_type = 'team_performance' THEN 'Análise de Performance da Equipe'
    WHEN insight_type = 'priority_rebalancing' THEN 'Rebalanceamento de Prioridades'
    WHEN insight_type = 'sentiment_analysis' THEN 'Análise de Sentimento'
    WHEN insight_type = 'cost_analysis' THEN 'Análise de Custos'
    WHEN insight_type = 'productivity_economics' THEN 'Análise de Produtividade'
    WHEN insight_type = 'budget_alerts' THEN 'Alertas de Orçamento'
    ELSE 'Insight Jira'
  END as title,
  insight_data::text as content,
  jsonb_build_object(
    'executive_summary', executive_summary,
    'alert_category', alert_category,
    'issue_id', issue_id
  ) as metadata,
  confidence_score,
  criticality_score,
  expires_at,
  'jira-ai-insights' as source_origin,
  created_at
FROM public.jira_ai_insights
WHERE NOT EXISTS (
  SELECT 1 FROM public.unified_insights ui 
  WHERE ui.project_id = jira_ai_insights.project_id 
  AND ui.insight_type = jira_ai_insights.insight_type 
  AND ui.source_type = 'jira'
  AND ui.created_at = jira_ai_insights.created_at
);