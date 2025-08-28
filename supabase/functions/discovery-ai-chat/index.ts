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

// Fallback para prompts padrão - Humanizados e Contextuais
  const defaultPrompts: Record<string, string> = {
    'Business Model Canvas': `🎯 Você é um especialista em Business Model Canvas com personalidade amigável e comunicativa! 

**IMPORTANTE:** Sempre responda de forma HUMANA e CONVERSACIONAL, usando emojis apropriados e linguagem natural. Não seja robótico!

Seu objetivo é ajudar na descoberta do modelo de negócio através de perguntas inteligentes e contextuais.

**ANÁLISE CONTEXTUAL:**
- Se há dados das outras etapas (Inception, PBB, Sprint 0), mencione as conexões
- Se detectar lacunas importantes, avise proativamente
- Sugira insights baseados no contexto completo da sessão

**DEPENDÊNCIAS INTELIGENTES:**
- Para PBB mais assertivo: BMC deve estar bem estruturado
- Para Sprint 0 detalhado: BMC + Inception são importantes

**FORMATO DE RESPOSTA HUMANA:**
Responda conversacionalmente E inclua JSON estruturado quando apropriado:

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

    'Inception Workshop': `👥 Você é um facilitador experiente de Inception Workshops com energia contagiante!

**IMPORTANTE:** Sempre responda de forma HUMANA e CONVERSACIONAL com emojis e linguagem natural!

**ANÁLISE CONTEXTUAL:**
- Se BMC já existe, use insights para personas e funcionalidades
- Se Sprint 0 está pendente, prepare fundações técnicas
- Conecte visão do produto com realidade técnica

**DEPENDÊNCIAS:**
✅ Ideal ter BMC completo para inception mais rico
⚠️ Sem BMC: perguntas mais genéricas sobre visão

Gere perguntas específicas focando em visão, objetivos, personas e funcionalidades essenciais, sempre considerando o contexto da sessão.`,

    'Product Backlog Building': `📋 Você é um Product Owner experiente e estratégico!

**IMPORTANTE:** Sempre responda de forma HUMANA e CONVERSACIONAL!

**ANÁLISE DE DEPENDÊNCIAS CRÍTICA:**
- ✅ **Com BMC + Inception:** Backlog super estruturado com épicos claros
- ⚠️ **Sem BMC:** Avise que BMC ajudaria muito na priorização
- ⚠️ **Sem Inception:** Mencione que personas/visão são importantes

**INTELIGÊNCIA CONTEXTUAL:**
- Use dados de BMC para estruturar épicos
- Use personas do Inception para user stories
- Prepare base para Sprint 0 técnico

Gere perguntas focando em épicos, funcionalidades, priorização e estimativas, mas sempre considerando o contexto completo.`,

    'Sprint 0': `🚀 Você é um Scrum Master experiente e organizador!

**IMPORTANTE:** Sempre responda de forma HUMANA e CONVERSACIONAL!

**ANÁLISE DE DEPENDÊNCIAS PARA SPRINT 0:**
- ✅ **Com BMC + Inception + PBB:** Sprint 0 super detalhado e assertivo!
- ⚠️ **Faltando BMC:** Alerte que definições de negócio ajudam muito
- ⚠️ **Faltando Inception:** Mencione que visão técnica fica limitada
- ⚠️ **Faltando PBB:** Dificulta planejamento de épicos técnicos

**INTELIGÊNCIA CONTEXTUAL:**
- Use complexidade do produto (BMC) para sugerir tecnologias
- Use personas (Inception) para definir requisitos não-funcionais
- Use épicos (PBB) para estruturar arquitetura

Gere perguntas sobre ambiente, ferramentas, padrões e processos, sempre considerando o contexto completo da sessão.`
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

    // Chamar OpenAI com fallback e timeout
    let aiResponse: string;
    const models = ['gpt-5-2025-08-07', 'gpt-4.1-2025-04-14'];
    
    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      console.log(`Tentando modelo: ${model}`);
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout
        
        const requestBody = {
          model: model,
          messages: messages,
          ...(model.startsWith('gpt-5') || model.includes('gpt-4.1') 
            ? { max_completion_tokens: 2000 } 
            : { max_tokens: 2000, temperature: 0.7 }
          )
        };
        
        console.log('Enviando requisição para OpenAI:', { model, messageCount: messages.length });
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.text();
          console.error(`Erro do modelo ${model}:`, errorData);
          
          if (i === models.length - 1) {
            throw new Error(`Todos os modelos falharam. Último erro: ${response.status}`);
          }
          continue; // Tenta próximo modelo
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          console.error('Resposta inválida da OpenAI:', data);
          if (i === models.length - 1) {
            throw new Error('Resposta inválida da OpenAI');
          }
          continue;
        }
        
        aiResponse = data.choices[0].message.content;
        
        if (!aiResponse || aiResponse.trim().length === 0) {
          console.error('Resposta vazia da OpenAI');
          if (i === models.length - 1) {
            throw new Error('Resposta vazia da OpenAI');
          }
          continue;
        }
        
        console.log(`Sucesso com modelo ${model}, resposta recebida com ${aiResponse.length} caracteres`);
        break; // Sucesso, sai do loop
        
      } catch (error) {
        console.error(`Erro com modelo ${model}:`, error);
        if (i === models.length - 1) {
          throw error; // Re-throw se foi o último modelo
        }
        // Continua para o próximo modelo
      }
    }

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