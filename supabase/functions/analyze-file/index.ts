import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { attachmentId, projectId, fileName, fileType, filePath } = await req.json();

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey || !supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing required environment variables');
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`Starting analysis for file: ${fileName} (${attachmentId})`);

    // Get project intelligence profile for context
    const { data: projectProfile } = await supabase
      .from('project_intelligence_profiles')
      .select('*')
      .eq('project_id', projectId)
      .single();

    // Get project details
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    // Download file from storage for content analysis
    let fileContent = '';
    try {
      if (fileType.includes('text') || fileName.endsWith('.txt')) {
        const { data: fileData } = await supabase.storage
          .from('project-files')
          .download(filePath);
        
        if (fileData) {
          fileContent = await fileData.text();
        }
      }
    } catch (error) {
      console.warn('Could not extract file content:', error);
    }

    // Build context for AI analysis
    const analysisContext = {
      fileName,
      fileType,
      projectName: project?.name || 'Unknown Project',
      projectDescription: project?.description || '',
      methodology: projectProfile?.methodology || 'scrum',
      storyPointsToHours: projectProfile?.story_points_to_hours || 8,
      averageHourlyRate: projectProfile?.average_hourly_rate || 100,
      businessContext: projectProfile?.business_context || '',
      fileContent: fileContent.substring(0, 5000), // Limit content to avoid token limits
    };

    // Create custom prompt based on project profile
    const customPrompt = projectProfile?.custom_prompts?.analysis || `
      Você é um especialista em análise de projetos com foco em ${projectProfile?.methodology || 'metodologias ágeis'}.
      
      Contexto do Projeto:
      - Nome: ${analysisContext.projectName}
      - Metodologia: ${analysisContext.methodology}
      - 1 Story Point = ${analysisContext.storyPointsToHours} horas
      - Valor/hora médio: R$ ${analysisContext.averageHourlyRate}
      - Contexto de negócio: ${analysisContext.businessContext}
      
      Analise o arquivo fornecido e forneça insights específicos baseados no contexto do projeto.
    `;

    // Call OpenAI API for file analysis
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5-2025-08-07',
        messages: [
          {
            role: 'system',
            content: customPrompt
          },
          {
            role: 'user',
            content: `
              Analise este arquivo de projeto:
              
              Nome do arquivo: ${fileName}
              Tipo: ${fileType}
              
              ${fileContent ? `Conteúdo do arquivo:
              ${fileContent}` : 'Arquivo binário - analise baseado no nome e tipo.'}
              
              Forneça uma análise estruturada em JSON com:
              {
                "summary": "Resumo do arquivo",
                "insights": ["lista de insights específicos"],
                "risks": ["riscos identificados"],
                "recommendations": ["recomendações específicas"],
                "estimated_effort": "estimativa de esforço em story points",
                "estimated_cost": "estimativa de custo em R$",
                "scope_items": ["itens de escopo identificados"],
                "stakeholders": ["stakeholders identificados"],
                "requirements": ["requisitos identificados"],
                "priority": "high|medium|low"
              }
            `
          }
        ],
        max_completion_tokens: 1500,
      }),
    });

    const aiResult = await response.json();
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${JSON.stringify(aiResult)}`);
    }

    let analysis;
    try {
      analysis = JSON.parse(aiResult.choices[0].message.content);
    } catch (parseError) {
      // If JSON parsing fails, create a structured response from the text
      analysis = {
        summary: aiResult.choices[0].message.content.substring(0, 500),
        insights: ["Análise textual processada"],
        risks: ["Revisar manualmente o conteúdo"],
        recommendations: ["Validar análise com especialista"],
        estimated_effort: "N/A",
        estimated_cost: "N/A",
        scope_items: [],
        stakeholders: [],
        requirements: [],
        priority: "medium"
      };
    }

    // Update attachment with analysis results
    const { error: updateError } = await supabase
      .from('project_attachments')
      .update({
        analysis_status: 'completed',
        ai_insights: analysis,
        extracted_content: fileContent.substring(0, 1000), // Store first 1000 chars
        file_metadata: {
          analyzed_at: new Date().toISOString(),
          analysis_model: 'gpt-5-2025-08-07',
          project_context: analysisContext
        }
      })
      .eq('id', attachmentId);

    if (updateError) {
      throw updateError;
    }

    console.log(`Analysis completed for file: ${fileName}`);

    return new Response(JSON.stringify({ 
      success: true, 
      analysis,
      message: 'File analysis completed successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in analyze-file function:', error);
    
    // Try to update status to error if we have attachmentId
    try {
      const { attachmentId } = await req.json();
      if (attachmentId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL');
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        
        if (supabaseUrl && supabaseServiceKey) {
          const supabase = createClient(supabaseUrl, supabaseServiceKey);
          await supabase
            .from('project_attachments')
            .update({
              analysis_status: 'error',
              file_metadata: {
                error: error.message,
                error_at: new Date().toISOString()
              }
            })
            .eq('id', attachmentId);
        }
      }
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }

    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});