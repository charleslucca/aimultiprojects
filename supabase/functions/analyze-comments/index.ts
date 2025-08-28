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
    const { projectId, clientId } = await req.json();
    
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

    // Get unprocessed comments
    const { data: comments, error: commentsError } = await supabaseClient
      .from('project_insights_comments')
      .select('*')
      .eq('project_id', projectId)
      .eq('processed', false)
      .order('created_at', { ascending: true });

    if (commentsError) {
      throw new Error(`Error fetching comments: ${commentsError.message}`);
    }

    if (!comments || comments.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No new comments to process',
        processed: 0
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Process each comment
    const processedInsights = [];
    
    for (const comment of comments) {
      try {
        // Call OpenAI API to analyze the comment
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
                content: `Você é um consultor de projetos especializado em análise de insights manuais. Analise o comentário fornecido e:
                1. Identifique o tipo de insight (estratégico, operacional, risco, oportunidade, preocupação)
                2. Determine a criticidade (baixa, média, alta, crítica)
                3. Extraia pontos-chave e ações recomendadas
                4. Categorize por área (HR, Financeiro, SLA, Técnico, Comercial)
                
                Responda em JSON com:
                {
                  "insight_category": "HR_CRITICAL|FINANCIAL|SLA_RISK|TECHNICAL|COMMERCIAL|GENERAL",
                  "criticality_level": "low|medium|high|critical",
                  "confidence_score": 0.85,
                  "key_points": ["ponto 1", "ponto 2"],
                  "recommended_actions": ["ação 1", "ação 2"],
                  "summary": "Resumo do insight",
                  "impact_areas": ["área 1", "área 2"],
                  "urgency": "immediate|short_term|medium_term|long_term"
                }`
              },
              {
                role: 'user',
                content: `Analise este comentário:
                Origem: ${comment.insight_origin}
                Conteúdo: ${comment.content}`
              }
            ],
            max_tokens: 800,
            temperature: 0.3
          }),
        });

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.statusText}`);
        }

        const aiResponse = await response.json();
        const analysis = JSON.parse(aiResponse.choices[0].message.content);

        // Update comment with AI analysis
        await supabaseClient
          .from('project_insights_comments')
          .update({
            processed: true,
            ai_analysis: analysis
          })
          .eq('id', comment.id);

        // Create unified insight entry
        const unifiedInsight = {
          project_id: projectId,
          client_id: clientId,
          insight_type: 'external_' + comment.insight_origin.toLowerCase(),
          insight_category: analysis.insight_category,
          title: `Insight ${comment.insight_origin}: ${analysis.summary?.substring(0, 100)}...`,
          content: analysis.summary,
          confidence_score: analysis.confidence_score,
          criticality_score: analysis.criticality_level === 'critical' ? 0.9 : 
                           analysis.criticality_level === 'high' ? 0.7 :
                           analysis.criticality_level === 'medium' ? 0.5 : 0.3,
          source_type: 'manual_comment',
          source_origin: comment.insight_origin,
          source_id: comment.id,
          metadata: {
            key_points: analysis.key_points,
            recommended_actions: analysis.recommended_actions,
            impact_areas: analysis.impact_areas,
            urgency: analysis.urgency,
            original_comment: comment.content
          },
          created_by: comment.created_by
        };

        const { error: insertError } = await supabaseClient
          .from('unified_insights')
          .insert(unifiedInsight);

        if (insertError) {
          console.error('Error inserting unified insight:', insertError);
        } else {
          processedInsights.push(unifiedInsight);
        }

      } catch (error) {
        console.error(`Error processing comment ${comment.id}:`, error);
        // Mark as processed even if failed to avoid reprocessing
        await supabaseClient
          .from('project_insights_comments')
          .update({
            processed: true,
            ai_analysis: { error: error.message }
          })
          .eq('id', comment.id);
      }
    }

    console.log(`Processed ${processedInsights.length} comments successfully`);
    
    return new Response(JSON.stringify({ 
      success: true, 
      processed: processedInsights.length,
      insights: processedInsights.map(i => ({
        category: i.insight_category,
        criticality: i.criticality_score,
        title: i.title
      }))
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in analyze-comments function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});