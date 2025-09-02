import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { integrationId } = await req.json()

    if (!integrationId) {
      throw new Error('Integration ID is required')
    }

    console.log('Starting GitHub sync for integration:', integrationId)

    // Get integration configuration
    const { data: integration, error: integrationError } = await supabase
      .from('project_integrations')
      .select('*')
      .eq('id', integrationId)
      .eq('integration_type', 'github')
      .single()

    if (integrationError || !integration) {
      throw new Error('GitHub integration not found')
    }

    const config = integration.configuration
    const { token, owner, repo } = config

    if (!token || !owner || !repo) {
      throw new Error('GitHub configuration incomplete')
    }

    const headers = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'SmartHub-GitHub-Integration'
    }

    // Sync repository information
    const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers })
    
    if (!repoResponse.ok) {
      throw new Error(`Failed to fetch repository: ${repoResponse.statusText}`)
    }

    const repoData = await repoResponse.json()
    
    // Insert or update repository
    const { data: repository, error: repoError } = await supabase
      .from('github_repositories')
      .upsert({
        integration_id: integrationId,
        project_id: integration.project_id,
        github_id: repoData.id,
        name: repoData.name,
        full_name: repoData.full_name,
        description: repoData.description,
        private: repoData.private,
        default_branch: repoData.default_branch,
        language: repoData.language,
        size_kb: repoData.size,
        stars_count: repoData.stargazers_count,
        forks_count: repoData.forks_count,
        open_issues_count: repoData.open_issues_count,
        watchers_count: repoData.watchers_count,
        updated_at: repoData.updated_at,
        pushed_at: repoData.pushed_at,
        raw_data: repoData,
        synced_at: new Date().toISOString()
      }, {
        onConflict: 'integration_id,github_id'
      })
      .select()
      .single()

    if (repoError) {
      console.error('Error syncing repository:', repoError)
      throw repoError
    }

    console.log('Repository synced:', repository.full_name)

    // Initialize sync statistics
    let commitsData = []
    let prsData = []
    let contributorsData = []

    // Sync recent commits (last 100)
    const commitsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`,
      { headers }
    )

    if (commitsResponse.ok) {
      commitsData = await commitsResponse.json()
      
      for (const commit of commitsData) {
        try {
          await supabase
            .from('github_commits')
            .upsert({
              integration_id: integrationId,
              repository_id: repository.id,
              sha: commit.sha,
              message: commit.commit.message,
              author_name: commit.commit.author?.name,
              author_email: commit.commit.author?.email,
              committer_name: commit.commit.committer?.name,
              committer_email: commit.commit.committer?.email,
              commit_date: commit.commit.author?.date,
              raw_data: commit,
              synced_at: new Date().toISOString()
            }, {
              onConflict: 'sha,repository_id'
            })
        } catch (error) {
          console.error('Error syncing commit:', commit.sha, error)
        }
      }
      console.log(`Synced ${commitsData.length} commits`)
    } else {
      console.error('Failed to fetch commits:', commitsResponse.statusText)
    }

    // Sync pull requests
    const prsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=100`,
      { headers }
    )

    if (prsResponse.ok) {
      prsData = await prsResponse.json()
      
      for (const pr of prsData) {
        try {
          await supabase
            .from('github_pull_requests')
            .upsert({
              integration_id: integrationId,
              repository_id: repository.id,
              github_id: pr.id,
              number: pr.number,
              title: pr.title,
              body: pr.body,
              state: pr.state,
              author_login: pr.user?.login,
              assignee_login: pr.assignee?.login,
              base_branch: pr.base?.ref,
              head_branch: pr.head?.ref,
              mergeable: pr.mergeable,
              merged: pr.merged,
              draft: pr.draft,
              created_at: pr.created_at,
              updated_at: pr.updated_at,
              closed_at: pr.closed_at,
              merged_at: pr.merged_at,
              raw_data: pr,
              synced_at: new Date().toISOString()
            }, {
              onConflict: 'github_id,repository_id'
            })
        } catch (error) {
          console.error('Error syncing PR:', pr.number, error)
        }
      }
      console.log(`Synced ${prsData.length} pull requests`)
    } else {
      console.error('Failed to fetch pull requests:', prsResponse.statusText)
    }

    // Sync contributors
    const contributorsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100`,
      { headers }
    )

    if (contributorsResponse.ok) {
      contributorsData = await contributorsResponse.json()
      
      for (const contributor of contributorsData) {
        try {
          await supabase
            .from('github_contributors')
            .upsert({
              integration_id: integrationId,
              repository_id: repository.id,
              login: contributor.login,
              github_id: contributor.id,
              avatar_url: contributor.avatar_url,
              contributions: contributor.contributions,
              raw_data: contributor,
              synced_at: new Date().toISOString()
            }, {
              onConflict: 'github_id,repository_id'
            })
        } catch (error) {
          console.error('Error syncing contributor:', contributor.login, error)
        }
      }
      console.log(`Synced ${contributorsData.length} contributors`)
    } else {
      console.error('Failed to fetch contributors:', contributorsResponse.statusText)
    }

    // Sync workflows for pipeline analysis
    let workflowsData = []
    const workflowsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/actions/workflows`,
      { headers }
    )

    if (workflowsResponse.ok) {
      const workflowsResult = await workflowsResponse.json()
      workflowsData = workflowsResult.workflows || []
      
      for (const workflow of workflowsData) {
        try {
          await supabase
            .from('github_workflows')
            .upsert({
              integration_id: integrationId,
              repository_id: repository.id,
              github_id: workflow.id,
              name: workflow.name,
              state: workflow.state,
              badge_url: workflow.badge_url,
              html_url: workflow.html_url,
              created_at: workflow.created_at,
              updated_at: workflow.updated_at,
              raw_data: workflow,
              synced_at: new Date().toISOString()
            }, {
              onConflict: 'github_id,repository_id'
            })
            
          // Sync recent workflow runs for this workflow
          const runsResponse = await fetch(
            `https://api.github.com/repos/${owner}/${repo}/actions/workflows/${workflow.id}/runs?per_page=20`,
            { headers }
          )
          
          if (runsResponse.ok) {
            const runsResult = await runsResponse.json()
            const runs = runsResult.workflow_runs || []
            
            for (const run of runs) {
              try {
                // Calculate duration if both timestamps exist
                let durationSeconds = null
                if (run.run_started_at && run.updated_at) {
                  const startTime = new Date(run.run_started_at).getTime()
                  const endTime = new Date(run.updated_at).getTime()
                  durationSeconds = Math.round((endTime - startTime) / 1000)
                }
                
                await supabase
                  .from('github_workflow_runs')
                  .upsert({
                    integration_id: integrationId,
                    repository_id: repository.id,
                    workflow_id: workflow.id,
                    github_id: run.id,
                    run_number: run.run_number,
                    status: run.status,
                    conclusion: run.conclusion,
                    workflow_name: run.name,
                    head_branch: run.head_branch,
                    head_sha: run.head_sha,
                    run_started_at: run.run_started_at,
                    run_updated_at: run.updated_at,
                    duration_seconds: durationSeconds,
                    raw_data: run,
                    synced_at: new Date().toISOString()
                  }, {
                    onConflict: 'github_id,repository_id'
                  })
              } catch (error) {
                console.error('Error syncing workflow run:', run.id, error)
              }
            }
          }
        } catch (error) {
          console.error('Error syncing workflow:', workflow.name, error)
        }
      }
      console.log(`Synced ${workflowsData.length} workflows`)
    } else {
      console.error('Failed to fetch workflows:', workflowsResponse.statusText)
    }

    // Sync releases for release prediction
    let releasesData = []
    const releasesResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases?per_page=20`,
      { headers }
    )

    if (releasesResponse.ok) {
      releasesData = await releasesResponse.json()
      
      for (const release of releasesData) {
        try {
          await supabase
            .from('github_releases')
            .upsert({
              integration_id: integrationId,
              repository_id: repository.id,
              github_id: release.id,
              tag_name: release.tag_name,
              name: release.name,
              body: release.body,
              draft: release.draft,
              prerelease: release.prerelease,
              published_at: release.published_at,
              created_at: release.created_at,
              raw_data: release,
              synced_at: new Date().toISOString()
            }, {
              onConflict: 'github_id,repository_id'
            })
        } catch (error) {
          console.error('Error syncing release:', release.tag_name, error)
        }
      }
      console.log(`Synced ${releasesData.length} releases`)
    } else {
      console.error('Failed to fetch releases:', releasesResponse.statusText)
    }

    // Update integration last sync time
    await supabase
      .from('project_integrations')
      .update({ 
        last_sync_at: new Date().toISOString(),
        metadata: { ...integration.metadata, last_sync_success: true }
      })
      .eq('id', integrationId)

    console.log('GitHub sync completed successfully')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'GitHub sync completed successfully',
        stats: {
          repository: 1,
          commits: commitsData?.length || 0,
          pullRequests: prsData?.length || 0,
          contributors: contributorsData?.length || 0,
          workflows: workflowsData?.length || 0,
          releases: releasesData?.length || 0
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('GitHub sync failed:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to sync GitHub data'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      }
    )
  }
})