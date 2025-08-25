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

    const payload = await req.json();
    console.log('Received Jira webhook:', JSON.stringify(payload, null, 2));

    // Extract webhook event information
    const webhookEvent = payload.webhookEvent;
    const issue = payload.issue;
    const user = payload.user;
    const changelog = payload.changelog;

    if (!webhookEvent || !issue) {
      return new Response(JSON.stringify({ error: 'Invalid webhook payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Find the matching Jira configuration
    const { data: configs, error: configError } = await supabaseClient
      .from('jira_configurations')
      .select('*')
      .eq('sync_enabled', true);

    if (configError) throw configError;

    // Find config that matches this issue's project
    const matchingConfig = configs.find((config: any) => 
      config.project_keys.includes(issue.fields.project.key)
    );

    if (!matchingConfig) {
      console.log(`No matching config found for project: ${issue.fields.project.key}`);
      return new Response(JSON.stringify({ message: 'No matching configuration' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log the webhook event
    await supabaseClient
      .from('jira_webhook_logs')
      .insert({
        config_id: matchingConfig.id,
        webhook_event: webhookEvent,
        issue_key: issue.key,
        payload: payload,
        processed: false
      });

    // Process the webhook based on event type
    let processingResult;
    
    switch (webhookEvent) {
      case 'jira:issue_created':
        processingResult = await handleIssueCreated(issue, matchingConfig, supabaseClient);
        break;
      case 'jira:issue_updated':
        processingResult = await handleIssueUpdated(issue, changelog, matchingConfig, supabaseClient);
        break;
      case 'jira:issue_deleted':
        processingResult = await handleIssueDeleted(issue, matchingConfig, supabaseClient);
        break;
      case 'sprint_started':
      case 'sprint_closed':
        processingResult = await handleSprintEvent(payload, matchingConfig, supabaseClient);
        break;
      default:
        processingResult = { message: `Unhandled event type: ${webhookEvent}` };
    }

    // Mark webhook as processed
    await supabaseClient
      .from('jira_webhook_logs')
      .update({ 
        processed: true, 
        processed_at: new Date().toISOString() 
      })
      .eq('config_id', matchingConfig.id)
      .eq('issue_key', issue.key)
      .order('created_at', { ascending: false })
      .limit(1);

    // Trigger AI insights regeneration for updated issues
    if (['jira:issue_created', 'jira:issue_updated'].includes(webhookEvent)) {
      try {
        await supabaseClient.functions.invoke('jira-ai-insights', {
          body: { 
            action: 'generate_sla_risk_insights', 
            issue_ids: [issue.id] 
          }
        });
      } catch (aiError) {
        console.error('Failed to trigger AI insights:', aiError);
      }
    }

    return new Response(JSON.stringify({ 
      message: 'Webhook processed successfully',
      result: processingResult 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error processing Jira webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function handleIssueCreated(issue: any, config: any, supabaseClient: any) {
  console.log(`Processing issue created: ${issue.key}`);

  const issueData = {
    jira_id: issue.id,
    jira_key: issue.key,
    summary: issue.fields.summary,
    description: issue.fields.description,
    issue_type: issue.fields.issuetype.name,
    status: issue.fields.status.name,
    priority: issue.fields.priority?.name,
    assignee_name: issue.fields.assignee?.displayName,
    reporter_name: issue.fields.reporter?.displayName,
    project_key: issue.fields.project.key,
    config_id: config.id,
    story_points: issue.fields.customfield_10016,
    original_estimate: issue.fields.timeoriginalestimate,
    remaining_estimate: issue.fields.timeestimate,
    time_spent: issue.fields.timespent,
    created_date: issue.fields.created,
    updated_date: issue.fields.updated,
    resolved_date: issue.fields.resolutiondate,
    labels: issue.fields.labels,
    components: issue.fields.components?.map((c: any) => c.name) || [],
    fix_versions: issue.fields.fixVersions?.map((v: any) => v.name) || [],
    raw_data: issue,
    synced_at: new Date().toISOString()
  };

  const { error } = await supabaseClient
    .from('jira_issues')
    .insert(issueData);

  if (error && error.code !== '23505') { // Ignore duplicate key errors
    throw error;
  }

  return { message: `Issue ${issue.key} created successfully` };
}

async function handleIssueUpdated(issue: any, changelog: any, config: any, supabaseClient: any) {
  console.log(`Processing issue updated: ${issue.key}`);

  const updateData = {
    summary: issue.fields.summary,
    description: issue.fields.description,
    issue_type: issue.fields.issuetype.name,
    status: issue.fields.status.name,
    priority: issue.fields.priority?.name,
    assignee_name: issue.fields.assignee?.displayName,
    reporter_name: issue.fields.reporter?.displayName,
    story_points: issue.fields.customfield_10016,
    original_estimate: issue.fields.timeoriginalestimate,
    remaining_estimate: issue.fields.timeestimate,
    time_spent: issue.fields.timespent,
    updated_date: issue.fields.updated,
    resolved_date: issue.fields.resolutiondate,
    labels: issue.fields.labels,
    components: issue.fields.components?.map((c: any) => c.name) || [],
    fix_versions: issue.fields.fixVersions?.map((v: any) => v.name) || [],
    raw_data: issue,
    synced_at: new Date().toISOString()
  };

  const { error } = await supabaseClient
    .from('jira_issues')
    .update(updateData)
    .eq('jira_id', issue.id)
    .eq('config_id', config.id);

  if (error) throw error;

  // If this was a status change to Done, trigger sprint analysis
  if (changelog?.items?.some((item: any) => 
    item.field === 'status' && item.toString === 'Done'
  )) {
    try {
      await supabaseClient.functions.invoke('jira-ai-insights', {
        body: { 
          action: 'predict_sprint_completion', 
          project_keys: [issue.fields.project.key] 
        }
      });
    } catch (error) {
      console.error('Failed to trigger sprint analysis:', error);
    }
  }

  return { message: `Issue ${issue.key} updated successfully` };
}

async function handleIssueDeleted(issue: any, config: any, supabaseClient: any) {
  console.log(`Processing issue deleted: ${issue.key}`);

  // Delete associated AI insights first
  await supabaseClient
    .from('jira_ai_insights')
    .delete()
    .eq('issue_id', issue.id);

  // Delete the issue
  const { error } = await supabaseClient
    .from('jira_issues')
    .delete()
    .eq('jira_id', issue.id)
    .eq('config_id', config.id);

  if (error) throw error;

  return { message: `Issue ${issue.key} deleted successfully` };
}

async function handleSprintEvent(payload: any, config: any, supabaseClient: any) {
  const sprint = payload.sprint;
  if (!sprint) return { message: 'No sprint data in payload' };

  console.log(`Processing sprint event: ${payload.webhookEvent} for ${sprint.name}`);

  const sprintData = {
    jira_id: sprint.id.toString(),
    name: sprint.name,
    state: sprint.state,
    board_id: sprint.originBoardId?.toString(),
    project_key: sprint.goal ? extractProjectKeyFromGoal(sprint.goal) : null,
    config_id: config.id,
    start_date: sprint.startDate,
    end_date: sprint.endDate,
    complete_date: sprint.completeDate,
    goal: sprint.goal,
    raw_data: payload,
    synced_at: new Date().toISOString()
  };

  const { error } = await supabaseClient
    .from('jira_sprints')
    .upsert(sprintData, { onConflict: 'jira_id,config_id' });

  if (error) throw error;

  // Trigger sprint completion prediction if sprint started or closed
  if (['sprint_started', 'sprint_closed'].includes(payload.webhookEvent)) {
    try {
      await supabaseClient.functions.invoke('jira-ai-insights', {
        body: { 
          action: 'predict_sprint_completion', 
          project_keys: config.project_keys 
        }
      });
    } catch (error) {
      console.error('Failed to trigger sprint prediction:', error);
    }
  }

  return { message: `Sprint ${sprint.name} event processed successfully` };
}

function extractProjectKeyFromGoal(goal: string): string | null {
  // Simple heuristic to extract project key from sprint goal
  const match = goal.match(/([A-Z]+-\d+)/);
  if (match) {
    return match[1].split('-')[0];
  }
  return null;
}