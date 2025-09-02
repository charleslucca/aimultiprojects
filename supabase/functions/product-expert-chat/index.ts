import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Specialized system prompt for digital product expert
const EXPERT_SYSTEM_PROMPT = `Você é um especialista sênior em produtos e projetos digitais com mais de 15 anos de experiência. Sua especialidade é analisar requisitos, extrair personas, definir escopos e gerar artefatos profissionais.

SUAS CAPACIDADES:
1. **Análise de Documentos**: Extrai informações valiosas de qualquer tipo de arquivo
2. **Definição de Personas**: Cria personas detalhadas baseadas em dados reais
3. **Levantamento de Requisitos**: Identifica requisitos funcionais e não-funcionais
4. **Business Model Canvas**: Gera BMC completo e estruturado
5. **Product Backlog**: Cria User Stories com Definition of Done
6. **Escopo de Entrega**: Memorial descritivo para contratos

FORMATO DE RESPOSTA:
Sempre que possível, gere artefatos estruturados em JSON no seguinte formato:
{
  "type": "artifact",
  "artifact_type": "business_model_canvas|product_backlog|delivery_scope",
  "content": {
    // Conteúdo estruturado do artefato
  }
}

INSTRUÇÕES ESPECIAIS:
- Seja sempre preciso e baseado em dados
- Use linguagem profissional e clara
- Priorize informações extraídas dos arquivos anexados
- Quando gerar artefatos, sempre forneça conteúdo detalhado e prático
- Para User Stories, sempre inclua critérios de aceitação e Definition of Done

Agora aguarde o usuário anexar documentos ou fazer perguntas sobre seu projeto.`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { chatId, message, attachments = [] } = await req.json();

    if (!message && attachments.length === 0) {
      throw new Error('Mensagem ou anexos são obrigatórios');
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Process attachments if any
    let attachmentContext = '';
    if (attachments.length > 0) {
      console.log(`Processing ${attachments.length} attachments`);
      
      for (const attachment of attachments) {
        if (attachment.transcription) {
          attachmentContext += `\n\n--- CONTEÚDO DO ARQUIVO: ${attachment.file_name} ---\n${attachment.transcription}`;
        }
        if (attachment.extracted_content) {
          attachmentContext += `\n\n--- CONTEÚDO EXTRAÍDO: ${attachment.file_name} ---\n${attachment.extracted_content}`;
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
      messages.push({
        role: 'user',
        content: `CONTEXTO DOS ARQUIVOS ANEXADOS:${attachmentContext}\n\nPERGUNTA DO USUÁRIO: ${message}`
      });
    } else {
      messages.push({
        role: 'user',
        content: message
      });
    }

    console.log('Sending request to OpenAI with', messages.length, 'messages');

    // Call OpenAI API with timeout and retry logic
    const makeOpenAICall = async (model: string, timeoutMs: number = 25000) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages,
            max_completion_tokens: 2000,
            stream: false,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    };

    // Try different models with fallback
    let data;
    try {
      console.log('Trying GPT-5...');
      data = await makeOpenAICall('gpt-5-2025-08-07', 25000);
    } catch (error) {
      console.log('GPT-5 failed, trying GPT-4.1:', error.message);
      try {
        data = await makeOpenAICall('gpt-4.1-2025-04-14', 20000);
      } catch (error2) {
        console.log('GPT-4.1 failed, trying GPT-4o-mini:', error2.message);
        data = await makeOpenAICall('gpt-4o-mini', 15000);
      }
    }

    const aiResponse = data.choices[0].message.content;
    console.log('AI response received, length:', aiResponse.length);

    // Try to extract structured artifacts from response
    let extractedArtifacts = null;
    const jsonMatch = aiResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.type === 'artifact') {
          extractedArtifacts = parsed;
        }
      } catch (e) {
        console.log('Failed to parse JSON artifact:', e.message);
      }
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
        model_used: data.model || 'unknown'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in product-expert-chat:', error);
    
    return new Response(
      JSON.stringify({
        error: error.message,
        details: 'Erro interno do servidor. Tente novamente.'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});