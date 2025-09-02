import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { token, owner, repo } = await req.json()

    if (!token) {
      throw new Error('GitHub token is required')
    }

    console.log('Testing GitHub connection...')

    // Test basic API access
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'SmartHub-GitHub-Integration'
      }
    })

    if (!userResponse.ok) {
      const errorText = await userResponse.text()
      throw new Error(`GitHub API authentication failed: ${errorText}`)
    }

    const user = await userResponse.json()
    console.log('GitHub user authenticated:', user.login)

    let repoAccess = null
    
    // Test repository access if owner/repo provided
    if (owner && repo) {
      const repoResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'SmartHub-GitHub-Integration'
        }
      })

      if (repoResponse.ok) {
        const repoData = await repoResponse.json()
        repoAccess = {
          hasAccess: true,
          repository: {
            name: repoData.name,
            fullName: repoData.full_name,
            private: repoData.private,
            permissions: repoData.permissions
          }
        }
      } else {
        repoAccess = {
          hasAccess: false,
          error: `Cannot access repository ${owner}/${repo}`
        }
      }
    }

    // Test available scopes
    const scopeHeader = userResponse.headers.get('x-oauth-scopes')
    const availableScopes = scopeHeader ? scopeHeader.split(', ') : []

    const requiredScopes = ['repo', 'read:user']
    const hasRequiredScopes = requiredScopes.every(scope => 
      availableScopes.some(available => available.includes(scope))
    )

    return new Response(
      JSON.stringify({
        success: true,
        connection: {
          authenticated: true,
          user: {
            login: user.login,
            name: user.name,
            avatarUrl: user.avatar_url
          },
          scopes: {
            available: availableScopes,
            required: requiredScopes,
            hasRequired: hasRequiredScopes
          },
          repository: repoAccess,
          rateLimit: {
            remaining: userResponse.headers.get('x-ratelimit-remaining'),
            limit: userResponse.headers.get('x-ratelimit-limit'),
            reset: userResponse.headers.get('x-ratelimit-reset')
          }
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
    console.error('GitHub connection test failed:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to test GitHub connection'
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