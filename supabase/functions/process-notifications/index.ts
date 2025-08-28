import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { insight_id, user_id } = await req.json();

    console.log('Processing notifications for insight:', insight_id);

    // Get insight details
    const { data: insight, error: insightError } = await supabase
      .from('unified_insights')
      .select('*')
      .eq('id', insight_id)
      .single();

    if (insightError || !insight) {
      throw new Error('Insight not found');
    }

    // Get user notification rules
    const { data: rules, error: rulesError } = await supabase
      .from('notification_rules')
      .select('*')
      .eq('user_id', user_id)
      .eq('is_active', true);

    if (rulesError) {
      console.error('Error fetching notification rules:', rulesError);
    }

    // Analyze insight criticality using AI
    const analysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are an AI that analyzes project insights and determines their criticality and notification requirements. Respond with JSON only.'
          },
          {
            role: 'user',
            content: `Analyze this insight and determine notification priority:
            
            Type: ${insight.insight_type}
            Content: ${insight.content}
            Confidence: ${insight.confidence_score}
            
            Return JSON with:
            {
              "priority": "low|medium|high|critical",
              "should_notify": boolean,
              "notification_message": "brief message",
              "alert_category": "info|warning|error|success",
              "expires_in_hours": number
            }`
          }
        ],
        max_tokens: 300,
        temperature: 0.3,
      }),
    });

    if (!analysisResponse.ok) {
      throw new Error(`OpenAI API error: ${analysisResponse.status}`);
    }

    const analysisData = await analysisResponse.json();
    let analysis;
    
    try {
      analysis = JSON.parse(analysisData.choices[0].message.content);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      analysis = {
        priority: 'medium',
        should_notify: true,
        notification_message: 'New insight available',
        alert_category: 'info',
        expires_in_hours: 24
      };
    }

    // Create notification if needed
    if (analysis.should_notify) {
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + analysis.expires_in_hours);

      const { data: alert, error: alertError } = await supabase
        .from('insight_alerts')
        .insert({
          insight_id: insight_id,
          alert_type: analysis.alert_category,
          alert_message: analysis.notification_message,
          target_users: [user_id],
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (alertError) {
        console.error('Error creating alert:', alertError);
        throw new Error('Failed to create notification');
      }

      console.log('Notification created:', alert.id);

      return new Response(JSON.stringify({
        success: true,
        notification_created: true,
        alert_id: alert.id,
        priority: analysis.priority,
        message: analysis.notification_message
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      success: true,
      notification_created: false,
      priority: analysis.priority
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in process-notifications:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});