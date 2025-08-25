import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizationId } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Get organization projects data
    const { data: projects, error: projectsError } = await supabaseClient
      .from('projects')
      .select(`
        *,
        tasks(*),
        risks(*),
        project_members(*)
      `)
      .eq('organization_id', organizationId);

    if (projectsError) {
      throw new Error(`Error fetching projects: ${projectsError.message}`);
    }

    // Prepare organization context for AI analysis
    const orgContext = {
      total_projects: projects.length,
      active_projects: projects.filter(p => p.status === 'active').length,
      completed_projects: projects.filter(p => p.status === 'completed').length,
      total_budget: projects.reduce((sum, p) => sum + (p.budget || 0), 0),
      average_progress: projects.reduce((sum, p) => sum + (p.progress_percentage || 0), 0) / projects.length,
      projects_summary: projects.map(p => ({
        name: p.name,
        status: p.status,
        priority: p.priority,
        progress: p.progress_percentage,
        tasks_count: p.tasks?.length || 0,
        risks_count: p.risks?.length || 0,
        team_size: p.project_members?.length || 0
      }))
    };

    // Call OpenAI API for organizational insights
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
            content: `Você é um consultor de gestão de projetos. Analise os dados da organização e gere insights executivos sobre:
            1. Performance geral dos projetos
            2. Tendências identificadas
            3. Oportunidades de melhoria
            4. Recomendações estratégicas
            5. Alertas importantes
            6. Métricas-chave
            
            Responda em formato JSON estruturado com as seguintes chaves:
            - performance_score: número de 1-100
            - key_metrics: objeto com métricas principais
            - trends: array de objetos com {type, description, impact}
            - opportunities: array de strings
            - strategic_recommendations: array de strings
            - alerts: array de objetos com {type, message, priority}
            - executive_summary: string resumindo os principais pontos`
          },
          {
            role: 'user',
            content: `Analise esta organização: ${JSON.stringify(orgContext)}`
          }
        ],
        max_tokens: 1500,
        temperature: 0.2
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const aiResponse = await response.json();
    const insights = JSON.parse(aiResponse.choices[0].message.content);

    console.log('Organizational insights generated successfully');
    
    return new Response(JSON.stringify({ 
      success: true, 
      insights,
      generated_at: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in generate-insights function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});