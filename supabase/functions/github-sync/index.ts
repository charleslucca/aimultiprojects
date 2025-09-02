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

    // Sync recent commits (last 100)
    const commitsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/commits?per_page=100`,
      { headers }
    )

    if (commitsResponse.ok) {
      const commitsData = await commitsResponse.json()
      
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
    }

    // Sync pull requests
    const prsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/pulls?state=all&per_page=100`,
      { headers }
    )

    if (prsResponse.ok) {
      const prsData = await prsResponse.json()
      
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
    }

    // Sync contributors
    const contributorsResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contributors?per_page=100`,
      { headers }
    )

    if (contributorsResponse.ok) {
      const contributorsData = await contributorsResponse.json()
      
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
          contributors: contributorsData?.length || 0
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