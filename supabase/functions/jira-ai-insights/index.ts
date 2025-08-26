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

  const startTime = Date.now();
  
  // Implement function timeout (25 seconds)
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Function timeout: Operation exceeded 25 seconds')), 25000)
  );

  const workPromise = async () => {
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openAIApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const { action, issue_ids, project_keys, config_id, project_id } = await req.json();
      
      console.log('Received request:', { action, issue_ids, project_keys, config_id, project_id, timestamp: new Date().toISOString() });

      // Map project_id to jira_project_id for database constraints
      const jiraProjectId = await getJiraProjectId(supabaseClient, project_id, config_id);
      console.log('Mapped project_id to jira_project_id:', { project_id, jiraProjectId });

    if (action === 'generate_sla_risk_insights') {
      const insights = await generateSLARiskInsights(supabaseClient, openAIApiKey, issue_ids, jiraProjectId);
      return new Response(JSON.stringify({ insights }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'predict_sprint_completion') {
      const prediction = await predictSprintCompletion(supabaseClient, openAIApiKey, project_keys, jiraProjectId);
      return new Response(JSON.stringify({ prediction }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'analyze_team_performance') {
      const analysis = await analyzeTeamPerformance(supabaseClient, openAIApiKey, project_keys, jiraProjectId);
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
      const sentiment = await performSentimentAnalysis(supabaseClient, openAIApiKey, issue_ids, jiraProjectId);
      return new Response(JSON.stringify({ sentiment }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'cost_analysis') {
      const analysis = await performCostAnalysis(supabaseClient, openAIApiKey, project_keys, config_id, jiraProjectId);
      return new Response(JSON.stringify({ analysis }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'productivity_economics') {
      const economics = await analyzeProductivityEconomics(supabaseClient, openAIApiKey, project_keys, config_id, jiraProjectId);
      return new Response(JSON.stringify({ economics }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'budget_alerts') {
      const alerts = await generateBudgetAlerts(supabaseClient, openAIApiKey, project_keys, config_id, jiraProjectId);
      return new Response(JSON.stringify({ alerts }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle project-specific insight generation
    if (action === 'generate_project_insights') {
      console.log('Generating project insights for project_id:', project_id, 'jira_project_id:', jiraProjectId);
      const results = await generateProjectInsights(supabaseClient, openAIApiKey, project_keys, config_id, jiraProjectId);
      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Error in jira-ai-insights function after ${duration}ms:`, error);
      return new Response(JSON.stringify({ 
        error: error.message,
        duration_ms: duration,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  };

  try {
    const result = await Promise.race([workPromise(), timeoutPromise]);
    const duration = Date.now() - startTime;
    console.log(`Function completed successfully in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`Function failed after ${duration}ms:`, error);
    return new Response(JSON.stringify({ 
      error: error.message,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Helper function to map project_id to jira_project_id
// Helper function to load custom prompts from project intelligence profiles
async function loadCustomPrompt(supabaseClient: any, jiraProjectId?: string, insightType?: string): Promise<string | null> {
  if (!jiraProjectId || !insightType) return null;

  try {
    const { data: profiles, error } = await supabaseClient
      .from('project_intelligence_profiles')
      .select('prompt_templates')
      .eq('project_id', jiraProjectId)
      .limit(1);

    if (error || !profiles || profiles.length === 0) {
      console.log('No custom prompts found, using defaults');
      return null;
    }

    const promptTemplates = profiles[0].prompt_templates;
    return promptTemplates?.[insightType] || null;
  } catch (error) {
    console.error('Error loading custom prompt:', error);
    return null;
  }
}

// Helper function to ensure field is an array
function ensureArray(field: any): string[] {
  if (!field) return [];
  if (Array.isArray(field)) return field.filter(Boolean);
  if (typeof field === 'object' && field !== null) {
    return Object.values(field).filter(Boolean) as string[];
  }
  if (typeof field === 'string') return [field];
  return [];
}

// Generate executive summary for team performance
function generateTeamPerformanceExecutiveSummary(teamMembers: any[], analysis: any): string {
  const criticalMembers = teamMembers.filter(m => m.completion_rate === 0);
  const lowPerformers = teamMembers.filter(m => m.performance_score < 0.3);
  
  if (criticalMembers.length > 0) {
    const memberNames = criticalMembers.map(m => m.name).join(', ');
    return `🔥 CRÍTICO: ${memberNames} com 0% de conclusão - Ação urgente necessária`;
  }
  
  if (lowPerformers.length > 0) {
    return `⚠️ ${lowPerformers.length} membro(s) com performance baixa requer(em) suporte`;
  }
  
  const avgCompletion = teamMembers.reduce((sum, m) => sum + m.completion_rate, 0) / teamMembers.length;
  return `Performance da equipe: ${Math.round(avgCompletion * 100)}% de conclusão média`;
}
  if (!projectId && !configId) {
    console.log('No project_id or config_id provided, returning null');
    return null;
  }

  try {
    // Try to find jira_project by config_id first
    if (configId) {
      const { data: jiraProjects, error } = await supabaseClient
        .from('jira_projects')
        .select('id')
        .eq('config_id', configId)
        .limit(1);

      if (!error && jiraProjects && jiraProjects.length > 0) {
        console.log('Found jira_project_id by config_id:', jiraProjects[0].id);
        return jiraProjects[0].id;
      }
    }

    // Fallback: try to get the first available jira_project
    const { data: firstProject, error: firstError } = await supabaseClient
      .from('jira_projects')
      .select('id')
      .limit(1);

    if (!firstError && firstProject && firstProject.length > 0) {
      console.log('Using first available jira_project_id as fallback:', firstProject[0].id);
      return firstProject[0].id;
    }

    console.log('No jira_project found, returning null');
    return null;
  } catch (error) {
    console.error('Error mapping project_id to jira_project_id:', error);
    return null;
  }
}

// Project-specific insight generation function
async function generateProjectInsights(supabaseClient: any, openAIApiKey: string, projectKeys: string[], configId?: string, jiraProjectId?: string) {
  console.log('Starting project insights generation for:', { projectKeys, configId, jiraProjectId });
  
  try {
    // Generate SLA risk insights
    await generateSLARiskInsights(supabaseClient, openAIApiKey, undefined, jiraProjectId);
    
    // Generate sprint predictions
    await predictSprintCompletion(supabaseClient, openAIApiKey, projectKeys, jiraProjectId);
    
    // Generate team performance analysis
    await analyzeTeamPerformance(supabaseClient, openAIApiKey, projectKeys, jiraProjectId);
    
    console.log('Project insights generation completed successfully');
    return { success: true };
  } catch (error) {
    console.error('Error in generateProjectInsights:', error);
    throw error;
  }
}

async function generateSLARiskInsights(supabaseClient: any, openAIApiKey: string, issueIds?: string[], jiraProjectId?: string) {
  console.log('Starting SLA risk analysis...');
  const startTime = Date.now();

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

  console.log(`Analyzing ${issues.length} issues for SLA risk`);
  const insights = [];
  
  // Process in batches for better performance (max 5 at a time)
  for (let i = 0; i < issues.length; i += 5) {
    const batch = issues.slice(i, i + 5);
    
    // Check timeout (20s max for this function)
    if (Date.now() - startTime > 20000) {
      console.log('SLA analysis timeout, processing partial results');
      break;
    }
    
    const batchPromises = batch.map(async (issue) => {
      const prompt = `
      Analyze this Jira issue for SLA breach risk:
      
      Issue: ${issue.summary}
      Type: ${issue.issue_type}
      Priority: ${issue.priority}
      Status: ${issue.status}
      Created: ${issue.created_date}
      Story Points: ${issue.story_points}
      
      Provide concise JSON with: risk_score (0-1), risk_factors (array), recommendations (array), estimated_completion_days
      `;

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout per issue

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: 'You are an expert project manager. Respond with valid JSON only.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 500, // Reduced for speed
            temperature: 0.3,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const aiResponse = await response.json();
        let content = aiResponse.choices[0].message.content;
        
        // Clean content
        if (content.includes('```json')) {
          content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
        }
        
        const analysis = JSON.parse(content);

        // Store insight in database
        if (jiraProjectId) {
          await supabaseClient
            .from('jira_ai_insights')
            .insert({
              issue_id: issue.id,
              project_id: jiraProjectId,
              insight_type: 'sla_risk',
              confidence_score: analysis.risk_score,
              insight_data: {
                ...analysis,
                recommendations: Array.isArray(analysis.recommendations) 
                  ? analysis.recommendations 
                  : [analysis.recommendations || "Revisar prioridade do issue"]
              },
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });
        } else {
          console.log('Skipping insight save - no jiraProjectId available');
        }

        return {
          issue_id: issue.id,
          issue_key: issue.jira_key,
          analysis
        };
      } catch (error) {
        console.error(`Error analyzing issue ${issue.jira_key}:`, error);
        // Create a fallback insight
        if (jiraProjectId) {
          await supabaseClient
            .from('jira_ai_insights')
            .insert({
              issue_id: issue.id,
              project_id: jiraProjectId,
              insight_type: 'sla_risk',
              confidence_score: 0.5,
              insight_data: {
                risk_score: 0.5,
                risk_factors: ['Análise automática indisponível'],
                recommendations: ['Revisar manualmente este issue'],
                estimated_completion_days: 3
              },
              expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            });
        }
        
        return null;
      }
    });

    const batchResults = await Promise.allSettled(batchPromises);
    insights.push(...batchResults.filter(r => r.status === 'fulfilled' && r.value).map(r => r.value));
  }

  const duration = Date.now() - startTime;
  console.log(`SLA risk analysis completed in ${duration}ms for ${insights.length} issues`);
  
  return insights;
}

async function predictSprintCompletion(supabaseClient: any, openAIApiKey: string, projectKeys: string[], jiraProjectId?: string) {
  console.log('Starting sprint prediction analysis...');
  const startTime = Date.now();

  // Get active sprints and their issues
  const { data: sprints, error: sprintError } = await supabaseClient
    .from('jira_sprints')
    .select('*')
    .eq('state', 'active')
    .in('project_key', projectKeys);

  if (sprintError) throw sprintError;

  console.log(`Analyzing ${sprints.length} active sprints`);
  const predictions = [];

  for (const sprint of sprints) {
    // Check timeout (15s max for this function)
    if (Date.now() - startTime > 15000) {
      console.log('Sprint prediction timeout, processing partial results');
      break;
    }

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
    Analyze sprint completion prediction:
    
    Sprint: ${sprint.name}
    Total Story Points: ${totalStoryPoints}
    Completed: ${completedStoryPoints}
    Remaining: ${totalStoryPoints - completedStoryPoints}
    Progress: ${totalStoryPoints > 0 ? ((completedStoryPoints / totalStoryPoints) * 100).toFixed(1) : 0}%
    
    Provide JSON with: completion_probability (0-1), risk_factors (array), recommendations (array), velocity_insights
    `;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout per sprint

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: 'You are an expert Scrum Master. Respond with valid JSON only.' },
            { role: 'user', content: prompt }
          ],
          max_tokens: 800, // Reduced for speed
          temperature: 0.3,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const aiResponse = await response.json();
      let content = aiResponse.choices[0].message.content;
      
      // Clean content
      if (content.includes('```json')) {
        content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
      }
      
      const analysis = JSON.parse(content);

      // Store insight in database
      if (jiraProjectId) {
        await supabaseClient
          .from('jira_ai_insights')
          .insert({
            project_id: jiraProjectId,
            insight_type: 'sprint_prediction',
            confidence_score: analysis.completion_probability,
            insight_data: { 
              ...analysis, 
              sprint_name: sprint.name,
              recommendations: Array.isArray(analysis.recommendations) 
                ? analysis.recommendations 
                : [analysis.recommendations || "Previsão de sprint calculada"]
            },
            expires_at: sprint.end_date
          });
      }

      predictions.push({
        sprint_id: sprint.id,
        sprint_name: sprint.name,
        project_key: sprint.project_key,
        ...analysis
      });

    } catch (error) {
      console.error(`Error analyzing sprint ${sprint.name}:`, error);
      // Create fallback prediction
      if (jiraProjectId) {
        await supabaseClient
          .from('jira_ai_insights')
          .insert({
            project_id: jiraProjectId,
            insight_type: 'sprint_prediction',
            confidence_score: 0.5,
            insight_data: {
              completion_probability: 0.5,
              risk_factors: ['Análise automática indisponível'],
              recommendations: ['Revisar progresso do sprint manualmente'],
              velocity_insights: 'Dados insuficientes para análise'
            },
            expires_at: sprint.end_date
          });
      }
    }
  }

  const duration = Date.now() - startTime;
  console.log(`Sprint prediction analysis completed in ${duration}ms for ${predictions.length} sprints`);

  return predictions;
}

async function analyzeTeamPerformance(supabaseClient: any, openAIApiKey: string, projectKeys: string[], jiraProjectId?: string) {
  // Get all available project keys if none specified in config
  const projectKeysToUse = projectKeys.length > 0 ? projectKeys : ['GM', 'TEC', 'LEARNJIRA'];
  
  const { data: issues, error: issuesError } = await supabaseClient
    .from('jira_issues')
    .select('*')
    .in('project_key', projectKeysToUse)
    .not('assignee_name', 'is', null);

  if (issuesError) throw issuesError;

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
    let content = aiResponse.choices[0].message.content;
    
    // Remove markdown formatting if present
    if (content.includes('```json')) {
      content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    }
    
    const analysis = JSON.parse(content);

    // Store insight in database
    if (jiraProjectId) {
      await supabaseClient
        .from('jira_ai_insights')
        .insert({
          project_id: jiraProjectId,
          insight_type: 'team_performance',
          confidence_score: analysis.team_health_score || 0.8,
          insight_data: { 
            ...analysis, 
            team_stats: teamStats,
            recommendations: Array.isArray(analysis.workload_recommendations) 
              ? analysis.workload_recommendations 
              : [analysis.workload_recommendations || "Análise de performance da equipe concluída"]
          },
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });
    }

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
  // Get all available project keys if none specified
  const projectKeysToUse = projectKeys.length > 0 ? projectKeys : ['GM', 'TEC', 'LEARNJIRA'];
  
  const { data: issues, error } = await supabaseClient
    .from('jira_issues')
    .select('*')
    .in('project_key', projectKeysToUse)
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
    let content = aiResponse.choices[0].message.content;
    
    // Remove markdown formatting if present
    if (content.includes('```json')) {
      content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    }
    
    return JSON.parse(content);

  } catch (error) {
    console.error('Failed to suggest priority rebalancing:', error);
    throw error;
  }
}

async function performSentimentAnalysis(supabaseClient: any, openAIApiKey: string, issueIds: string[], jiraProjectId?: string) {
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
      let content = aiResponse.choices[0].message.content;
      
      // Remove markdown formatting if present
      if (content.includes('```json')) {
        content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
      }
      
      const analysis = JSON.parse(content);

      // Store insight in database
      if (jiraProjectId) {
        await supabaseClient
          .from('jira_ai_insights')
          .insert({
            issue_id: issue.id,
            project_id: jiraProjectId,
            insight_type: 'sentiment',
            confidence_score: Math.abs(analysis.sentiment_score),
            insight_data: analysis,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
          });
      }

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

async function performCostAnalysis(supabaseClient: any, openAIApiKey: string, projectKeys: string[], configId?: string, jiraProjectId?: string) {
  // Get all available project keys if none specified
  const projectKeysToUse = projectKeys.length > 0 ? projectKeys : ['GM', 'TEC', 'LEARNJIRA'];
  
  // Get issues and user participation data
  const { data: issues, error: issuesError } = await supabaseClient
    .from('jira_issues')
    .select('*')
    .in('project_key', projectKeysToUse);

  if (issuesError) throw issuesError;

  const { data: participations, error: participationsError } = await supabaseClient
    .from('user_project_participations')
    .select('*')
    .in('jira_project_key', projectKeysToUse)
    .eq('is_active', true);

  if (participationsError) throw participationsError;

  // Calculate costs
  const costData = issues.map((issue: any) => {
    const assigneeParticipation = participations.find((p: any) => 
      p.jira_project_key === issue.project_key && 
      // For now, match by project. In future, could match by assignee name
      p.jira_project_key === issue.project_key
    );

    let estimatedCost = 0;
    if (assigneeParticipation && issue.story_points) {
      // Estimate 8 hours per story point by default
      const estimatedHours = issue.story_points * 8;
      
      if (assigneeParticipation.hourly_rate) {
        estimatedCost = estimatedHours * assigneeParticipation.hourly_rate;
      } else if (assigneeParticipation.monthly_salary) {
        // Assume 160 working hours per month
        const hourlyRate = assigneeParticipation.monthly_salary / 160;
        estimatedCost = estimatedHours * hourlyRate;
      }
      
      // Adjust by allocation percentage
      estimatedCost = estimatedCost * (assigneeParticipation.allocation_percentage / 100);
    }

    return {
      ...issue,
      estimated_cost: estimatedCost,
      participation: assigneeParticipation
    };
  });

  const totalProjectCost = costData.reduce((sum, issue) => sum + issue.estimated_cost, 0);
  const completedIssueCost = costData
    .filter(issue => issue.status === 'Done')
    .reduce((sum, issue) => sum + issue.estimated_cost, 0);

  const prompt = `
  Analyze project cost data:
  
  Project Keys: ${projectKeysToUse.join(', ')}
  Total Issues: ${issues.length}
  Completed Issues: ${issues.filter((i: any) => i.status === 'Done').length}
  Total Estimated Cost: R$ ${totalProjectCost.toFixed(2)}
  Completed Work Cost: R$ ${completedIssueCost.toFixed(2)}
  Cost Completion Rate: ${totalProjectCost > 0 ? ((completedIssueCost / totalProjectCost) * 100).toFixed(1) : 0}%
  
  Top 5 most expensive issues:
  ${costData
    .sort((a, b) => b.estimated_cost - a.estimated_cost)
    .slice(0, 5)
    .map(issue => `- ${issue.jira_key}: R$ ${issue.estimated_cost.toFixed(2)} (${issue.story_points || 0} SP)`)
    .join('\n')}
  
  Provide cost analysis with:
  1. Cost efficiency assessment
  2. Budget recommendations
  3. Most cost-effective completed issues
  4. Areas for cost optimization
  5. ROI insights
  
  Respond in JSON format with keys: cost_efficiency_score, budget_recommendations, cost_effective_issues, optimization_areas, roi_insights
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
          { role: 'system', content: 'You are an expert financial analyst specializing in software project economics. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    const aiResponse = await response.json();
    let content = aiResponse.choices[0].message.content;
    
    // Remove markdown formatting if present
    if (content.includes('```json')) {
      content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    }
    
    const analysis = JSON.parse(content);

    // Store insight in database
    if (jiraProjectId) {
      await supabaseClient
        .from('jira_ai_insights')
        .insert({
          project_id: jiraProjectId,
          insight_type: 'cost_analysis',
          confidence_score: analysis.cost_efficiency_score || 0.8,
          insight_data: {
            ...analysis,
            total_cost: totalProjectCost,
            completed_cost: completedIssueCost,
            cost_completion_rate: totalProjectCost > 0 ? (completedIssueCost / totalProjectCost) : 0,
            recommendations: Array.isArray(analysis.budget_recommendations) 
              ? analysis.budget_recommendations 
              : [analysis.budget_recommendations || "Análise de custos concluída"]
          },
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });
    }

    return {
      total_cost: totalProjectCost,
      completed_cost: completedIssueCost,
      issues_with_costs: costData,
      ...analysis
    };

  } catch (error) {
    console.error('Failed to perform cost analysis:', error);
    throw error;
  }
}

async function analyzeProductivityEconomics(supabaseClient: any, openAIApiKey: string, projectKeys: string[], configId?: string, jiraProjectId?: string) {
  // Get all available project keys if none specified
  const projectKeysToUse = projectKeys.length > 0 ? projectKeys : ['GM', 'TEC', 'LEARNJIRA'];
  
  // Get team performance and cost data
  const { data: issues, error: issuesError } = await supabaseClient
    .from('jira_issues')
    .select('*')
    .in('project_key', projectKeysToUse)
    .not('assignee_name', 'is', null);

  if (issuesError) throw issuesError;

  const { data: participations, error: participationsError } = await supabaseClient
    .from('user_project_participations')
    .select('*')
    .in('jira_project_key', projectKeysToUse)
    .eq('is_active', true);

  if (participationsError) throw participationsError;

  // Calculate productivity metrics per person
  const productivityData = issues.reduce((data: any, issue: any) => {
    const assignee = issue.assignee_name;
    if (!data[assignee]) {
      data[assignee] = {
        total_issues: 0,
        completed_issues: 0,
        story_points: 0,
        estimated_cost: 0,
        participation: null
      };
    }

    const participation = participations.find((p: any) => p.jira_project_key === issue.project_key);
    if (participation) {
      data[assignee].participation = participation;
      
      // Calculate cost for this issue
      if (issue.story_points && participation.hourly_rate) {
        const estimatedHours = issue.story_points * 8;
        const cost = estimatedHours * participation.hourly_rate * (participation.allocation_percentage / 100);
        data[assignee].estimated_cost += cost;
      }
    }

    data[assignee].total_issues++;
    data[assignee].story_points += issue.story_points || 0;
    
    if (issue.status === 'Done') {
      data[assignee].completed_issues++;
    }

    return data;
  }, {});

  const prompt = `
  Analyze team productivity economics:
  
  ${Object.entries(productivityData).map(([name, data]: [string, any]) => `
  Team Member: ${name}
  - Total Issues: ${data.total_issues}
  - Completed Issues: ${data.completed_issues}
  - Story Points: ${data.story_points}
  - Estimated Cost: R$ ${data.estimated_cost.toFixed(2)}
  - Completion Rate: ${((data.completed_issues / data.total_issues) * 100).toFixed(1)}%
  - Cost per Story Point: R$ ${data.story_points > 0 ? (data.estimated_cost / data.story_points).toFixed(2) : '0.00'}
  - Productivity Score: ${data.story_points > 0 ? (data.completed_issues / data.estimated_cost * 1000).toFixed(2) : '0.00'}
  `).join('\n')}
  
  Provide productivity economics analysis with:
  1. Most cost-effective team members
  2. Productivity improvement recommendations
  3. Resource allocation suggestions
  4. Value-for-money insights
  5. Overall team productivity score (0-1)
  
  Respond in JSON format with keys: cost_effective_members, productivity_recommendations, resource_allocation, value_insights, team_productivity_score
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
          { role: 'system', content: 'You are an expert in productivity economics and team optimization. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    const aiResponse = await response.json();
    let content = aiResponse.choices[0].message.content;
    
    // Remove markdown formatting if present
    if (content.includes('```json')) {
      content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    }
    
    const analysis = JSON.parse(content);

    // Store insight in database
    if (jiraProjectId) {
      await supabaseClient
        .from('jira_ai_insights')
        .insert({
          project_id: jiraProjectId,
          insight_type: 'productivity_economics',
          confidence_score: analysis.team_productivity_score || 0.8,
          insight_data: {
            ...analysis,
            productivity_data: productivityData
          },
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
        });
    }

    return {
      productivity_data: productivityData,
      ...analysis
    };

  } catch (error) {
    console.error('Failed to analyze productivity economics:', error);
    throw error;
  }
}

async function generateBudgetAlerts(supabaseClient: any, openAIApiKey: string, projectKeys: string[], configId?: string, jiraProjectId?: string) {
  // Get all available project keys if none specified
  const projectKeysToUse = projectKeys.length > 0 ? projectKeys : ['GM', 'TEC', 'LEARNJIRA'];
  
  // Get current spend and projections
  const { data: issues, error: issuesError } = await supabaseClient
    .from('jira_issues')
    .select('*')
    .in('project_key', projectKeysToUse);

  if (issuesError) throw issuesError;

  const { data: participations, error: participationsError } = await supabaseClient
    .from('user_project_participations')
    .select('*')
    .in('jira_project_key', projectKeysToUse)
    .eq('is_active', true);

  if (participationsError) throw participationsError;

  // Calculate budget data
  let totalBudgetSpent = 0;
  let projectedTotalCost = 0;
  
  issues.forEach((issue: any) => {
    const participation = participations.find((p: any) => p.jira_project_key === issue.project_key);
    if (participation && issue.story_points) {
      const estimatedHours = issue.story_points * 8;
      let issueCost = 0;
      
      if (participation.hourly_rate) {
        issueCost = estimatedHours * participation.hourly_rate;
      } else if (participation.monthly_salary) {
        const hourlyRate = participation.monthly_salary / 160;
        issueCost = estimatedHours * hourlyRate;
      }
      
      issueCost = issueCost * (participation.allocation_percentage / 100);
      projectedTotalCost += issueCost;
      
      if (issue.status === 'Done') {
        totalBudgetSpent += issueCost;
      }
    }
  });

  const completionRate = issues.length > 0 ? (issues.filter((i: any) => i.status === 'Done').length / issues.length) : 0;
  const spendRate = projectedTotalCost > 0 ? (totalBudgetSpent / projectedTotalCost) : 0;

  const prompt = `
  Analyze budget status and generate alerts:
  
  Project Keys: ${projectKeysToUse.join(', ')}
  Total Projected Cost: R$ ${projectedTotalCost.toFixed(2)}
  Current Spend: R$ ${totalBudgetSpent.toFixed(2)}
  Budget Used: ${(spendRate * 100).toFixed(1)}%
  Work Completed: ${(completionRate * 100).toFixed(1)}%
  Burn Rate vs Completion: ${completionRate > 0 ? (spendRate / completionRate).toFixed(2) : 'N/A'}
  
  Active Team Members: ${participations.length}
  Monthly Team Cost: R$ ${participations.reduce((sum: number, p: any) => sum + (p.monthly_salary || 0), 0).toFixed(2)}
  
  Generate budget alerts and recommendations:
  1. Critical budget warnings (if any)
  2. Spending trend analysis
  3. Budget optimization suggestions
  4. Resource reallocation recommendations
  5. Financial risk assessment (0-1 scale)
  
  Respond in JSON format with keys: critical_warnings, spending_trends, optimization_suggestions, reallocation_recommendations, financial_risk_score
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
          { role: 'system', content: 'You are an expert financial controller specializing in project budget management. Always respond with valid JSON.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    const aiResponse = await response.json();
    let content = aiResponse.choices[0].message.content;
    
    // Remove markdown formatting if present
    if (content.includes('```json')) {
      content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    }
    
    const analysis = JSON.parse(content);

    // Store insight in database
    if (jiraProjectId) {
      await supabaseClient
        .from('jira_ai_insights')
        .insert({
          project_id: jiraProjectId,
          insight_type: 'budget_alerts',
          confidence_score: analysis.financial_risk_score || 0.5,
          insight_data: {
            ...analysis,
            projected_total_cost: projectedTotalCost,
            current_spend: totalBudgetSpent,
            spend_rate: spendRate,
            completion_rate: completionRate,
            recommendations: Array.isArray(analysis.optimization_suggestions) 
              ? analysis.optimization_suggestions 
              : [analysis.optimization_suggestions || "Monitorar orçamento e gastos do projeto"]
          },
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        });
    }

    return {
      projected_total_cost: projectedTotalCost,
      current_spend: totalBudgetSpent,
      spend_rate: spendRate,
      completion_rate: completionRate,
      ...analysis
    };

  } catch (error) {
    console.error('Failed to generate budget alerts:', error);
    throw error;
  }
}