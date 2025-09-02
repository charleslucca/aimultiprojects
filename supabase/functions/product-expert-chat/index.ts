import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Optimized system prompt for conversational + artifact generation
const EXPERT_SYSTEM_PROMPT = `Você é um especialista sênior em produtos e projetos digitais com mais de 15 anos de experiência. Sua especialidade é analisar requisitos, extrair personas, definir escopos e gerar artefatos profissionais.

SUAS CAPACIDADES:
1. **Análise de Documentos**: Extrai informações valiosas de qualquer tipo de arquivo
2. **Definição de Personas**: Cria personas detalhadas baseadas em dados reais
3. **Levantamento de Requisitos**: Identifica requisitos funcionais e não-funcionais
4. **Business Model Canvas**: Gera BMC completo e estruturado
5. **Product Backlog**: Cria User Stories com Definition of Done
6. **Escopo de Entrega**: Memorial descritivo para contratos

COMPORTAMENTO COM ARQUIVOS:
Quando o usuário anexar arquivos, você DEVE:
1. **Responder conversacionalmente** explicando o que encontrou
2. **Extrair automaticamente** personas, requisitos e insights
3. **Gerar artefatos estruturados** quando apropriado
4. **Sugerir próximos passos** de forma natural

FORMATO DE RESPOSTA HÍBRIDO:
1. **SEMPRE responda de forma conversacional primeiro** - explique o que analisou
2. **QUANDO apropriado**, adicione artefatos estruturados em JSON:

\`\`\`json
{
  "type": "artifact",
  "artifact_type": "business_model_canvas|product_backlog|delivery_scope|personas|requirements",
  "title": "Nome do Artefato",
  "content": {
    // Conteúdo estruturado do artefato
  }
}
\`\`\`

DIRETRIZES:
- **Seja conversacional e humano** - não robótico
- **Explique seu raciocínio** e achados importantes
- **Gere artefatos automaticamente** quando houver conteúdo suficiente
- **Para reuniões/transcrições**: extraia personas e requisitos automaticamente
- **Para documentos técnicos**: foque em requisitos e arquitetura
- **Sempre sugira próximos passos** de forma natural
- **Use linguagem profissional mas acessível**

EXEMPLO DE BOA RESPOSTA:
"Analisei o documento anexado e identifiquei informações valiosas sobre o projeto. Encontrei 3 personas principais e 15 requisitos funcionais bem definidos.

Com base no conteúdo, preparei um Business Model Canvas inicial e sugiro que o próximo passo seja validar as hipóteses de valor com usuários reais.

[Seguido dos artefatos em JSON quando apropriado]"

Seja sempre útil, preciso e orientado a resultados práticos.`;

