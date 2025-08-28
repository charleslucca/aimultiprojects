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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcriptionId, audioPath } = await req.json();
    
    console.log('Starting transcription for:', transcriptionId);

    // Get the audio file from storage
    const { data: audioData, error: downloadError } = await supabase.storage
      .from('audio-files')
      .download(audioPath);

    if (downloadError) {
      console.error('Download error:', downloadError);
      throw new Error('Failed to download audio file');
    }

    // Convert blob to FormData for OpenAI
    const formData = new FormData();
    formData.append('file', audioData, 'audio.wav');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');
    formData.append('response_format', 'verbose_json');

    console.log('Sending to OpenAI Whisper...');

    // Call OpenAI Whisper API
    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error('OpenAI transcription error:', errorText);
      throw new Error('Transcription failed');
    }

    const transcriptionResult = await transcriptionResponse.json();
    console.log('Transcription completed, generating summary...');

    // Generate AI summary and insights
    const summaryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Você é um assistente especializado em análise de reuniões. Analise a transcrição fornecida e gere:

1. Um resumo executivo conciso
2. Principais decisões tomadas
3. Itens de ação identificados
4. Participantes mencionados

Retorne no formato JSON:
{
  "summary": "resumo executivo",
  "key_decisions": ["decisão 1", "decisão 2"],
  "action_items": [{"task": "tarefa", "assignee": "responsável", "deadline": "prazo"}],
  "speakers": ["participante 1", "participante 2"],
  "sentiment": "positive/neutral/negative"
}`
          },
          {
            role: 'user',
            content: `Transcrição da reunião:\n\n${transcriptionResult.text}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!summaryResponse.ok) {
      console.error('Summary generation failed');
      throw new Error('Failed to generate summary');
    }

    const summaryResult = await summaryResponse.json();
    let analysisData;
    
    try {
      analysisData = JSON.parse(summaryResult.choices[0].message.content);
    } catch (parseError) {
      console.error('Failed to parse AI analysis:', parseError);
      analysisData = {
        summary: summaryResult.choices[0].message.content,
        key_decisions: [],
        action_items: [],
        speakers: [],
        sentiment: 'neutral'
      };
    }

    console.log('Updating database...');

    // Update the transcription record
    const { error: updateError } = await supabase
      .from('meeting_transcriptions')
      .update({
        transcription_text: transcriptionResult.text,
        ai_summary: analysisData.summary,
        key_decisions: analysisData.key_decisions || [],
        action_items: analysisData.action_items || [],
        speakers: analysisData.speakers || [],
        sentiment_analysis: {
          overall_sentiment: analysisData.sentiment,
          confidence: 0.8
        },
        transcription_quality: transcriptionResult.segments ? 
          transcriptionResult.segments.reduce((acc: number, seg: any) => acc + (seg.no_speech_prob || 0), 0) / transcriptionResult.segments.length : 
          0.9,
        processing_status: 'completed',
        language_detected: transcriptionResult.language || 'pt'
      })
      .eq('id', transcriptionId);

    if (updateError) {
      console.error('Database update error:', updateError);
      throw updateError;
    }

    console.log('Transcription completed successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Transcription completed successfully',
      summary: analysisData.summary
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in transcribe-meeting function:', error);
    
    // Update status to error if we have transcriptionId
    try {
      const { transcriptionId } = await req.json();
      if (transcriptionId) {
        await supabase
          .from('meeting_transcriptions')
          .update({ processing_status: 'error' })
          .eq('id', transcriptionId);
      }
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }

    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});