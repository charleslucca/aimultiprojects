import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface JiraTestConfig {
  url: string;
  username: string;
  token: string;
  projectKeys?: string[];
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { config }: { config: JiraTestConfig } = await req.json();
    
    if (!config.url || !config.username || !config.token) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'URL, usuário e token são obrigatórios' 
        }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Clean and validate URL
    const cleanUrl = config.url.replace(/\/+$/, ''); // Remove trailing slashes
    if (!cleanUrl.startsWith('http')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'URL deve começar com http:// ou https://' 
        }), 
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Test authentication with Jira API
    const auth = btoa(`${config.username}:${config.token}`);
    const testUrl = `${cleanUrl}/rest/api/3/myself`;
    
    console.log(`Testing Jira connection to: ${testUrl}`);
    
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Jira API error (${response.status}):`, errorText);
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Credenciais inválidas. Verifique o usuário e token de API.' 
          }), 
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } else if (response.status === 403) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Acesso negado. Verifique as permissões do token de API.' 
          }), 
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      } else {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: `Erro de conexão: ${response.status} - ${response.statusText}` 
          }), 
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
    }

    const userData = await response.json();
    console.log('Jira connection successful:', userData.displayName);

    // Test project access if project keys are provided
    let projectMessage = '';
    if (config.projectKeys && config.projectKeys.length > 0) {
      try {
        const projectResults = [];
        for (const key of config.projectKeys) {
          if (!key.trim()) continue;
          
          const projectUrl = `${cleanUrl}/rest/api/3/project/${key.trim()}`;
          const projectResponse = await fetch(projectUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Accept': 'application/json',
            },
          });

          if (projectResponse.ok) {
            const projectData = await projectResponse.json();
            projectResults.push(`✓ ${projectData.name} (${key.trim()})`);
          } else {
            projectResults.push(`✗ Projeto ${key.trim()} não acessível`);
          }
        }
        
        if (projectResults.length > 0) {
          projectMessage = `\n\nProjetos testados:\n${projectResults.join('\n')}`;
        }
      } catch (projectError) {
        console.error('Error testing projects:', projectError);
        projectMessage = '\n\nNão foi possível testar acesso aos projetos especificados.';
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Conexão estabelecida com sucesso!\nUsuário: ${userData.displayName} (${userData.emailAddress})${projectMessage}`,
        user: userData
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Jira connection test error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Erro interno: ${error.message}` 
      }), 
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});