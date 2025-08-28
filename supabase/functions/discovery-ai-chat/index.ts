import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const STAGE_PROMPTS = {
  business_canvas: `Você é um consultor especialista em Business Model Canvas. Sua missão é ajudar o usuário a definir o modelo de negócio do projeto.

Pergunte sobre:
- Proposta de valor única
- Segmentos de clientes-alvo
- Canais de distribuição
- Relacionamento com clientes
- Fontes de receita
- Recursos principais
- Atividades-chave
- Parcerias estratégicas
- Estrutura de custos

Quando tiver informações suficientes, sugira avançar para a próxima etapa (Inception Workshop).`,

  inception: `Você é um facilitador de Inception Workshop. Ajude a definir a visão e objetivos do projeto.

Explore:
- Visão do produto (elevator pitch)
- Objetivos do negócio
- Personas dos usuários
- Funcionalidades principais (épicos)
- Restrições e premissas
- Riscos identificados
- Critérios de sucesso

Quando a visão estiver clara, sugira passar para Product Backlog Building.`,

  pbb: `Você é um Product Owner experiente. Ajude a construir o Product Backlog inicial.

Identifique:
- User Stories principais
- Critérios de aceitação básicos
- Priorização por valor/impacto
- Estimativas iniciais
- Dependências entre histórias
- MVP (Minimum Viable Product)

Gere histórias no formato: "Como [persona], eu quero [funcionalidade] para [benefício]"

Quando o backlog inicial estiver definido, sugira avançar para Sprint 0.`,

  sprint0: `Você é um Scrum Master experiente. Ajude a planejar o Sprint 0.

Defina:
- Definição de Pronto (DoD)
- Definição de Feito (DoR)
- Cerimônias do time
- Estimativas detalhadas
- Arquitetura inicial
- Setup do ambiente
- Padrões de desenvolvimento
- Plano de release inicial

Quando o Sprint 0 estiver planejado, a descoberta estará completa!`
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId, message, currentStage, conversationHistory } = await req.json();
    
    console.log(`Processing message for session ${sessionId}, stage: ${currentStage}`);

    // Get current session data
    const { data: sessionData, error: sessionError } = await supabase
      .from('smart_discovery_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError) {
      console.error('Session error:', sessionError);
      throw new Error('Session not found');
    }

    // Build conversation context
    const conversationContext = conversationHistory
      .slice(-6) // Last 6 messages for context
      .map((msg: ConversationMessage) => ({
        role: msg.role,
        content: msg.content
      }));

    // Determine if we should advance to next stage
    const shouldAdvanceStage = message.toLowerCase().includes('próxima') || 
                              message.toLowerCase().includes('avançar') ||
                              message.toLowerCase().includes('continuar');

    let newStage = currentStage;
    let stageChanged = false;
    
    if (shouldAdvanceStage) {
      const stageOrder = ['business_canvas', 'inception', 'pbb', 'sprint0'];
      const currentIndex = stageOrder.indexOf(currentStage);
      if (currentIndex < stageOrder.length - 1) {
        newStage = stageOrder[currentIndex + 1];
        stageChanged = true;
      }
    }

    // Prepare AI prompt
    const systemPrompt = STAGE_PROMPTS[newStage as keyof typeof STAGE_PROMPTS] + `

Dados da sessão atual:
- Business Canvas: ${JSON.stringify(sessionData.business_canvas_data || {})}
- Inception: ${JSON.stringify(sessionData.inception_data || {})}
- PBB: ${JSON.stringify(sessionData.pbb_data || {})}
- Sprint 0: ${JSON.stringify(sessionData.sprint0_data || {})}

Seja conversacional, faça perguntas específicas e guie o usuário através da metodologia.
Se o usuário fornecer informações importantes, sugira estruturá-las e confirme antes de avançar.
Mantenha o foco na etapa atual mas considere o contexto das etapas anteriores.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationContext,
      { role: 'user', content: message }
    ];

    console.log('Calling OpenAI...');

    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 800,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI error:', errorText);
      throw new Error('AI response failed');
    }

    const aiResponse = await response.json();
    const assistantMessage = aiResponse.choices[0].message.content;

    // Extract structured data if the AI suggests it
    let extractedData: any = {};
    
    // Simple extraction based on stage and content
    if (newStage === 'business_canvas' && (assistantMessage.includes('Canvas') || assistantMessage.includes('modelo'))) {
      // Try to extract business canvas data
      extractedData.businessCanvas = sessionData.business_canvas_data || {};
    } else if (newStage === 'inception' && (assistantMessage.includes('visão') || assistantMessage.includes('objetivo'))) {
      extractedData.inceptionData = sessionData.inception_data || {};
    } else if (newStage === 'pbb' && (assistantMessage.includes('história') || assistantMessage.includes('backlog'))) {
      extractedData.pbbData = sessionData.pbb_data || {};
      // Generate some sample user stories if backlog is mentioned
      if (assistantMessage.toLowerCase().includes('backlog') && !sessionData.generated_backlog?.length) {
        extractedData.backlog = [
          {
            id: 1,
            title: "Cadastro de usuário",
            description: "Como usuário, eu quero me cadastrar na plataforma para acessar as funcionalidades",
            priority: "Alta",
            estimate: "5 pontos"
          }
        ];
      }
    } else if (newStage === 'sprint0') {
      extractedData.sprint0Data = sessionData.sprint0_data || {};
    }

    // Update session in database if stage changed or data extracted
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (stageChanged) {
      updateData.current_stage = newStage;
    }

    if (extractedData.businessCanvas) {
      updateData.business_canvas_data = { ...sessionData.business_canvas_data, ...extractedData.businessCanvas };
    }
    if (extractedData.inceptionData) {
      updateData.inception_data = { ...sessionData.inception_data, ...extractedData.inceptionData };
    }
    if (extractedData.pbbData) {
      updateData.pbb_data = { ...sessionData.pbb_data, ...extractedData.pbbData };
    }
    if (extractedData.sprint0Data) {
      updateData.sprint0_data = { ...sessionData.sprint0_data, ...extractedData.sprint0Data };
    }
    if (extractedData.backlog) {
      updateData.generated_backlog = extractedData.backlog;
    }

    // Mark as completed if we're done with sprint0
    if (newStage === 'sprint0' && assistantMessage.toLowerCase().includes('completa')) {
      updateData.status = 'completed';
    }

    const { error: updateError } = await supabase
      .from('smart_discovery_sessions')
      .update(updateData)
      .eq('id', sessionId);

    if (updateError) {
      console.error('Session update error:', updateError);
    }

    console.log('Discovery AI chat completed successfully');

    return new Response(JSON.stringify({
      response: assistantMessage,
      stageChanged,
      newStage: stageChanged ? newStage : currentStage,
      stageData: extractedData,
      ...extractedData
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in discovery-ai-chat function:', error);
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      response: 'Desculpe, houve um erro ao processar sua mensagem. Tente novamente.'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});