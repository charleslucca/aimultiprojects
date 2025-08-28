import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Mic,
  Upload,
  Play,
  Pause,
  Square,
  FileAudio,
  Brain,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle
} from "lucide-react";

interface TranscriptionResult {
  id: string;
  meeting_name: string;
  transcription_text: string;
  ai_summary: string;
  action_items: any[];
  key_decisions: any[];
  speakers: any[];
  processing_status: string;
  created_at: string;
}

interface MeetingTranscriptionPluginProps {
  sessionId?: string;
  sessionType?: string;
  projectId?: string;
  clientId?: string | null;
  onTranscriptionComplete?: (data: any) => void;
}

export default function MeetingTranscriptionPlugin({
  sessionId,
  sessionType = 'smart_hub',
  projectId,
  clientId,
  onTranscriptionComplete
}: MeetingTranscriptionPluginProps = {}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [meetingName, setMeetingName] = useState('');
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [transcriptions, setTranscriptions] = useState<TranscriptionResult[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setIsPaused(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível acessar o microfone",
        variant: "destructive"
      });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
    }
  };

  const resumeRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/') || file.type === 'video/mp4') {
        setSelectedFile(file);
        setAudioBlob(file);
      } else {
        toast({
          title: "Arquivo inválido",
          description: "Por favor, selecione um arquivo de áudio ou vídeo",
          variant: "destructive"
        });
      }
    }
  };

  const transcribeAudio = async () => {
    if (!audioBlob || !meetingName.trim() || !user) {
      toast({
        title: "Erro",
        description: "Por favor, forneça um nome para a reunião e grave/selecione um áudio",
        variant: "destructive"
      });
      return;
    }

    setProcessing(true);
    setProgress(20);

    try {
      // Upload audio to Supabase Storage
      const fileName = `meetings/${user.id}/${Date.now()}_${meetingName.replace(/[^a-zA-Z0-9]/g, '_')}.wav`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('audio-files')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;
      setProgress(40);

      // Create meeting transcription record
      const transcriptionRecord = {
        meeting_name: meetingName,
        audio_file_path: fileName,
        session_type: sessionType,
        created_by: user.id,
        processing_status: 'processing',
        ...(sessionId && { session_id: sessionId }),
        ...(projectId && { project_id: projectId }),
        ...(clientId && { client_id: clientId })
      };

      const { data: transcriptionData, error: insertError } = await supabase
        .from('meeting_transcriptions' as any)
        .insert(transcriptionRecord)
        .select()
        .single();

      if (insertError) throw insertError;
      setProgress(60);

      // Call transcription Edge Function
      const { data: functionData, error: functionError } = await supabase.functions.invoke('transcribe-meeting', {
        body: {
          transcriptionId: (transcriptionData as any)?.id,
          audioPath: fileName
        }
      });

      if (functionError) throw functionError;
      setProgress(100);

      toast({
        title: "Sucesso",
        description: "Transcrição iniciada! O processamento será concluído em breve.",
      });

      // Call completion callback if provided
      if (onTranscriptionComplete && transcriptionData) {
        onTranscriptionComplete({
          transcriptionId: (transcriptionData as any)?.id,
          meetingName,
          sessionId,
          status: 'processing'
        });
      }

      // Reset form
      setAudioBlob(null);
      setSelectedFile(null);
      setMeetingName('');
      loadTranscriptions();
      
    } catch (error: any) {
      console.error('Transcription error:', error);
      toast({
        title: "Erro na transcrição",
        description: error.message || "Erro ao processar áudio",
        variant: "destructive"
      });
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  const loadTranscriptions = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('meeting_transcriptions' as any)
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data && Array.isArray(data)) {
      setTranscriptions(data as unknown as TranscriptionResult[]);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'processing':
        return <Clock className="h-4 w-4 text-primary animate-spin" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Plugin de Transcrição de Reuniões
          </CardTitle>
          <CardDescription>
            Grave ou faça upload de áudio para transcrição automática com IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Meeting Name Input */}
          <div>
            <label className="text-sm font-medium mb-2 block">Nome da Reunião</label>
            <Textarea
              placeholder="Ex: Daily Scrum - 15/01/2024"
              value={meetingName}
              onChange={(e) => setMeetingName(e.target.value)}
              rows={2}
            />
          </div>

          {/* Recording Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Mic className="h-4 w-4" />
                Gravação ao Vivo
              </h4>
              <div className="flex gap-2">
                {!isRecording ? (
                  <Button onClick={startRecording} className="flex-1">
                    <Mic className="h-4 w-4 mr-2" />
                    Iniciar Gravação
                  </Button>
                ) : (
                  <>
                    {!isPaused ? (
                      <Button variant="outline" onClick={pauseRecording}>
                        <Pause className="h-4 w-4 mr-2" />
                        Pausar
                      </Button>
                    ) : (
                      <Button variant="outline" onClick={resumeRecording}>
                        <Play className="h-4 w-4 mr-2" />
                        Retomar
                      </Button>
                    )}
                    <Button variant="destructive" onClick={stopRecording}>
                      <Square className="h-4 w-4 mr-2" />
                      Parar
                    </Button>
                  </>
                )}
              </div>
              {isRecording && (
                <div className="flex items-center gap-2 text-sm">
                  <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                  {isPaused ? 'Gravação pausada' : 'Gravando...'}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Upload de Arquivo
              </h4>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <FileAudio className="h-4 w-4 mr-2" />
                Selecionar Arquivo
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/mp4"
                onChange={handleFileSelect}
                className="hidden"
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Arquivo selecionado: {selectedFile.name}
                </p>
              )}
            </div>
          </div>

          {/* Audio Preview */}
          {audioBlob && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Preview do Áudio</label>
              <audio
                controls
                src={URL.createObjectURL(audioBlob)}
                className="w-full"
              />
            </div>
          )}

          {/* Processing */}
          {processing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary animate-pulse" />
                <span className="text-sm font-medium">Processando com IA...</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {/* Submit Button */}
          <Button
            onClick={transcribeAudio}
            disabled={!audioBlob || !meetingName.trim() || processing}
            className="w-full"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            {processing ? 'Processando...' : 'Transcrever com IA'}
          </Button>
        </CardContent>
      </Card>

      {/* Recent Transcriptions */}
      <Card>
        <CardHeader>
          <CardTitle>Transcrições Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {transcriptions.length > 0 ? (
            <div className="space-y-3">
              {transcriptions.map((transcription) => (
                <div
                  key={transcription.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <p className="font-medium">{transcription.meeting_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transcription.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(transcription.processing_status)}
                    <Badge variant={transcription.processing_status === 'completed' ? 'secondary' : 'outline'}>
                      {transcription.processing_status === 'completed' ? 'Concluído' :
                       transcription.processing_status === 'processing' ? 'Processando' :
                       transcription.processing_status === 'error' ? 'Erro' : 'Pendente'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma transcrição ainda</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}