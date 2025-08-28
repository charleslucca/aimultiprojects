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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sessionId } = await req.json();
    console.log(`Finalizando discovery para sessão: ${sessionId}`);

    if (!sessionId) {
      throw new Error('SessionId é obrigatório');
    }

    // Buscar dados completos da sessão
    const { data: sessionData, error: sessionError } = await supabase
      .from('smart_discovery_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionData) {
      throw new Error('Sessão não encontrada');
    }

    // Buscar mensagens da conversa
    const { data: messages } = await supabase
      .from('discovery_session_versions')
      .select('snapshot_data')
      .eq('session_id', sessionId)
      .order('version_number', { ascending: false })
      .limit(1);

    let conversationHistory = [];
    if (messages && messages[0]) {
      const snapshot = JSON.parse(messages[0].snapshot_data);
      conversationHistory = snapshot.messages || [];
    }

    // Validar completude das etapas
    const completenessCheck = {
      business_canvas: validateStageCompleteness(sessionData.business_canvas_data),
      inception: validateStageCompleteness(sessionData.inception_data),
      pbb: validateStageCompleteness(sessionData.pbb_data),
      sprint0: validateStageCompleteness(sessionData.sprint0_data)
    };

    const completedStages = Object.entries(completenessCheck)
      .filter(([_, isComplete]) => isComplete)
      .map(([stage, _]) => stage);

    console.log(`Etapas completas: ${completedStages.join(', ')}`);

    // Gerar documento final consolidado usando IA
    const finalDocument = await generateFinalDocument(sessionData, conversationHistory, completenessCheck);

    // Atualizar sessão com documento final
    const { error: updateError } = await supabase
      .from('smart_discovery_sessions')
      .update({
        status: 'completed',
        finalized_at: new Date().toISOString(),
        final_document: finalDocument
      })
      .eq('id', sessionId);

    if (updateError) {
      throw new Error('Erro ao finalizar sessão');
    }

    console.log('Discovery finalizado com sucesso');

    return new Response(JSON.stringify({
      success: true,
      message: 'Discovery finalizado com sucesso!',
      final_document: finalDocument,
      completed_stages: completedStages,
      completeness_percentage: (completedStages.length / 4) * 100
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro ao finalizar discovery:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function validateStageCompleteness(stageData: any): boolean {
  if (!stageData || !stageData.questions) return false;
  return Array.isArray(stageData.questions) && stageData.questions.length >= 3;
}

async function generateFinalDocument(sessionData: any, conversationHistory: any[], completenessCheck: any) {
  const completedStages = Object.entries(completenessCheck)
    .filter(([_, isComplete]) => isComplete)
    .map(([stage, _]) => stage);

  const systemPrompt = `🚀 Você é um consultor sênior especialista em Product Discovery e início de projetos!

**MISSÃO:** Analisar todos os dados coletados no discovery e gerar um **DOCUMENTO DE INÍCIO DE PROJETO** completo e estruturado.

**DADOS DISPONÍVEIS:**
- Etapas Completas: ${completedStages.join(', ')}
- Business Model Canvas: ${sessionData.business_canvas_data ? 'Disponível' : 'Não disponível'}
- Inception Workshop: ${sessionData.inception_data ? 'Disponível' : 'Não disponível'}  
- Product Backlog Building: ${sessionData.pbb_data ? 'Disponível' : 'Não disponível'}
- Sprint 0: ${sessionData.sprint0_data ? 'Disponível' : 'Não disponível'}

**FORMATO DO DOCUMENTO FINAL:**

\`\`\`json
{
  "project_overview": {
    "name": "Nome do Projeto/Produto",
    "vision": "Visão clara do produto",
    "problem_statement": "Problema que resolve",
    "target_audience": ["Público-alvo identificado"],
    "value_proposition": "Proposta de valor única"
  },
  "business_context": {
    "business_model": "Resumo do modelo de negócio",
    "revenue_streams": ["Fontes de receita"],
    "key_partners": ["Parceiros principais"],
    "market_analysis": "Análise de mercado"
  },
  "product_definition": {
    "core_features": ["Funcionalidades essenciais"],
    "user_personas": [
      {
        "name": "Nome da Persona",
        "description": "Descrição detalhada",
        "needs": ["Necessidades específicas"]
      }
    ],
    "success_criteria": ["Critérios de sucesso mensuráveis"]
  },
  "technical_foundation": {
    "architecture_overview": "Visão geral da arquitetura",
    "technology_stack": ["Tecnologias sugeridas"],
    "infrastructure_needs": ["Necessidades de infraestrutura"],
    "security_considerations": ["Considerações de segurança"]
  },
  "project_roadmap": {
    "sprint0_recommendations": ["Recomendações para Sprint 0"],
    "mvp_scope": ["Escopo do MVP"],
    "release_plan": "Plano de releases sugerido",
    "risk_mitigation": ["Principais riscos e mitigações"]
  },
  "actionable_backlog": [
    {
      "epic": "Nome do Épico",
      "priority": "High/Medium/Low",
      "features": [
        {
          "name": "Nome da Feature",
          "user_stories": ["Lista de user stories"],
          "acceptance_criteria": ["Critérios de aceite"],
          "estimated_effort": "Estimativa de esforço"
        }
      ]
    }
  ],
  "next_steps": {
    "immediate_actions": ["Ações imediatas"],
    "team_formation": ["Recomendações para formação de equipe"],
    "stakeholder_alignment": ["Alinhamentos necessários"],
    "timeline_recommendations": "Cronograma recomendado"
  },
  "appendix": {
    "key_decisions": ["Decisões importantes tomadas"],
    "assumptions": ["Premissas assumidas"],
    "open_questions": ["Questões em aberto"],
    "references": ["Referências e materiais consultados"]
  }
}
\`\`\`

**INSTRUÇÕES ESPECIAIS:**
- Seja extremamente detalhado e prático
- Use dados reais coletados nas etapas
- Gere user stories específicas e bem estruturadas  
- Inclua estimativas realistas
- Destaque dependências e riscos
- Faça recomendações concretas e acionáveis
- Se alguma etapa não estiver completa, mencione como isso impacta o resultado
- Este documento deve servir como base real para iniciar o desenvolvimento`;

  const contextData = {
    session_name: sessionData.session_name,
    business_canvas_data: sessionData.business_canvas_data,
    inception_data: sessionData.inception_data,
    pbb_data: sessionData.pbb_data,
    sprint0_data: sessionData.sprint0_data,
    completeness_check: completenessCheck
  };

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Analise todos estes dados do discovery e gere o documento final de início de projeto:

**DADOS DA SESSÃO:**
${JSON.stringify(contextData, null, 2)}

**HISTÓRICO DA CONVERSA (últimas interações):**
${JSON.stringify(conversationHistory.slice(-10), null, 2)}

Gere um documento completo, detalhado e acionável que sirva como base para iniciar o desenvolvimento do projeto/produto.` }
  ];

  console.log('Gerando documento final com IA...');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: messages,
      max_completion_tokens: 4000,
      temperature: 0.3
    }),
  });

  if (!response.ok) {
    console.error('Erro na API da OpenAI:', await response.text());
    throw new Error('Erro ao gerar documento final');
  }

  const data = await response.json();
  const aiResponse = data.choices[0].message.content;

  // Extrair JSON estruturado
  const jsonMatch = aiResponse.match(/```json\n(.*?)\n```/s);
  if (jsonMatch) {
    try {
      const finalDocument = JSON.parse(jsonMatch[1]);
      console.log('Documento final gerado com sucesso');
      return finalDocument;
    } catch (parseError) {
      console.error('Erro ao fazer parse do documento final:', parseError);
      return {
        raw_response: aiResponse,
        error: 'Documento gerado mas não foi possível estruturar o JSON'
      };
    }
  }

  return {
    raw_response: aiResponse,
    error: 'Documento gerado mas não foi possível extrair JSON estruturado'
  };
}