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
    const { report_type, date_range, project_ids, user_id } = await req.json();

    console.log('Generating executive report:', { report_type, date_range, project_ids });

    const startDate = new Date(date_range.start);
    const endDate = new Date(date_range.end);

    // Fetch relevant data based on report type
    let reportData = {};
    
    if (report_type === 'project_health' || report_type === 'comprehensive') {
      // Get projects data
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .in('id', project_ids || [])
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      if (!projectsError) {
        reportData.projects = projects;
      }

      // Get insights for these projects
      const { data: insights, error: insightsError } = await supabase
        .from('unified_insights')
        .select('*')
        .in('project_id', project_ids || [])
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false })
        .limit(100);

      if (!insightsError) {
        reportData.insights = insights;
      }
    }

    if (report_type === 'team_performance' || report_type === 'comprehensive') {
      // Get team members data
      const { data: teamMembers, error: teamError } = await supabase
        .from('team_members')
        .select('*')
        .in('project_id', project_ids || []);

      if (!teamError) {
        reportData.team_members = teamMembers;
      }
    }

    // Generate executive summary using AI
    const reportPrompt = `
    Generate an executive summary report for ${report_type} covering ${startDate.toDateString()} to ${endDate.toDateString()}.
    
    Data available:
    ${JSON.stringify(reportData, null, 2)}
    
    Create a comprehensive executive report with:
    1. Executive Summary (key highlights and concerns)
    2. Key Performance Indicators (KPIs)
    3. Critical Issues and Risks
    4. Recommendations and Action Items
    5. Trend Analysis
    6. Financial Impact Assessment
    
    Format as JSON with these sections:
    {
      "executive_summary": "string",
      "kpis": [{"metric": "string", "value": "string", "trend": "up|down|stable", "status": "good|warning|critical"}],
      "critical_issues": [{"title": "string", "description": "string", "severity": "low|medium|high|critical", "impact": "string"}],
      "recommendations": [{"title": "string", "description": "string", "priority": "low|medium|high", "timeline": "string"}],
      "trends": [{"category": "string", "trend": "string", "analysis": "string"}],
      "financial_impact": {"total_budget": "string", "spent": "string", "remaining": "string", "burn_rate": "string", "projection": "string"}
    }
    `;

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: 'You are an executive business analyst creating comprehensive reports. Always respond with valid JSON.'
          },
          {
            role: 'user',
            content: reportPrompt
          }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenAI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    let reportContent;
    
    try {
      reportContent = JSON.parse(aiData.choices[0].message.content);
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error('Failed to parse AI report content');
    }

    // Store the report
    const { data: report, error: reportError } = await supabase
      .from('executive_reports')
      .insert({
        report_type,
        date_range: { start: startDate.toISOString(), end: endDate.toISOString() },
        project_ids,
        generated_by: user_id,
        content: reportContent,
        metadata: {
          data_points: Object.keys(reportData).length,
          generation_time: new Date().toISOString(),
          ai_model: 'gpt-4o-mini'
        }
      })
      .select()
      .single();

    if (reportError) {
      console.error('Error storing report:', reportError);
      throw new Error('Failed to store executive report');
    }

    console.log('Executive report generated:', report.id);

    return new Response(JSON.stringify({
      success: true,
      report_id: report.id,
      report_content: reportContent,
      generated_at: report.created_at
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-executive-reports:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});