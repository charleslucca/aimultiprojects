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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const chatId = formData.get('chatId') as string;
    const message = formData.get('message') as string || 'Analise este arquivo e extraia as informações mais importantes.';

    if (!file || !chatId) {
      throw new Error('File and chatId are required');
    }

    console.log(`Direct processing file: ${file.name} (${file.type}, ${file.size} bytes)`);

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
        name: 'File Analysis Assistant',
        instructions: `Você é um especialista em análise de arquivos para projetos digitais. Analise o arquivo fornecido e extraia:
1. Informações principais e conceitos-chave
2. Requisitos ou especificações identificadas
3. Oportunidades de melhoria ou implementação
4. Insights estratégicos relevantes
5. Próximos passos sugeridos

Seja detalhado mas objetivo. Forneça insights práticos e acionáveis.`,
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
    const maxAttempts = 30; // 30 seconds max

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
          openai_file_id: openAIFile.id,
          processing_time: new Date().toISOString()
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
        processingTime: `${attempts}s`
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