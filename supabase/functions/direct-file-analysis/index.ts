import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Advanced system prompt for complete analysis
const EXPERT_SYSTEM_PROMPT = `Você é um especialista sênior em produtos e projetos digitais com mais de 15 anos de experiência. Sua especialidade é analisar requisitos, extrair personas, definir escopos e gerar artefatos profissionais.

SUAS CAPACIDADES:
1. **Análise de Documentos**: Extrai informações valiosas de qualquer tipo de arquivo
2. **Definição de Personas**: Cria personas detalhadas baseadas em dados reais  
3. **Levantamento de Requisitos**: Identifica requisitos funcionais e não-funcionais
4. **Business Model Canvas**: Gera BMC completo e estruturado
5. **Product Backlog**: Cria User Stories com Definition of Done
6. **Escopo de Entrega**: Memorial descritivo para contratos

COMPORTAMENTO COM ARQUIVOS:
Quando analisar arquivos, você DEVE automaticamente:
1. **Responder conversacionalmente** explicando o que encontrou
2. **Extrair automaticamente** personas, requisitos e insights
3. **Gerar artefatos estruturados** quando apropriado
4. **Sugerir próximos passos** de forma natural

FORMATO DE RESPOSTA OBRIGATÓRIO:
1. **SEMPRE responda de forma conversacional primeiro** - explique o que analisou
2. **SEMPRE gere artefatos estruturados** em JSON quando houver conteúdo:

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

PARA ESTE ARQUIVO ESPECÍFICO, GERE AUTOMATICAMENTE:
- Personas detalhadas (se identificar usuários/stakeholders)
- Requisitos funcionais e não-funcionais completos
- Business Model Canvas (se possível extrair modelo de negócio)
- Product Backlog com User Stories detalhadas
- Memorial Descritivo/Escopo de Entrega para contratos
- Análise de riscos e próximos passos

Seja conversacional mas sempre gere os artefatos estruturados solicitados.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const chatId = formData.get('chatId') as string;
    const message = formData.get('message') as string || `Analise este arquivo em detalhes e gere automaticamente:
1. Personas completas dos usuários/stakeholders identificados
2. Requisitos funcionais e não-funcionais estruturados
3. Business Model Canvas (se aplicável)
4. Product Backlog com User Stories detalhadas 
5. Memorial Descritivo/Escopo de Entrega para contratos
6. Análise de riscos e próximos passos

