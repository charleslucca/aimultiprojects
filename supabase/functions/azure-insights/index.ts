import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, integration_id, project_id } = await req.json();
    console.log(`Starting Azure Insights action: ${action} for integration: ${integration_id}`);

    switch (action) {
      case 'generate_sprint_insights':
        return await generateSprintInsights(integration_id, project_id);
      case 'generate_team_performance':
        return await generateTeamPerformance(integration_id, project_id);
      case 'generate_burndown_prediction':
        return await generateBurndownPrediction(integration_id, project_id);
      case 'generate_quality_insights':
        return await generateQualityInsights(integration_id, project_id);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error('Error in azure-insights:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function generateSprintInsights(integration_id: string, project_id: string) {
  console.log('Generating Azure DevOps sprint insights...');

  // Get work items data
  const { data: workItems, error: workItemsError } = await supabase
    .from('azure_work_items')
    .select('*')
    .eq('integration_id', integration_id)
    .order('changed_date', { ascending: false })
    .limit(100);

  if (workItemsError) {
    throw new Error(`Failed to fetch work items: ${workItemsError.message}`);
  }

  // Get iterations data
  const { data: iterations, error: iterationsError } = await supabase
    .from('azure_iterations')
    .select('*')
    .eq('integration_id', integration_id);

  if (iterationsError) {
    throw new Error(`Failed to fetch iterations: ${iterationsError.message}`);
  }

  const analysisPrompt = `
Analise os dados do Azure DevOps e forneça insights sobre o sprint atual:

WORK ITEMS (${workItems?.length || 0} items):
${JSON.stringify(workItems?.slice(0, 20), null, 2)}

ITERATIONS/SPRINTS (${iterations?.length || 0} iterations):
${JSON.stringify(iterations, null, 2)}

Forneça um JSON com a seguinte estrutura:
{
  "sprint_completion_probability": number (0-1),
  "current_velocity": number,
  "predicted_completion_date": "YYYY-MM-DD",
  "blockers_identified": [
    {
      "type": string,
      "description": string,
      "severity": "low" | "medium" | "high",
      "affected_items": number
    }
  ],
  "recommendations": [
    {
      "action": string,
      "priority": "low" | "medium" | "high",
      "impact": string,
      "effort": string
    }
  ],
  "team_insights": {
    "workload_distribution": "balanced" | "unbalanced" | "overloaded",
    "collaboration_score": number (0-1),
    "bottlenecks": string[]
  },
  "executive_summary": string
}

Focoque em:
- Probabilidade de conclusão do sprint
- Identificação de bloqueadores
- Distribuição de carga de trabalho
- Recomendações acionáveis
`;

  const insights = await callOpenAI(analysisPrompt);
  
  // Save insights to unified_insights table
  const { error: insertError } = await supabase
    .from('unified_insights')
    .insert({
      project_id,
      integration_type: 'azure_boards',
      integration_id,
      insight_type: 'sprint_prediction',
      insight_data: insights,
      confidence_score: insights.sprint_completion_probability || 0.5,
      criticality_score: insights.blockers_identified?.length > 0 ? 0.8 : 0.3,
      executive_summary: insights.executive_summary,
      generated_at: new Date().toISOString()
    });

  if (insertError) {
    console.error('Error saving insights:', insertError);
  }

  return new Response(
    JSON.stringify({ success: true, insights }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function generateTeamPerformance(integration_id: string, project_id: string) {
  console.log('Generating Azure DevOps team performance insights...');

  const { data: workItems, error } = await supabase
    .from('azure_work_items')
    .select('*')
    .eq('integration_id', integration_id)
    .gte('changed_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
    .order('changed_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch work items: ${error.message}`);
  }

  const analysisPrompt = `
Analise a performance da equipe baseada nos work items do Azure DevOps dos últimos 30 dias:

WORK ITEMS (${workItems?.length || 0} items):
${JSON.stringify(workItems, null, 2)}

Forneça um JSON com insights de performance da equipe:
{
  "team_velocity": {
    "current_sprint": number,
    "previous_sprint": number,
    "trend": "increasing" | "decreasing" | "stable"
  },
  "individual_performance": [
    {
      "assignee": string,
      "completed_items": number,
      "story_points": number,
      "average_cycle_time": number,
      "quality_score": number (0-1)
    }
  ],
  "bottlenecks": [
    {
      "area": string,
      "description": string,
      "impact": "low" | "medium" | "high",
      "suggestions": string[]
    }
  ],
  "collaboration_metrics": {
    "cross_functional_work": number (0-1),
    "knowledge_sharing": number (0-1),
    "pair_programming": number (0-1)
  },
  "recommendations": [
    {
      "category": "process" | "people" | "tools",
      "recommendation": string,
      "expected_impact": string
    }
  ],
  "executive_summary": string
}

Analise:
- Velocidade da equipe
- Performance individual
- Identificação de gargalos
- Métricas de colaboração
- Recomendações de melhoria
`;

  const insights = await callOpenAI(analysisPrompt);
  
  // Save insights
  const { error: insertError } = await supabase
    .from('unified_insights')
    .insert({
      project_id,
      integration_type: 'azure_boards',
      integration_id,
      insight_type: 'team_performance',
      insight_data: insights,
      confidence_score: 0.8,
      criticality_score: insights.bottlenecks?.length > 0 ? 0.7 : 0.4,
      executive_summary: insights.executive_summary,
      generated_at: new Date().toISOString()
    });

  if (insertError) {
    console.error('Error saving insights:', insertError);
  }

  return new Response(
    JSON.stringify({ success: true, insights }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function generateBurndownPrediction(integration_id: string, project_id: string) {
  console.log('Generating Azure DevOps burndown prediction...');

  const { data: workItems, error } = await supabase
    .from('azure_work_items')
    .select('*')
    .eq('integration_id', integration_id)
    .order('changed_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch work items: ${error.message}`);
  }

  const { data: iterations, error: iterError } = await supabase
    .from('azure_iterations')
    .select('*')
    .eq('integration_id', integration_id)
    .gte('start_date', new Date().toISOString());

  if (iterError) {
    throw new Error(`Failed to fetch iterations: ${iterError.message}`);
  }

  const analysisPrompt = `
Analise os dados do Azure DevOps para prever o burndown e progresso:

WORK ITEMS (${workItems?.length || 0} items):
${JSON.stringify(workItems?.slice(0, 30), null, 2)}

FUTURE ITERATIONS:
${JSON.stringify(iterations, null, 2)}

Forneça predições de burndown em JSON:
{
  "burndown_prediction": {
    "remaining_story_points": number,
    "predicted_completion_date": "YYYY-MM-DD",
    "completion_probability": number (0-1),
    "velocity_trend": "increasing" | "decreasing" | "stable"
  },
  "milestone_risks": [
    {
      "milestone": string,
      "risk_level": "low" | "medium" | "high",
      "probability": number (0-1),
      "impact": string,
      "mitigation": string[]
    }
  ],
  "resource_allocation": {
    "current_capacity": number,
    "required_capacity": number,
    "capacity_gap": number,
    "recommendations": string[]
  },
  "scope_management": {
    "scope_creep_risk": number (0-1),
    "change_requests": number,
    "impact_on_timeline": string
  },
  "executive_summary": string
}

Focoque em:
- Predição precisa de burndown
- Identificação de riscos de milestone
- Análise de capacidade vs demanda
- Gestão de escopo
`;

  const insights = await callOpenAI(analysisPrompt);
  
  // Save insights
  const { error: insertError } = await supabase
    .from('unified_insights')
    .insert({
      project_id,
      integration_type: 'azure_boards',
      integration_id,
      insight_type: 'burndown_prediction',
      insight_data: insights,
      confidence_score: insights.burndown_prediction?.completion_probability || 0.5,
      criticality_score: insights.milestone_risks?.some((risk: any) => risk.risk_level === 'high') ? 0.9 : 0.5,
      executive_summary: insights.executive_summary,
      generated_at: new Date().toISOString()
    });

  if (insertError) {
    console.error('Error saving insights:', insertError);
  }

  return new Response(
    JSON.stringify({ success: true, insights }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function generateQualityInsights(integration_id: string, project_id: string) {
  console.log('Generating Azure DevOps quality insights...');

  const { data: workItems, error } = await supabase
    .from('azure_work_items')
    .select('*')
    .eq('integration_id', integration_id)
    .in('work_item_type', ['Bug', 'Issue', 'Impediment'])
    .order('created_date', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch work items: ${error.message}`);
  }

  const analysisPrompt = `
Analise a qualidade do projeto baseado nos bugs e issues do Azure DevOps:

BUGS E ISSUES (${workItems?.length || 0} items):
${JSON.stringify(workItems, null, 2)}

Forneça insights de qualidade em JSON:
{
  "quality_metrics": {
    "bug_density": number,
    "defect_escape_rate": number (0-1),
    "mean_time_to_resolution": number,
    "quality_trend": "improving" | "declining" | "stable"
  },
  "critical_areas": [
    {
      "area": string,
      "bug_count": number,
      "severity": "low" | "medium" | "high" | "critical",
      "trend": "increasing" | "decreasing" | "stable"
    }
  ],
  "root_cause_analysis": [
    {
      "category": string,
      "frequency": number,
      "impact": string,
      "prevention_strategies": string[]
    }
  ],
  "quality_recommendations": [
    {
      "action": string,
      "priority": "low" | "medium" | "high",
      "expected_outcome": string,
      "implementation_effort": string
    }
  ],
  "test_coverage_insights": {
    "estimated_coverage": number (0-1),
    "critical_gaps": string[],
    "recommendations": string[]
  },
  "executive_summary": string
}

Analise:
- Métricas de qualidade
- Áreas críticas com mais bugs
- Análise de causa raiz
- Recomendações de melhoria
- Insights sobre cobertura de testes
`;

  const insights = await callOpenAI(analysisPrompt);
  
  // Save insights
  const { error: insertError } = await supabase
    .from('unified_insights')
    .insert({
      project_id,
      integration_type: 'azure_boards',
      integration_id,
      insight_type: 'quality_analysis',
      insight_data: insights,
      confidence_score: 0.85,
      criticality_score: insights.critical_areas?.some((area: any) => area.severity === 'critical') ? 0.9 : 0.6,
      executive_summary: insights.executive_summary,
      generated_at: new Date().toISOString()
    });

  if (insertError) {
    console.error('Error saving insights:', insertError);
  }

  return new Response(
    JSON.stringify({ success: true, insights }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function callOpenAI(prompt: string) {
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  console.log('Making OpenAI API request...');
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Você é um especialista em análise de dados de projetos de software e Azure DevOps. Forneça sempre respostas em JSON válido com insights precisos e acionáveis.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 2000
    }),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`OpenAI API error: ${response.status} ${errorData}`);
  }

  const data = await response.json();
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('No content received from OpenAI');
  }

  try {
    return JSON.parse(content);
  } catch (parseError) {
    console.error('Failed to parse OpenAI response as JSON:', content);
    throw new Error('Invalid JSON response from AI analysis');
  }
}