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
    const { projectId, attachments, projectData } = await req.json();
    
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

    // Prepare project context for AI analysis
    const projectContext = {
      name: projectData.name,
      description: projectData.description,
      status: projectData.status,
      priority: projectData.priority,
      budget: projectData.budget,
      attachments: attachments?.map((att: any) => ({
        name: att.file_name,
        type: att.mime_type,
        size: att.file_size
      })) || []
    };

    // Call OpenAI API for project analysis
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
            content: `Você é um especialista em análise de projetos. Analise o projeto fornecido e gere insights úteis sobre:
            1. Riscos potenciais
            2. Recomendações de melhorias
            3. Estimativas de cronograma
            4. Sugestões de recursos
            5. Pontos de atenção
            
            Responda em formato JSON estruturado com as seguintes chaves:
            - risks: array de objetos com {title, description, level, probability, impact}
            - recommendations: array de strings
            - timeline_analysis: objeto com {estimated_duration, key_milestones}
            - resource_suggestions: array de strings
            - attention_points: array de strings
            - overall_score: número de 1-100
            - summary: string resumindo a análise`
          },
          {
            role: 'user',
            content: `Analise este projeto: ${JSON.stringify(projectContext)}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.3
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const aiResponse = await response.json();
    const analysis = JSON.parse(aiResponse.choices[0].message.content);

    // Update project with AI analysis
    const { error: updateError } = await supabaseClient
      .from('projects')
      .update({
        ai_analysis: analysis,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId);

    if (updateError) {
      console.error('Error updating project:', updateError);
      throw updateError;
    }

    // Insert risks into risks table
    if (analysis.risks && analysis.risks.length > 0) {
      const risksToInsert = analysis.risks.map((risk: any) => ({
        project_id: projectId,
        title: risk.title,
        description: risk.description,
        level: risk.level,
        probability: risk.probability,
        impact: risk.impact,
        identified_by: null, // AI-generated
        created_at: new Date().toISOString()
      }));

      const { error: risksError } = await supabaseClient
        .from('risks')
        .insert(risksToInsert);

      if (risksError) {
        console.error('Error inserting risks:', risksError);
      }
    }

    console.log('Project analysis completed successfully');
    
    return new Response(JSON.stringify({ 
      success: true, 
      analysis,
      message: 'Análise do projeto concluída com sucesso'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in analyze-project function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});