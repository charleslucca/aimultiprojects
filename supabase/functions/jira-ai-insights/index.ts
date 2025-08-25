import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { action, issue_ids, project_keys } = await req.json();

    if (action === 'generate_sla_risk_insights') {
      const insights = await generateSLARiskInsights(supabaseClient, openAIApiKey, issue_ids);
      return new Response(JSON.stringify({ insights }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'predict_sprint_completion') {
      const prediction = await predictSprintCompletion(supabaseClient, openAIApiKey, project_keys);
      return new Response(JSON.stringify({ prediction }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'analyze_team_performance') {
      const analysis = await analyzeTeamPerformance(supabaseClient, openAIApiKey, project_keys);
      return new Response(JSON.stringify({ analysis }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'suggest_priority_rebalancing') {
      const suggestions = await suggestPriorityRebalancing(supabaseClient, openAIApiKey, project_keys);
      return new Response(JSON.stringify({ suggestions }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'sentiment_analysis') {
      const sentiment = await performSentimentAnalysis(supabaseClient, openAIApiKey, issue_ids);
      return new Response(JSON.stringify({ sentiment }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in jira-ai-insights function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateSLARiskInsights(supabaseClient: any, openAIApiKey: string, issueIds?: string[]) {
  // Get issues that are at risk of SLA breach
  let query = supabaseClient
    .from('jira_issues')
    .select('*')
    .in('status', ['In Progress', 'To Do', 'Open']);

  if (issueIds && issueIds.length > 0) {
    query = query.in('id', issueIds);
  }

  const { data: issues, error } = await query;
  if (error) throw error;

  const insights = [];
  
  for (const issue of issues) {
    const prompt = `
    Analyze this Jira issue for SLA breach risk:
    
    Issue: ${issue.summary}
    Type: ${issue.issue_type}
    Priority: ${issue.priority}
    Status: ${issue.status}
    Created: ${issue.created_date}
    Updated: ${issue.updated_date}
    Story Points: ${issue.story_points}
    Time Spent: ${issue.time_spent} seconds
    Original Estimate: ${issue.original_estimate} seconds
    Remaining Estimate: ${issue.remaining_estimate} seconds
    
    Based on this information, provide:
    1. SLA risk score (0-1)
    2. Risk factors
    3. Recommended actions
    4. Estimated completion time
    
    Respond in JSON format with keys: risk_score, risk_factors, recommendations, estimated_completion_days
    `;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an expert project manager analyzing Jira issues for SLA risk. Always respond with valid JSON.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1000,
          temperature: 0.3,
        }),
      });

      const aiResponse = await response.json();
      const analysis = JSON.parse(aiResponse.choices[0].message.content);

      // Store insight in database
      await supabaseClient
        .from('jira_ai_insights')
        .insert({
          issue_id: issue.id,
          insight_type: 'sla_risk',
          confidence_score: analysis.risk_score,
          insight_data: analysis,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        });

      insights.push({
        issue_id: issue.id,
        issue_key: issue.jira_key,
        ...analysis
      });

    } catch (error) {
      console.error(`Failed to analyze issue ${issue.jira_key}:`, error);
    }
  }

  return insights;
}

async function predictSprintCompletion(supabaseClient: any, openAIApiKey: string, projectKeys: string[]) {
  // Get active sprints and their issues
  const { data: sprints, error: sprintError } = await supabaseClient
    .from('jira_sprints')
    .select('*')
    .eq('state', 'active')
    .in('project_key', projectKeys);

  if (sprintError) throw sprintError;

  const predictions = [];

  for (const sprint of sprints) {
    const { data: issues, error: issuesError } = await supabaseClient
      .from('jira_issues')
      .select('*')
      .eq('project_key', sprint.project_key);

    if (issuesError) continue;

    const totalStoryPoints = issues.reduce((sum: number, issue: any) => sum + (issue.story_points || 0), 0);
    const completedStoryPoints = issues
      .filter((issue: any) => issue.status === 'Done')
      .reduce((sum: number, issue: any) => sum + (issue.story_points || 0), 0);

    const prompt = `
    Analyze this sprint for completion prediction:
    
    Sprint: ${sprint.name}
    Goal: ${sprint.goal}
    Start Date: ${sprint.start_date}
    End Date: ${sprint.end_date}
    Total Story Points: ${totalStoryPoints}
    Completed Story Points: ${completedStoryPoints}
    Remaining Story Points: ${totalStoryPoints - completedStoryPoints}
    Total Issues: ${issues.length}
    Completed Issues: ${issues.filter((i: any) => i.status === 'Done').length}
    
    Issues breakdown:
    ${issues.map((issue: any) => `- ${issue.jira_key}: ${issue.status} (${issue.story_points || 0} SP)`).join('\n')}
    
    Provide sprint completion prediction with:
    1. Completion probability (0-1)
    2. Risk factors
    3. Recommendations for improvement
    4. Velocity insights
    
    Respond in JSON format with keys: completion_probability, risk_factors, recommendations, velocity_insights
    `;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an expert Scrum Master analyzing sprint data. Always respond with valid JSON.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 1500,
          temperature: 0.3,
        }),
      });

      const aiResponse = await response.json();
      const analysis = JSON.parse(aiResponse.choices[0].message.content);

      // Store insight in database
      await supabaseClient
        .from('jira_ai_insights')
        .insert({
          project_id: sprint.id,
          insight_type: 'sprint_prediction',
          confidence_score: analysis.completion_probability,
          insight_data: analysis,
          expires_at: sprint.end_date
        });

      predictions.push({
        sprint_id: sprint.id,
        sprint_name: sprint.name,
        project_key: sprint.project_key,
        ...analysis
      });

    } catch (error) {
      console.error(`Failed to analyze sprint ${sprint.name}:`, error);
    }
  }

  return predictions;
}

async function analyzeTeamPerformance(supabaseClient: any, openAIApiKey: string, projectKeys: string[]) {
  // Get team performance data
  const { data: issues, error } = await supabaseClient
    .from('jira_issues')
    .select('*')
    .in('project_key', projectKeys)
    .not('assignee_name', 'is', null);

  if (error) throw error;

  const teamStats = issues.reduce((stats: any, issue: any) => {
    const assignee = issue.assignee_name;
    if (!stats[assignee]) {
      stats[assignee] = {
        total_issues: 0,
        completed_issues: 0,
        story_points: 0,
        avg_time_to_complete: 0,
        issues: []
      };
    }
    
    stats[assignee].total_issues++;
    stats[assignee].story_points += issue.story_points || 0;
    stats[assignee].issues.push(issue);
    
    if (issue.status === 'Done') {
      stats[assignee].completed_issues++;
    }
    
    return stats;
  }, {});

  const prompt = `
  Analyze team performance data:
  
  ${Object.entries(teamStats).map(([name, stats]: [string, any]) => `
  Team Member: ${name}
  - Total Issues: ${stats.total_issues}
  - Completed Issues: ${stats.completed_issues}
  - Story Points: ${stats.story_points}
  - Completion Rate: ${((stats.completed_issues / stats.total_issues) * 100).toFixed(1)}%
  `).join('\n')}
  
  Provide team performance analysis with:
  1. Top performers and areas for recognition
  2. Team members who need support
  3. Workload balance recommendations
  4. Overall team health score (0-1)
  
  Respond in JSON format with keys: top_performers, needs_support, workload_recommendations, team_health_score
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert team lead analyzing performance data. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
        temperature: 0.3,
      }),
    });

    const aiResponse = await response.json();
    const analysis = JSON.parse(aiResponse.choices[0].message.content);

    return {
      team_stats: teamStats,
      ...analysis
    };

  } catch (error) {
    console.error('Failed to analyze team performance:', error);
    throw error;
  }
}

async function suggestPriorityRebalancing(supabaseClient: any, openAIApiKey: string, projectKeys: string[]) {
  const { data: issues, error } = await supabaseClient
    .from('jira_issues')
    .select('*')
    .in('project_key', projectKeys)
    .not('status', 'eq', 'Done');

  if (error) throw error;

  const prompt = `
  Analyze these open issues for priority rebalancing:
  
  ${issues.map((issue: any) => `
  ${issue.jira_key}: ${issue.summary}
  - Current Priority: ${issue.priority}
  - Status: ${issue.status}
  - Story Points: ${issue.story_points}
  - Created: ${issue.created_date}
  - Updated: ${issue.updated_date}
  - Assignee: ${issue.assignee_name}
  `).join('\n')}
  
  Suggest priority rebalancing with:
  1. Issues that should be higher priority
  2. Issues that should be lower priority
  3. Reasoning for each suggestion
  4. Overall priority distribution health
  
  Respond in JSON format with keys: increase_priority, decrease_priority, reasoning, priority_health_score
  `;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert product manager analyzing issue priorities. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    const aiResponse = await response.json();
    return JSON.parse(aiResponse.choices[0].message.content);

  } catch (error) {
    console.error('Failed to suggest priority rebalancing:', error);
    throw error;
  }
}

async function performSentimentAnalysis(supabaseClient: any, openAIApiKey: string, issueIds: string[]) {
  const { data: issues, error } = await supabaseClient
    .from('jira_issues')
    .select('*')
    .in('id', issueIds);

  if (error) throw error;

  const analyses = [];

  for (const issue of issues) {
    if (!issue.description) continue;

    const prompt = `
    Analyze the sentiment of this Jira issue:
    
    Title: ${issue.summary}
    Description: ${issue.description}
    
    Provide sentiment analysis with:
    1. Overall sentiment score (-1 to 1, where -1 is very negative, 0 is neutral, 1 is very positive)
    2. Key themes or concerns mentioned
    3. Urgency indicators
    4. Emotional tone
    
    Respond in JSON format with keys: sentiment_score, themes, urgency_level, emotional_tone
    `;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an expert in sentiment analysis. Always respond with valid JSON.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 800,
          temperature: 0.3,
        }),
      });

      const aiResponse = await response.json();
      const analysis = JSON.parse(aiResponse.choices[0].message.content);

      // Store insight in database
      await supabaseClient
        .from('jira_ai_insights')
        .insert({
          issue_id: issue.id,
          insight_type: 'sentiment',
          confidence_score: Math.abs(analysis.sentiment_score),
          insight_data: analysis,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });

      analyses.push({
        issue_id: issue.id,
        issue_key: issue.jira_key,
        ...analysis
      });

    } catch (error) {
      console.error(`Failed to analyze sentiment for ${issue.jira_key}:`, error);
    }
  }

  return analyses;
}