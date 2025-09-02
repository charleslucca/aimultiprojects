import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface AzureDevOpsConfig {
  organization: string;
  project?: string;
  project_name?: string;
  personal_access_token?: string;
  personalAccessToken?: string;
  area_paths?: string[];
  areaPaths?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, integration_id, config } = await req.json();
    console.log(`Starting Azure Boards sync action: ${action} for integration: ${integration_id}`);

    switch (action) {
      case 'sync_integration':
        return await syncIntegration(integration_id, config);
      case 'test_connection':
        return await testConnection(config);
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error: any) {
    console.error('Error in azure-boards-sync:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function testConnection(config: AzureDevOpsConfig) {
  console.log('Testing Azure DevOps connection...');
  
  if (!config) {
    throw new Error('Configuration is required');
  }
  
  const { organization } = config;
  const personalAccessToken = config.personal_access_token || config.personalAccessToken;
  
  if (!organization || !personalAccessToken) {
    throw new Error('Organization and personal access token are required');
  }
  
  const url = `https://dev.azure.com/${organization}/_apis/projects?api-version=7.0`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Basic ${btoa(':' + personalAccessToken)}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Azure DevOps connection failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`Connection successful. Found ${data.count} projects.`);

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Connection successful. Found ${data.count} projects.`,
      projects: data.value?.slice(0, 5) // Return first 5 projects as sample
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function syncIntegration(integration_id: string, config?: AzureDevOpsConfig) {
  console.log(`Syncing Azure DevOps integration: ${integration_id}`);
  
  // Get integration details to get configuration if not provided
  const { data: integration, error: integrationError } = await supabase
    .from('project_integrations')
    .select('*')
    .eq('id', integration_id)
    .single();

  if (integrationError) {
    throw new Error(`Failed to get integration: ${integrationError.message}`);
  }

  // Use provided config or get from integration
  const finalConfig = config || integration.configuration;
  if (!finalConfig) {
    throw new Error('No configuration found for integration');
  }

  const organization = finalConfig.organization;
  const project = finalConfig.project || finalConfig.project_name;
  const personalAccessToken = finalConfig.personal_access_token || finalConfig.personalAccessToken;
  
  if (!organization || !personalAccessToken) {
    throw new Error('Organization and personal access token are required');
  }
  
  console.log(`Organization: ${organization}, Project: ${project}`);

  // Sync organization data
  await syncOrganization(integration_id, organization, personalAccessToken);
  
  // Sync project data (only if project is specified)
  if (project) {
    await syncProject(integration_id, organization, project, personalAccessToken);
  }
  
  // Sync work items
  const areaPaths = finalConfig.area_paths || finalConfig.areaPaths;
  await syncWorkItems(integration_id, organization, project, personalAccessToken, areaPaths);
  
  // Sync iterations (only if project is specified)
  if (project) {
    await syncIterations(integration_id, organization, project, personalAccessToken);
  }

  // Update last sync time
  await supabase
    .from('project_integrations')
    .update({ 
      last_sync_at: new Date().toISOString(),
      metadata: { ...integration.metadata, last_sync_status: 'success' }
    })
    .eq('id', integration_id);

  console.log('Azure DevOps sync completed successfully');

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: 'Azure DevOps sync completed successfully' 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

async function syncOrganization(integration_id: string, organization: string, token: string) {
  console.log(`Syncing organization: ${organization}`);
  
  const url = `https://dev.azure.com/${organization}/_apis/organization?api-version=7.0`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Basic ${btoa(':' + token)}`,
      'Content-Type': 'application/json',
    },
  });

  if (response.ok) {
    const orgData = await response.json();
    
    await supabase
      .from('azure_organizations')
      .upsert({
        integration_id,
        organization_name: organization,
        organization_url: `https://dev.azure.com/${organization}`,
        azure_id: orgData.id || organization,
        description: orgData.description || null,
        synced_at: new Date().toISOString(),
        raw_data: orgData
      }, { onConflict: 'integration_id,azure_id' });
  }
}