Seja conversacional na resposta mas sempre inclua os artefatos estruturados em JSON.`;

    const customPrompt = formData.get('customPrompt') as string;
    const finalPrompt = customPrompt || EXPERT_SYSTEM_PROMPT;

    if (!file || !chatId) {
      throw new Error('File and chatId are required');
    }

    console.log(`Direct processing file: ${file.name} (${file.type}, ${file.size} bytes)`);
    console.log(`Using prompt: ${finalPrompt.substring(0, 200)}...`);

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Step 1: Upload directly to OpenAI Files API
    console.log('Uploading file to OpenAI...');
    const fileUploadForm = new FormData();
    fileUploadForm.append('file', file);
    fileUploadForm.append('purpose', 'assistants');

    const uploadResponse = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: fileUploadForm,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('OpenAI file upload error:', errorText);
      throw new Error(`Failed to upload file to OpenAI: ${errorText}`);
    }

    const openAIFile = await uploadResponse.json();
    console.log(`File uploaded to OpenAI with ID: ${openAIFile.id}`);

    // Step 2: Create OpenAI Assistant for file analysis
    const assistantResponse = await fetch('https://api.openai.com/v1/assistants', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        name: 'Expert Product Analysis Assistant',
        instructions: finalPrompt,
        model: 'gpt-4.1-2025-04-14',
        tools: [{ type: 'file_search' }],
        tool_resources: {
          file_search: {
            vector_stores: [{
              file_ids: [openAIFile.id]
            }]
          }
        }
      }),
    });

    if (!assistantResponse.ok) {
      const errorText = await assistantResponse.text();
      console.error('Assistant creation error:', errorText);
      throw new Error(`Failed to create assistant: ${errorText}`);
    }

    const assistant = await assistantResponse.json();
    console.log(`Assistant created with ID: ${assistant.id}`);

    // Step 3: Create thread and run
    const threadResponse = await fetch('https://api.openai.com/v1/threads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        messages: [{
          role: 'user',
          content: message
        }]
      }),
    });

    const thread = await threadResponse.json();
    console.log(`Thread created with ID: ${thread.id}`);

    // Step 4: Run the assistant
    const runResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      },
      body: JSON.stringify({
        assistant_id: assistant.id,
        max_completion_tokens: 1000
      }),
    });

    const run = await runResponse.json();
    console.log(`Run started with ID: ${run.id}`);

    // Step 5: Poll for completion (with timeout)
    let runStatus = run;
    let attempts = 0;
    const maxAttempts = 40; // 40 seconds max for complex analysis

    while (runStatus.status === 'queued' || runStatus.status === 'in_progress') {
      if (attempts >= maxAttempts) {
        throw new Error('Analysis timeout - please try again');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/runs/${run.id}`, {
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'OpenAI-Beta': 'assistants=v2'
        },
      });

      runStatus = await statusResponse.json();
      attempts++;
      console.log(`Run status: ${runStatus.status} (attempt ${attempts})`);
    }

    if (runStatus.status !== 'completed') {
      throw new Error(`Analysis failed with status: ${runStatus.status}`);
    }

    // Step 6: Get the response
    const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${thread.id}/messages`, {
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'OpenAI-Beta': 'assistants=v2'
      },
    });

    const messages = await messagesResponse.json();
    const analysisResult = messages.data[0].content[0].text.value;

    console.log(`Analysis completed successfully (${analysisResult.length} chars)`);

    // Extract structured artifacts from response
    let extractedArtifacts = null;
    const jsonMatches = analysisResult.matchAll(/```json\s*(\{[\s\S]*?\})\s*```/g);
    
    const artifacts = [];
    for (const match of jsonMatches) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed.type === 'artifact') {
          artifacts.push(parsed);
        }
      } catch (e) {
        console.log('Failed to parse JSON artifact:', e.message);
      }
    }
    
    if (artifacts.length > 0) {
      extractedArtifacts = artifacts.length === 1 ? artifacts[0] : artifacts;
    }

    // Step 7: Save to database
    const { error: dbError } = await supabase
      .from('smart_hub_uploads')
      .insert({
        session_id: chatId,
        filename: file.name,
        file_type: file.type,
        file_size: file.size,
        file_path: `openai://${openAIFile.id}`,
        processing_status: 'completed',
        ai_analysis: {
          extracted_content: analysisResult,
          artifacts: extractedArtifacts,
          openai_file_id: openAIFile.id,
          processing_time: new Date().toISOString(),
          prompt_used: finalPrompt.substring(0, 500) + '...'
        }
      });

    if (dbError) {
      console.error('Database save error:', dbError);
      // Don't throw - analysis succeeded, just logging failed
    }

    // Step 8: Cleanup (background)
    EdgeRuntime.waitUntil((async () => {
      try {
        // Delete OpenAI file after processing
        await fetch(`https://api.openai.com/v1/files/${openAIFile.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
          },
        });
        
        // Delete assistant
        await fetch(`https://api.openai.com/v1/assistants/${assistant.id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'OpenAI-Beta': 'assistants=v2'
          },
        });
        
        console.log('Cleanup completed');
      } catch (cleanupError) {
        console.error('Cleanup error:', cleanupError);
      }
    })());

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis: analysisResult,
        artifacts: extractedArtifacts,
        processingTime: `${attempts}s`,
        prompt_used: finalPrompt
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Direct file analysis error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: 'direct_analysis_error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});