import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JiraConfig {
  id: string;
  jira_url: string;
  api_token_encrypted: string;
  username: string;
  project_keys: string[];
}

interface JiraProject {
  id: string;
  key: string;
  name: string;
  description?: string;
  projectTypeKey: string;
  lead?: {
    displayName: string;
  };
}

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string;
    issuetype: { name: string };
    status: { name: string };
    priority?: { name: string };
    assignee?: { displayName: string };
    reporter?: { displayName: string };
    project: { key: string };
    customfield_10016?: number; // Story Points
    timeoriginalestimate?: number;
    timeestimate?: number;
    timespent?: number;
    created: string;
    updated: string;
    resolutiondate?: string;
    labels: string[];
    components: Array<{ name: string }>;
    fixVersions: Array<{ name: string }>;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Read the request body only once
    const requestBody = await req.json();
    const { action, config_id, jira_url, username, api_token } = requestBody;

    if (action === 'sync_all') {
      // Get all active Jira configurations
      const { data: configs, error: configError } = await supabaseClient
        .from('jira_configurations')
        .select('*')
        .eq('sync_enabled', true);

      if (configError) throw configError;

      const results = [];
      for (const config of configs) {
        const result = await syncJiraData(config, supabaseClient);
        results.push(result);
      }

      return new Response(JSON.stringify({ results }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'sync_config' && config_id) {
      const { data: config, error: configError } = await supabaseClient
        .from('jira_configurations')
        .select('*')
        .eq('id', config_id)
        .single();

      if (configError) throw configError;

      const result = await syncJiraData(config, supabaseClient);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (action === 'test_connection') {
      if (!jira_url || !username || !api_token) {
        return new Response(JSON.stringify({ 
          success: false, 
          message: 'Missing required fields: jira_url, username, api_token'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const result = await testJiraConnection(jira_url, username, api_token);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in jira-sync function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function testJiraConnection(jiraUrl: string, username: string, apiToken: string) {
  try {
    const response = await fetch(`${jiraUrl}/rest/api/3/myself`, {
      headers: {
        'Authorization': `Basic ${btoa(`${username}:${apiToken}`)}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Connection failed: ${response.status} ${response.statusText}`);
    }

    const user = await response.json();
    return { 
      success: true, 
      message: 'Connection successful',
      user: {
        accountId: user.accountId,
        displayName: user.displayName,
        emailAddress: user.emailAddress
      }
    };
  } catch (error) {
    return { 
      success: false, 
      message: error.message 
    };
  }
}

async function syncJiraData(config: JiraConfig, supabaseClient: any) {
  console.log(`Starting sync for config: ${config.id}`);
  
  try {
    const authHeader = `Basic ${btoa(`${config.username}:${config.api_token_encrypted}`)}`;
    
    // Sync projects
    const projectsResult = await syncProjects(config, authHeader, supabaseClient);
    
    // Determine which projects to sync issues for
    const projectKeysToSync = config.project_keys.length > 0 
      ? config.project_keys 
      : projectsResult.project_keys; // Use all found projects if no specific ones configured
    
    console.log(`Syncing issues for projects: ${projectKeysToSync.join(', ')}`);
    
    // Sync issues for each project
    const issuesResults = [];
    for (const projectKey of projectKeysToSync) {
      const issuesResult = await syncIssues(config, projectKey, authHeader, supabaseClient);
      issuesResults.push(issuesResult);
    }

    // Update last sync time
    await supabaseClient
      .from('jira_configurations')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('id', config.id);

    return {
      config_id: config.id,
      success: true,
      projects: projectsResult,
      issues: issuesResults,
      synced_at: new Date().toISOString()
    };

  } catch (error) {
    console.error(`Sync failed for config ${config.id}:`, error);
    return {
      config_id: config.id,
      success: false,
      error: error.message
    };
  }
}

async function syncProjects(config: JiraConfig, authHeader: string, supabaseClient: any) {
  const response = await fetch(`${config.jira_url}/rest/api/3/project`, {
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch projects: ${response.status}`);
  }

  const projects: JiraProject[] = await response.json();
  const filteredProjects = projects.filter(p => 
    config.project_keys.length === 0 || config.project_keys.includes(p.key)
  );

  const upsertPromises = filteredProjects.map(project => 
    supabaseClient
      .from('jira_projects')
      .upsert({
        jira_id: project.id,
        jira_key: project.key,
        name: project.name,
        description: project.description,
        project_type: project.projectTypeKey,
        lead_name: project.lead?.displayName,
        config_id: config.id,
        raw_data: project,
        synced_at: new Date().toISOString()
      }, { onConflict: 'jira_id,config_id' })
  );

  await Promise.all(upsertPromises);
  
  return {
    total_projects: filteredProjects.length,
    project_keys: filteredProjects.map(p => p.key)
  };
}

async function syncIssues(config: JiraConfig, projectKey: string, authHeader: string, supabaseClient: any) {
  console.log(`Starting sync for project: ${projectKey}`);
  let startAt = 0;
  const maxResults = 100;
  let totalIssues = 0;

  do {
    // Use quotes around project key in case it has special characters
    const jql = `project = "${projectKey}" ORDER BY updated DESC`;
    const url = `${config.jira_url}/rest/api/3/search?jql=${encodeURIComponent(jql)}&startAt=${startAt}&maxResults=${maxResults}&expand=names`;
    
    console.log(`Fetching issues from: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to fetch issues for ${projectKey}: ${response.status} - ${errorText}`);
      throw new Error(`Failed to fetch issues for ${projectKey}: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log(`Found ${data.issues?.length || 0} issues out of ${data.total || 0} total for project ${projectKey}`);
    
    const issues: JiraIssue[] = data.issues || [];

    if (issues.length === 0) {
      console.log(`No more issues found for project ${projectKey}`);
      break;
    }

    console.log(`Processing ${issues.length} issues for project ${projectKey}`);

    const upsertPromises = issues.map(issue => {
      console.log(`Processing issue: ${issue.key}`);
      return supabaseClient
        .from('jira_issues')
        .upsert({
          jira_id: issue.id,
          jira_key: issue.key,
          summary: issue.fields.summary,
          description: issue.fields.description || null,
          issue_type: issue.fields.issuetype?.name || 'Unknown',
          status: issue.fields.status?.name || 'Unknown',
          priority: issue.fields.priority?.name || null,
          assignee_name: issue.fields.assignee?.displayName || null,
          reporter_name: issue.fields.reporter?.displayName || null,
          project_key: issue.fields.project?.key || projectKey,
          config_id: config.id,
          story_points: issue.fields.customfield_10016 || null,
          original_estimate: issue.fields.timeoriginalestimate || null,
          remaining_estimate: issue.fields.timeestimate || null,
          time_spent: issue.fields.timespent || null,
          created_date: issue.fields.created || null,
          updated_date: issue.fields.updated || null,
          resolved_date: issue.fields.resolutiondate || null,
          labels: issue.fields.labels || [],
          components: issue.fields.components?.map(c => c.name) || [],
          fix_versions: issue.fields.fixVersions?.map(v => v.name) || [],
          raw_data: issue,
          synced_at: new Date().toISOString()
        }, { onConflict: 'jira_id,config_id' });
    });

    const results = await Promise.all(upsertPromises);
    console.log(`Upserted ${results.length} issues for project ${projectKey}`);
    
    totalIssues += issues.length;
    startAt += maxResults;

    // Break if we've processed all available issues  
    if (startAt >= (data.total || 0)) {
      console.log(`Reached end of issues for project ${projectKey}. Total processed: ${totalIssues}`);
      break;
    }

  } while (true);

  console.log(`Completed sync for project ${projectKey}. Total issues: ${totalIssues}`);
  return {
    project_key: projectKey,
    total_issues: totalIssues
  };
}