async function syncProject(integration_id: string, organization: string, projectName: string, token: string) {
  console.log(`Syncing project: ${projectName}`);
  
  if (!projectName) {
    console.log('No project name provided, skipping project sync');
    return;
  }
  
  const url = `https://dev.azure.com/${organization}/_apis/projects/${encodeURIComponent(projectName)}?api-version=7.0`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Basic ${btoa(':' + token)}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Failed to fetch project: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Failed to fetch project: ${response.status} ${response.statusText}`);
  }

  const projectData = await response.json();
  
  await supabase
    .from('azure_projects')
    .upsert({
      integration_id,
      azure_id: projectData.id,
      name: projectData.name,
      description: projectData.description || null,
      state: projectData.state,
      visibility: projectData.visibility,
      last_update_time: projectData.lastUpdateTime,
      synced_at: new Date().toISOString(),
      raw_data: projectData
    }, { onConflict: 'integration_id,azure_id' });
}

async function syncWorkItems(integration_id: string, organization: string, project: string | undefined, token: string, areaPaths?: string[] | string) {
  console.log(`Syncing work items for project: ${project || 'all projects'}`);
  
  // Get integration details to check for area paths
  const { data: integration } = await supabase
    .from('project_integrations')
    .select('configuration')
    .eq('id', integration_id)
    .single();

  const configAreaPaths = integration?.configuration?.area_paths || integration?.configuration?.areaPaths || areaPaths;
  
  // Get work items using WIQL (Work Item Query Language)
  const wiqlUrl = project 
    ? `https://dev.azure.com/${organization}/${encodeURIComponent(project)}/_apis/wit/wiql?api-version=7.0`
    : `https://dev.azure.com/${organization}/_apis/wit/wiql?api-version=7.0`;
  
  // Build area path filter if specified
  let areaPathFilter = '';
  if (configAreaPaths) {
    let paths: string[] = [];
    if (Array.isArray(configAreaPaths)) {
      paths = configAreaPaths;
    } else if (typeof configAreaPaths === 'string' && configAreaPaths.trim()) {
      paths = configAreaPaths.split(',').map(path => path.trim()).filter(Boolean);
    }
    
    if (paths.length > 0 && project) {
      const areaConditions = paths.map(path => `[System.AreaPath] UNDER '${project}\\${path}'`).join(' OR ');
      areaPathFilter = ` AND (${areaConditions})`;
    }
  }
  
  const wiqlQuery = {
    query: `
      SELECT [System.Id], [System.Title], [System.WorkItemType], [System.State], [System.AssignedTo], 
             [System.CreatedBy], [System.AreaPath], [System.IterationPath], [Microsoft.VSTS.Scheduling.StoryPoints],
             [Microsoft.VSTS.Scheduling.OriginalEstimate], [Microsoft.VSTS.Scheduling.RemainingWork], 
             [Microsoft.VSTS.Scheduling.CompletedWork], [System.Priority], [Microsoft.VSTS.Common.Severity],
             [System.Tags], [System.Parent], [System.CreatedDate], [System.ChangedDate], 
             [Microsoft.VSTS.Common.ResolvedDate], [Microsoft.VSTS.Common.ClosedDate]
       FROM WorkItems 
       WHERE ${project ? `[System.TeamProject] = '${project}'` : '1=1'}${areaPathFilter}
       ORDER BY [System.ChangedDate] DESC
    `
  };

  const wiqlResponse = await fetch(wiqlUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(':' + token)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(wiqlQuery)
  });

  if (!wiqlResponse.ok) {
    throw new Error(`Failed to query work items: ${wiqlResponse.status} ${wiqlResponse.statusText}`);
  }

  const wiqlResult = await wiqlResponse.json();
  const workItemIds = wiqlResult.workItems?.map((wi: any) => wi.id) || [];
  
  if (workItemIds.length === 0) {
    console.log('No work items found');
    return;
  }

  // Get detailed work item data in batches
  const batchSize = 200;
  for (let i = 0; i < workItemIds.length; i += batchSize) {
    const batch = workItemIds.slice(i, i + batchSize);
    const detailsUrl = project 
      ? `https://dev.azure.com/${organization}/${encodeURIComponent(project)}/_apis/wit/workitems?ids=${batch.join(',')}&$expand=all&api-version=7.0`
      : `https://dev.azure.com/${organization}/_apis/wit/workitems?ids=${batch.join(',')}&$expand=all&api-version=7.0`;
    
    const detailsResponse = await fetch(detailsUrl, {
      headers: {
        'Authorization': `Basic ${btoa(':' + token)}`,
        'Content-Type': 'application/json',
      },
    });

    if (detailsResponse.ok) {
      const detailsData = await detailsResponse.json();
      
      for (const workItem of detailsData.value || []) {
        const fields = workItem.fields || {};
        
        await supabase
          .from('azure_work_items')
          .upsert({
            integration_id,
            azure_id: workItem.id,
            title: fields['System.Title'] || '',
            work_item_type: fields['System.WorkItemType'] || '',
            state: fields['System.State'] || null,
            reason: fields['System.Reason'] || null,
            assigned_to: fields['System.AssignedTo']?.displayName || null,
            created_by: fields['System.CreatedBy']?.displayName || null,
            area_path: fields['System.AreaPath'] || null,
            iteration_path: fields['System.IterationPath'] || null,
            story_points: fields['Microsoft.VSTS.Scheduling.StoryPoints'] || null,
            original_estimate: fields['Microsoft.VSTS.Scheduling.OriginalEstimate'] || null,
            remaining_work: fields['Microsoft.VSTS.Scheduling.RemainingWork'] || null,
            completed_work: fields['Microsoft.VSTS.Scheduling.CompletedWork'] || null,
            priority: fields['System.Priority'] || null,
            severity: fields['Microsoft.VSTS.Common.Severity'] || null,
            tags: fields['System.Tags'] ? fields['System.Tags'].split(';').map((tag: string) => tag.trim()) : null,
            parent_id: fields['System.Parent'] || null,
            created_date: fields['System.CreatedDate'] || null,
            changed_date: fields['System.ChangedDate'] || null,
            resolved_date: fields['Microsoft.VSTS.Common.ResolvedDate'] || null,
            closed_date: fields['Microsoft.VSTS.Common.ClosedDate'] || null,
            synced_at: new Date().toISOString(),
            raw_data: workItem
          }, { onConflict: 'integration_id,azure_id' });
      }
    }
  }
  
  console.log(`Synced ${workItemIds.length} work items`);
}

async function syncIterations(integration_id: string, organization: string, project: string, token: string) {
  console.log(`Syncing iterations for project: ${project}`);
  
  if (!project) {
    console.log('No project specified, skipping iterations sync');
    return;
  }
  
  const url = `https://dev.azure.com/${organization}/${encodeURIComponent(project)}/_apis/work/teamsettings/iterations?api-version=7.0`;
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Basic ${btoa(':' + token)}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    console.log(`Failed to fetch iterations: ${response.status} ${response.statusText}`);
    return;
  }

  const iterationsData = await response.json();
  
  for (const iteration of iterationsData.value || []) {
    await supabase
      .from('azure_iterations')
      .upsert({
        integration_id,
        azure_id: iteration.id,
        name: iteration.name,
        path: iteration.path,
        start_date: iteration.attributes?.startDate || null,
        finish_date: iteration.attributes?.finishDate || null,
        state: iteration.attributes?.timeFrame || null,
        synced_at: new Date().toISOString(),
        raw_data: iteration
      }, { onConflict: 'integration_id,azure_id' });
  }
  
  console.log(`Synced ${iterationsData.value?.length || 0} iterations`);
}