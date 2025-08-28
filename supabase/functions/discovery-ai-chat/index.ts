import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl!, supabaseServiceRoleKey!);

// Função para buscar prompt personalizado ou usar padrão
async function getCustomPrompt(methodology: string): Promise<string> {
  console.log(`Buscando prompt personalizado para: ${methodology}`);
  
  const { data: customPrompt, error } = await supabase
    .from('custom_prompt_templates')
    .select('prompt_content')
    .eq('scope_type', 'global')
    .eq('prompt_category', 'discovery')
    .eq('template_name', methodology)
    .eq('is_active', true)
    .order('version_number', { ascending: false })
    .maybeSingle();

  if (customPrompt?.prompt_content) {
    console.log('Usando prompt personalizado encontrado');
    return customPrompt.prompt_content;
  }

  // Fallback para prompts padrão
  const defaultPrompts: Record<string, string> = {
    'Business Model Canvas': `Você é um especialista em Business Model Canvas. Seu objetivo é gerar perguntas estruturadas para uma reunião de descoberta sobre o modelo de negócio.

Baseado nas informações coletadas até agora, gere 3-5 perguntas específicas que devem ser feitas em uma reunião para preencher o Business Model Canvas. 

Formato de resposta:
\`\`\`json
{
  "questions": [
    {
      "category": "proposta_valor",
      "question": "Pergunta específica",
      "context": "Por que esta pergunta é importante"
    }
  ],
  "next_steps": "Próximos passos sugeridos",
  "meeting_format": "Como conduzir a reunião"
}
\`\`\``,

    'Inception Workshop': `Você é um facilitador experiente de Inception Workshops. Seu objetivo é gerar perguntas para uma reunião de inception que defina claramente o produto.

Gere perguntas específicas para uma reunião de inception focando em visão do produto, objetivos, personas e funcionalidades essenciais.

Retorne no formato JSON com perguntas categorizadas.`,

    'Product Backlog Building': `Você é um Product Owner experiente. Seu objetivo é gerar perguntas para uma reunião de construção de backlog priorizado.

Gere perguntas específicas para uma reunião de PBB focando em épicos, funcionalidades, critérios de priorização e estimativas.

Retorne no formato JSON com perguntas categorizadas.`,

    'Sprint 0': `Você é um Scrum Master experiente. Seu objetivo é gerar perguntas para uma reunião de Sprint 0 que prepare a equipe para o desenvolvimento.

Gere perguntas específicas para uma reunião de Sprint 0 focando em configuração do ambiente, definição de ferramentas, padrões de código e processos.

Retorne no formato JSON com perguntas categorizadas.`
  };

  console.log('Usando prompt padrão');
  return defaultPrompts[methodology] || defaultPrompts['Business Model Canvas'];
}

serve(async (req) => {
  console.log(`${new Date().toISOString()} - Request received: ${req.method}`);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, message, currentStage, conversationHistory = [] } = await req.json();
    console.log(`Processing request for session: ${sessionId}, stage: ${currentStage}`);

    if (!sessionId || !message) {
      throw new Error('SessionId e message são obrigatórios');
    }

    // Buscar dados completos da sessão para contexto
    const { data: sessionData, error: sessionError } = await supabase
      .from('smart_discovery_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('Erro ao buscar sessão:', sessionError);
      throw new Error('Sessão não encontrada');
    }

    // Mapear stage atual para metodologia
    const stageToMethodology: Record<string, string> = {
      'business_canvas': 'Business Model Canvas',
      'inception': 'Inception Workshop', 
      'pbb': 'Product Backlog Building',
      'sprint0': 'Sprint 0'
    };

    const methodology = stageToMethodology[currentStage] || 'Business Model Canvas';
    
    // Buscar prompt personalizado
    const systemPrompt = await getCustomPrompt(methodology);
    
    // Preparar contexto estruturado da sessão
    const sessionContext = {
      session_name: sessionData.session_name,
      current_stage: sessionData.current_stage,
      business_canvas_data: sessionData.business_canvas_data || {},
      inception_data: sessionData.inception_data || {},
      pbb_data: sessionData.pbb_data || {},
      sprint0_data: sessionData.sprint0_data || {}
    };

    // Substituir placeholders no prompt
    const contextualizedPrompt = systemPrompt
      .replace('{session_context}', JSON.stringify(sessionContext, null, 2))
      .replace('{conversation_history}', JSON.stringify(conversationHistory.slice(-10), null, 2));

    // Preparar mensagens para OpenAI (sem limite de 6 mensagens)
    const messages = [
      { role: 'system', content: contextualizedPrompt },
      ...conversationHistory.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    console.log(`Enviando ${messages.length} mensagens para OpenAI`);

    // Chamar OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Erro da OpenAI:', errorData);
      throw new Error(`Erro da OpenAI: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Resposta da IA recebida, extraindo dados estruturados...');

    // Extrair dados estruturados da resposta
    let extractedData = null;
    const jsonMatch = aiResponse.match(/```json\n(.*?)\n```/s);
    
    if (jsonMatch) {
      try {
        extractedData = JSON.parse(jsonMatch[1]);
        console.log('Dados estruturados extraídos:', extractedData);
      } catch (parseError) {
        console.log('Erro ao fazer parse do JSON, continuando sem dados estruturados');
      }
    }

    // Salvar dados no campo específico baseado no stage
    if (extractedData) {
      const updateData: any = {};
      
      if (currentStage === 'business_canvas') {
        updateData.business_canvas_data = extractedData;
      } else if (currentStage === 'inception') {
        updateData.inception_data = extractedData;
      } else if (currentStage === 'pbb') {
        updateData.pbb_data = extractedData;
      } else if (currentStage === 'sprint0') {
        updateData.sprint0_data = extractedData;
      }

      if (Object.keys(updateData).length > 0) {
        const { error: updateError } = await supabase
          .from('smart_discovery_sessions')
          .update(updateData)
          .eq('id', sessionId);

        if (updateError) {
          console.error('Erro ao salvar dados estruturados:', updateError);
        } else {
          console.log('Dados estruturados salvos com sucesso');
        }
      }
    }

    return new Response(JSON.stringify({
      response: aiResponse,
      extractedData,
      sessionContext
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no processamento:', error);
    return new Response(JSON.stringify({
      error: error.message,
      details: 'Erro interno do servidor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});