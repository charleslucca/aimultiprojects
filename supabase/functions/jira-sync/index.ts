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
    
    // Sync issues for each project
    const issuesResults = [];
    for (const projectKey of config.project_keys) {
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
  let startAt = 0;
  const maxResults = 100;
  let totalIssues = 0;

  do {
    const jql = `project = ${projectKey} ORDER BY updated DESC`;
    const url = `${config.jira_url}/rest/api/3/search?jql=${encodeURIComponent(jql)}&startAt=${startAt}&maxResults=${maxResults}`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch issues for ${projectKey}: ${response.status}`);
    }

    const data = await response.json();
    const issues: JiraIssue[] = data.issues;

    if (issues.length === 0) break;

    const upsertPromises = issues.map(issue => 
      supabaseClient
        .from('jira_issues')
        .upsert({
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
          components: issue.fields.components.map(c => c.name),
          fix_versions: issue.fields.fixVersions.map(v => v.name),
          raw_data: issue,
          synced_at: new Date().toISOString()
        }, { onConflict: 'jira_id,config_id' })
    );

    await Promise.all(upsertPromises);
    
    totalIssues += issues.length;
    startAt += maxResults;

    if (startAt >= data.total) break;

  } while (true);

  return {
    project_key: projectKey,
    total_issues: totalIssues
  };
}