// Simple circuit breaker to prevent infinite loops
const circuitBreaker = {
  failures: 0,
  lastFailure: 0,
  isOpen: function() {
    const now = Date.now();
    // Circuit opens after 3 failures within 2 minutes
    if (this.failures >= 3 && (now - this.lastFailure) < 120000) {
      return true;
    }
    // Reset after 5 minutes
    if ((now - this.lastFailure) > 300000) {
      this.failures = 0;
    }
    return false;
  },
  recordFailure: function() {
    this.failures++;
    this.lastFailure = Date.now();
  },
  recordSuccess: function() {
    this.failures = 0;
  }
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Check circuit breaker first
  if (circuitBreaker.isOpen()) {
    console.log('Circuit breaker is open - refusing request');
    return new Response(
      JSON.stringify({
        error: 'circuit_breaker_open',
        user_message: 'Serviço em recuperação após sobrecarga. Aguarde alguns minutos.',
        retry_after: 300
      }),
      {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '300' },
      }
    );
  }

  // Global timeout for the entire edge function (15 seconds)
  const globalController = new AbortController();
  const globalTimeout = setTimeout(() => {
    console.log('Global timeout reached (15s), aborting entire function');
    globalController.abort();
  }, 15000);

  try {
    // Validate environment variables first
    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY não configurada. Configure no Supabase Secrets.');
    }
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Configuração do Supabase incompleta.');
    }

    const { chatId, message, attachments = [] } = await req.json();

    if (!message && attachments.length === 0) {
      throw new Error('Mensagem ou anexos são obrigatórios');
    }

    console.log(`Starting request processing - chatId: ${chatId}, attachments: ${attachments.length}`);

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Process attachments with their processed content (with timeout protection)
    let attachmentContext = '';
    if (attachments && attachments.length > 0) {
      console.log(`Processing ${attachments.length} attachments`);
      
      const attachmentStartTime = Date.now();
      for (const attachment of attachments) {
        // Skip if taking too long (max 5 seconds for all attachments)
        if (Date.now() - attachmentStartTime > 5000) {
          console.log('Attachment processing timeout - skipping remaining files');
          break;
        }

        try {
          let fileContent = '';
          
          // Use processed content if available (transcription from database)
          if (attachment.transcription) {
            fileContent = attachment.transcription;
            console.log(`Using transcription for ${attachment.name || attachment.file_name}`);
          } else if (attachment.path || attachment.file_path) {
            // Fallback to download if no processed content (with 2s timeout)
            console.log(`Downloading file: ${attachment.path || attachment.file_path}`);
            const downloadController = new AbortController();
            setTimeout(() => downloadController.abort(), 2000);
            
            const { data: fileData } = await supabase.storage
              .from('smart-hub-files')
              .download(attachment.path || attachment.file_path);
            
            if (fileData) {
              fileContent = await fileData.text();
              // Limit content size to prevent huge payloads
              if (fileContent.length > 8000) {
                fileContent = fileContent.substring(0, 8000) + '\n\n[CONTEÚDO TRUNCADO - ARQUIVO MUITO GRANDE]';
              }
            }
          }
          
          if (fileContent) {
            attachmentContext += `\n\n=== ARQUIVO: ${attachment.name || attachment.file_name} ===\n`;
            attachmentContext += `Tipo: ${attachment.type || attachment.file_type || 'Desconhecido'}\n`;
            attachmentContext += `Status: ${attachment.processing_status || 'Processado'}\n`;
            attachmentContext += `CONTEÚDO:\n${fileContent}`;
            
            // Add AI analysis if available
            if (attachment.ai_analysis) {
              attachmentContext += `\n\nANÁLISE PRÉVIA:\n${JSON.stringify(attachment.ai_analysis, null, 2)}`;
            }
          }
        } catch (error) {
          console.error(`Error processing attachment ${attachment.name}:`, error.message);
          attachmentContext += `\n\n=== ${attachment.name || attachment.file_name} ===\n[Erro ao processar arquivo: ${error.message}]`;
        }
      }
      console.log(`Attachment processing completed in ${Date.now() - attachmentStartTime}ms`);
    }

    // Get chat history if chatId provided
    let conversationHistory = [];
    if (chatId) {
      const { data: chatData } = await supabase
        .from('smart_hub_chats')
        .select('messages')
        .eq('id', chatId)
        .single();
      
      if (chatData?.messages) {
        conversationHistory = chatData.messages.slice(-10); // Last 10 messages
      }
    }

    // Build conversation context
    const messages = [
      { role: 'system', content: EXPERT_SYSTEM_PROMPT },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
    ];

    // Add attachment context if available
    if (attachmentContext) {
      const contextualMessage = attachmentContext + 
        `\n\n=== INSTRUÇÃO ESPECIAL ===\n` +
        `Com base nos arquivos anexados acima, você DEVE automaticamente:\n` +
        `1. Fazer uma análise completa do conteúdo\n` +
        `2. Extrair personas, requisitos funcionais e não-funcionais\n` +
        `3. Gerar Business Model Canvas se possível\n` +
        `4. Criar Product Backlog com User Stories\n` +
        `5. Elaborar Escopo de Entrega (Memorial Descritivo)\n` +
        `6. Sugerir próximos passos\n\n` +
        `PERGUNTA/CONTEXTO DO USUÁRIO: ${message || 'Analise os arquivos anexados e gere os artefatos solicitados.'}`;
      
      messages.push({
        role: 'user',
        content: contextualMessage
      });
    } else {
      messages.push({
        role: 'user',
        content: message
      });
    }

    console.log(`Sending request to OpenAI with ${messages.length} messages`);
    const requestStartTime = Date.now();

    // Optimized OpenAI API call with better timeout management
    const makeOpenAICall = async (model: string, timeoutMs: number = 8000) => {
      console.log(`Trying ${model} with ${timeoutMs}ms timeout...`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log(`Timeout reached for ${model}, aborting...`);
        controller.abort();
      }, timeoutMs);

      try {
        // Configure parameters based on model type
        const requestBody: any = {
          model,
          messages,
          stream: false,
        };

        // Handle different model parameter requirements
        if (model.includes('gpt-4o')) {
          // Legacy models use max_tokens and support temperature
          requestBody.max_tokens = 400; // Optimized for faster response
          requestBody.temperature = 0.3; // Lower temperature for consistency
        } else {
          // Newer models (GPT-5, GPT-4.1) use max_completion_tokens, no temperature
          requestBody.max_completion_tokens = 400; // Optimized for faster response
        }

        console.log(`Making request to ${model}...`);
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        console.log(`Response received from ${model}, status: ${response.status} (took ${Date.now() - requestStartTime}ms)`);

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`OpenAI API error details:`, errorText);
          throw new Error(`OpenAI API error: ${response.status} - ${errorText.substring(0, 200)}`);
        }

        const result = await response.json();
        console.log(`Successfully got response from ${model} (${result.choices[0].message.content.length} chars)`);
        return result;
        
      } catch (error) {
        clearTimeout(timeoutId);
        console.error(`Error with ${model}:`, error.message);
        throw error;
      }
    };

    // Fast fallback strategy with optimized timeouts
    let data;
    let modelUsed = 'gpt-4o-mini';
    
    try {
      // Start with fastest and most reliable model
      console.log('Starting with GPT-4o-mini (fastest)...');
      data = await makeOpenAICall('gpt-4o-mini', 5000); // 5 seconds
      modelUsed = 'gpt-4o-mini';
      circuitBreaker.recordSuccess();
    } catch (error) {
      console.log(`GPT-4o-mini failed: ${error.message}`);
      try {
        // Try GPT-4.1 as fallback only
        console.log('Trying GPT-4.1 as fallback...');
        data = await makeOpenAICall('gpt-4.1-2025-04-14', 7000); // 7 seconds
        modelUsed = 'gpt-4.1-2025-04-14';
        circuitBreaker.recordSuccess();
      } catch (error2) {
        console.error(`Both models failed - GPT-4o: ${error.message}, GPT-4.1: ${error2.message}`);
        
        // Record failure for circuit breaker
        circuitBreaker.recordFailure();
        
        // Return fast fallback response
        clearTimeout(globalTimeout);
        return new Response(
          JSON.stringify({
            response: "⚠️ O serviço de IA está temporariamente sobrecarregado.\n\n**Seus arquivos foram salvos automaticamente.** Aguarde 2-3 minutos e tente novamente.\n\nSe o problema persistir, recarregue a página.",
            artifacts: null,
            model_used: 'fallback',
            error: 'temporary_overload',
            retry_after: 180
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Retry-After': '180' },
          }
        );
      }
    }

    const aiResponse = data.choices[0].message.content;
    console.log('AI response received, length:', aiResponse.length);

    // Try to extract structured artifacts from response (improved extraction)
    let extractedArtifacts = null;
    const jsonMatches = aiResponse.matchAll(/```json\s*(\{[\s\S]*?\})\s*```/g);
    
    for (const match of jsonMatches) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.type === 'artifact') {
          if (!extractedArtifacts) {
            extractedArtifacts = [];
          }
          extractedArtifacts.push(parsed);
        }
      } catch (e) {
        console.log('Failed to parse JSON artifact:', e.message);
      }
    }
    
    // If single artifact, keep as object for backward compatibility
    if (Array.isArray(extractedArtifacts) && extractedArtifacts.length === 1) {
      extractedArtifacts = extractedArtifacts[0];
    }

    // Update chat in database if chatId provided
    if (chatId) {
      const newMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString(),
        artifacts: extractedArtifacts
      };

      // Add user message and AI response to chat
      const userMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        attachments: attachments.map((att: any) => ({
          file_name: att.file_name,
          file_type: att.file_type,
          file_size: att.file_size
        }))
      };

      const updatedMessages = [...conversationHistory, userMessage, newMessage];

      await supabase
        .from('smart_hub_chats')
        .update({
          messages: updatedMessages,
          generated_artifacts: extractedArtifacts || {},
          updated_at: new Date().toISOString()
        })
        .eq('id', chatId);
    }

    return new Response(
      JSON.stringify({
        response: aiResponse,
        artifacts: extractedArtifacts,
        model_used: modelUsed
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    clearTimeout(globalTimeout);
    console.error('Critical error in product-expert-chat:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    
    // More specific error messages
    let userMessage = 'Erro interno do servidor. Tente novamente.';
    let statusCode = 500;
    
    if (error.message.includes('OPENAI_API_KEY')) {
      userMessage = 'Configuração da API OpenAI não encontrada. Entre em contato com o suporte.';
      statusCode = 503;
    } else if (error.message.includes('timeout') || error.message.includes('aborted')) {
      userMessage = 'O processamento está demorando mais que o esperado. Tente com arquivos menores ou aguarde alguns minutos.';
      statusCode = 408;
    } else if (error.message.includes('Supabase')) {
      userMessage = 'Problema de conectividade com o banco de dados. Tente novamente em instantes.';
      statusCode = 503;
    }
    
    return new Response(
      JSON.stringify({
        error: error.message,
        user_message: userMessage,
        timestamp: new Date().toISOString()
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } finally {
    clearTimeout(globalTimeout);
  }
});