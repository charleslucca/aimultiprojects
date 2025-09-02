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

// Direct proxy to OpenAI - no circuit breaker needed

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Process attachments - simple and fast
    let attachmentContext = '';
    if (attachments && attachments.length > 0) {
      console.log(`Processing ${attachments.length} attachments`);
      
      for (const attachment of attachments) {
        try {
          let fileContent = '';
          
          // Use processed content if available
          if (attachment.transcription) {
            fileContent = attachment.transcription;
          } else if (attachment.path || attachment.file_path) {
            const { data: fileData } = await supabase.storage
              .from('smart-hub-files')
              .download(attachment.path || attachment.file_path);
            
            if (fileData) {
              fileContent = await fileData.text();
              // Reasonable content limit
              if (fileContent.length > 15000) {
                fileContent = fileContent.substring(0, 15000) + '\n\n[CONTEÚDO TRUNCADO]';
              }
            }
          }
          
          if (fileContent) {
            attachmentContext += `\n\n=== ARQUIVO: ${attachment.name || attachment.file_name} ===\n`;
            attachmentContext += `Tipo: ${attachment.type || attachment.file_type || 'Desconhecido'}\n`;
            attachmentContext += `CONTEÚDO:\n${fileContent}`;
            
            if (attachment.ai_analysis) {
              attachmentContext += `\n\nANÁLISE PRÉVIA:\n${JSON.stringify(attachment.ai_analysis, null, 2)}`;
            }
          }
        } catch (error) {
          console.error(`Error processing attachment ${attachment.name}:`, error.message);
          attachmentContext += `\n\n=== ${attachment.name || attachment.file_name} ===\n[Erro ao processar arquivo]`;
        }
      }
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

    // Simple direct call to OpenAI - like ChatGPT
    try {
      const requestBody = {
        model: 'gpt-4o-mini', // Single reliable model
        messages,
        max_tokens: 1000, // Generous limit
        temperature: 0.7, // Balanced creativity
        stream: false,
      };

      console.log('Making direct request to OpenAI API...');
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log('OpenAI response received successfully');
      
      const aiResponse = data.choices[0].message.content;

      console.log('AI response received, length:', aiResponse.length);

      // Extract structured artifacts from response
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
          model_used: 'gpt-4o-mini'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );

    } catch (openaiError) {
      console.error('OpenAI API call failed:', openaiError);
      throw openaiError;
    }

  } catch (error) {
    console.error('Error in product-expert-chat:', error);
    
    // Simple error handling
    let userMessage = 'Erro interno. Tente novamente.';
    let statusCode = 500;
    
    if (error.message.includes('OPENAI_API_KEY')) {
      userMessage = 'Chave da OpenAI não configurada.';
      statusCode = 503;
    } else if (error.message.includes('429') || error.message.includes('rate')) {
      userMessage = 'Muitas requisições. Aguarde alguns segundos.';
      statusCode = 429;
    } else if (error.message.includes('timeout')) {
      userMessage = 'Timeout. Tente novamente.';
      statusCode = 408;
    }
    
    return new Response(
      JSON.stringify({
        response: `❌ **Erro**: ${userMessage}\n\n💡 **Sugestão**: Tente novamente em alguns instantes. Se persistir, recarregue a página.`,
        artifacts: null,
        model_used: 'error',
        error: 'api_error'
      }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});