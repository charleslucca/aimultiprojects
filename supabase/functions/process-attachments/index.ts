import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileId, filePath, fileType } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Processing file: ${filePath} (${fileType})`);

    // Update status to processing
    await supabase
      .from('smart_hub_uploads')
      .update({ processing_status: 'processing' })
      .eq('id', fileId);

    let transcription = null;
    let extractedContent = null;

    try {
      // Handle different file types
      if (fileType.startsWith('audio/') || fileType.startsWith('video/')) {
        // Download file from storage
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('smart-hub-files')
          .download(filePath);

        if (downloadError) throw downloadError;

        // Convert to base64 for OpenAI Whisper
        const arrayBuffer = await fileData.arrayBuffer();
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        // Transcribe with OpenAI Whisper
        const formData = new FormData();
        const blob = new Blob([arrayBuffer], { type: fileType });
        formData.append('file', blob, 'audio.webm');
        formData.append('model', 'whisper-1');
        formData.append('language', 'pt');

        const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
          },
          body: formData,
        });

        if (!whisperResponse.ok) {
          throw new Error(`Whisper API error: ${await whisperResponse.text()}`);
        }

        const whisperResult = await whisperResponse.json();
        transcription = whisperResult.text;

      } else if (fileType === 'text/plain') {
        // Handle text files
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('smart-hub-files')
          .download(filePath);

        if (downloadError) throw downloadError;

        extractedContent = await fileData.text();

      } else if (fileType === 'application/pdf') {
        // For now, just mark as processed - PDF extraction would need additional libraries
        extractedContent = 'PDF processing not yet implemented - manual review required';

      } else if (fileType.startsWith('image/')) {
        // Use OpenAI Vision API for image analysis
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('smart-hub-files')
          .download(filePath);

        if (downloadError) throw downloadError;

        const arrayBuffer = await fileData.arrayBuffer();
        const base64Image = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        const visionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: 'Analise esta imagem e extraia todo o texto e informações relevantes para projetos digitais. Se houver diagramas, fluxos ou wireframes, descreva-os detalhadamente.'
                  },
                  {
                    type: 'image_url',
                    image_url: {
                      url: `data:${fileType};base64,${base64Image}`
                    }
                  }
                ]
              }
            ],
            max_tokens: 1000
          }),
        });

        if (visionResponse.ok) {
          const visionResult = await visionResponse.json();
          extractedContent = visionResult.choices[0].message.content;
        }
      }

      // Update file with results
      const updateData: any = {
        processing_status: 'completed',
        updated_at: new Date().toISOString()
      };

      if (transcription) {
        updateData.transcription = transcription;
      }
      if (extractedContent) {
        updateData.ai_analysis = { extracted_content: extractedContent };
      }

      await supabase
        .from('smart_hub_uploads')
        .update(updateData)
        .eq('id', fileId);

      console.log(`Successfully processed file: ${filePath}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          transcription,
          extractedContent 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (processingError) {
      console.error('Processing error:', processingError);
      
      // Update status to error
      await supabase
        .from('smart_hub_uploads')
        .update({ 
          processing_status: 'error',
          ai_analysis: { error: processingError.message }
        })
        .eq('id', fileId);

      throw processingError;
    }

  } catch (error) {
    console.error('Error in process-attachments:', error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});