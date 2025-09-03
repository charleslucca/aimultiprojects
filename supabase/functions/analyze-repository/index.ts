import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TECHNICAL_EXPERT_SYSTEM_PROMPT = `Você é um Especialista Técnico Sênior em Arquitetura de Software e Desenvolvimento, com mais de 15 anos de experiência.

**SUAS CAPACIDADES:**
• Análise profunda de arquitetura de software
• Review de código e identificação de vulnerabilidades
• Otimização de performance e identificação de bottlenecks
• Geração de documentação técnica especializada
• Análise de qualidade de código e melhores práticas
• Sugestão de testes automatizados

**TIPOS DE ANÁLISE DISPONÍVEIS:**
1. **repository_analysis**: Documentação completa da arquitetura
2. **security_analysis**: Review de vulnerabilidades de segurança
3. **performance_analysis**: Análise de performance e otimizações
4. **quality_analysis**: Code review e melhores práticas
5. **test_generation**: Sugestão de testes automatizados

**FORMATO DE RESPOSTA:**
Sempre estruture suas respostas em Markdown com:
- Título da análise
- Resumo executivo
- Seções organizadas por categoria
- Recomendações práticas
- Exemplos de código quando relevante

**ESTILO:**
• Seja direto e técnico, mas acessível
• Use emojis para categorizar informações
• Forneça exemplos práticos
• Inclua métricas quando possível
• Foque em ações concretas

Responda sempre em português brasileiro.`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openAIApiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase environment variables are required');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { chatId, message, analysisType, repositoryId } = await req.json();

    console.log('Technical analysis request:', { chatId, message, analysisType, repositoryId });

    // Get chat history if chatId exists
    let chatHistory: any[] = [];
    if (chatId) {
      const { data: chatData, error: chatError } = await supabase
        .from('smart_hub_chats')
        .select('messages')
        .eq('id', chatId)
        .single();

      if (chatError) {
        console.error('Error fetching chat history:', chatError);
      } else if (chatData?.messages) {
        chatHistory = chatData.messages;
      }
    }

    let repositoryData = null;
    let repositoryFiles = null;

    // Fetch repository data if repositoryId is provided
    if (repositoryId) {
      const { data: repo, error: repoError } = await supabase
        .from('github_repositories')
        .select('*')
        .eq('id', repositoryId)
        .single();

      if (repoError) {
        console.error('Error fetching repository:', repoError);
      } else {
        repositoryData = repo;

        // For repository analysis, we'll analyze the repository structure
        if (analysisType === 'repository_analysis') {
          // Get GitHub integration details
          const { data: integration, error: integrationError } = await supabase
            .from('project_integrations')
            .select('config')
            .eq('id', repo.integration_id)
            .single();

          if (!integrationError && integration?.config?.access_token) {
            try {
              // Fetch repository contents from GitHub API
              const githubResponse = await fetch(
                `https://api.github.com/repos/${repo.full_name}/contents`,
                {
                  headers: {
                    'Authorization': `token ${integration.config.access_token}`,
                    'Accept': 'application/vnd.github.v3+json',
                  },
                }
              );

              if (githubResponse.ok) {
                repositoryFiles = await githubResponse.json();
              }
            } catch (error) {
              console.error('Error fetching repository files:', error);
            }
          }
        }
      }
    }

    // Construct prompt for OpenAI
    const messages = [
      { role: 'system', content: TECHNICAL_EXPERT_SYSTEM_PROMPT }
    ];

    // Add chat history
    chatHistory.forEach((msg: any) => {
      if (msg.role && msg.content) {
        messages.push({
          role: msg.role,
          content: msg.content
        });
      }
    });

    // Construct user message with context
    let userPrompt = message;

    if (repositoryData) {
      userPrompt += `\n\n**CONTEXTO DO REPOSITÓRIO:**
- **Nome:** ${repositoryData.name}
- **Linguagem Principal:** ${repositoryData.language || 'N/A'}
- **Descrição:** ${repositoryData.description || 'Não informada'}
- **Stars:** ${repositoryData.stars_count || 0}
- **Forks:** ${repositoryData.forks_count || 0}`;

      if (repositoryFiles && analysisType === 'repository_analysis') {
        userPrompt += `\n\n**ESTRUTURA DO REPOSITÓRIO:**\n`;
        repositoryFiles.slice(0, 20).forEach((file: any) => {
          userPrompt += `- ${file.name} (${file.type})\n`;
        });
      }
    }

    if (analysisType) {
      const analysisDescriptions = {
        repository_analysis: 'Análise completa da arquitetura do repositório',
        security_analysis: 'Análise de segurança e vulnerabilidades',
        performance_analysis: 'Análise de performance e otimizações',
        quality_analysis: 'Análise de qualidade de código',
        test_generation: 'Sugestão de testes automatizados'
      };

      userPrompt += `\n\n**TIPO DE ANÁLISE SOLICITADA:** ${analysisDescriptions[analysisType as keyof typeof analysisDescriptions] || analysisType}`;
    }

    messages.push({ role: 'user', content: userPrompt });

    console.log('Calling OpenAI with messages:', messages.length);

    // Call OpenAI API
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: messages,
        max_tokens: 3000,
        temperature: 0.7,
      }),
    });

    if (!openAIResponse.ok) {
      const errorData = await openAIResponse.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${openAIResponse.status}`);
    }

    const openAIData = await openAIResponse.json();
    const response = openAIData.choices[0]?.message?.content;

    if (!response) {
      throw new Error('No response from OpenAI');
    }

    console.log('OpenAI response received, length:', response.length);

    // Extract artifacts (structured content like documentation)
    const artifacts: any[] = [];
    
    if (analysisType === 'repository_analysis' && repositoryData) {
      artifacts.push({
        type: 'architecture_documentation',
        name: `Documentação_${repositoryData.name}.md`,
        content: response,
        metadata: {
          repository: repositoryData.name,
          generated_at: new Date().toISOString(),
          analysis_type: 'architecture'
        }
      });
    }

    // Update chat history
    if (chatId) {
      const updatedMessages = [
        ...chatHistory,
        { role: 'user', content: message, timestamp: new Date().toISOString() },
        { role: 'assistant', content: response, timestamp: new Date().toISOString(), artifacts }
      ];

      const { error: updateError } = await supabase
        .from('smart_hub_chats')
        .update({ 
          messages: updatedMessages,
          updated_at: new Date().toISOString()
        })
        .eq('id', chatId);

      if (updateError) {
        console.error('Error updating chat history:', updateError);
      }
    }

    return new Response(JSON.stringify({
      response,
      artifacts,
      repository: repositoryData?.name,
      analysis_type: analysisType
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in analyze-repository function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      details: error.stack
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});