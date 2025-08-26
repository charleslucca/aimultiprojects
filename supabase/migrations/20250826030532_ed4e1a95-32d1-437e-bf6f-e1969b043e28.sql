-- Expand project_intelligence_profiles table for customizable prompts
ALTER TABLE project_intelligence_profiles 
ADD COLUMN IF NOT EXISTS prompt_templates jsonb DEFAULT '{
  "sla_risk": "Analyze this Jira issue for SLA breach risk. Focus on workload distribution, team member performance, and delivery risks. Provide JSON with: risk_score (0-1), risk_factors (array), recommendations (array), workload_analysis, team_impact.",
  "team_performance": "Analyze team performance focusing on burnout indicators, workload distribution, completion rates by member. Identify critical workload recommendations. Provide JSON with: performance_score, team_members (array with individual performance), workload_recommendations (array), critical_alerts (array).",
  "cost_analysis": "Analyze project costs focusing on budget overruns, undefined estimations, missing story points. Provide JSON with: cost_score, budget_issues (array), estimation_problems (array), financial_recommendations (array).",
  "sprint_prediction": "Predict sprint completion focusing on workflow bottlenecks, unassigned issues, excessive WIP. Provide JSON with: completion_probability, workflow_issues (array), sla_risks (array), recommendations (array)."
}'::jsonb;

-- Add alert categorization and scoring
ALTER TABLE jira_ai_insights 
ADD COLUMN IF NOT EXISTS alert_category text,
ADD COLUMN IF NOT EXISTS criticality_score numeric DEFAULT 0.5,
ADD COLUMN IF NOT EXISTS executive_summary text;