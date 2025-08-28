import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Mic, MicOff, Play, Pause, Square, Download, Upload, Trash2, Volume2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface EnhancedTranscriptionProps {
  sessionId: string;
  onTranscriptionComplete: (transcription: string) => void;
}

const EnhancedTranscription: React.FC<EnhancedTranscriptionProps> = ({
  sessionId,
  onTranscriptionComplete
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTranscription, setCurrentTranscription] = useState('');
  const [recordings, setRecordings] = useState<any[]>([]);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const recognitionRef = useRef<any>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    // Configurar reconhecimento de voz contínuo
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'pt-BR';
      
      recognitionRef.current.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setCurrentTranscription(prev => prev + finalTranscript);
        }
      };
      
      recognitionRef.current.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast({
            title: "Permissão negada",
            description: "Permita o acesso ao microfone para usar a transcrição.",
            variant: "destructive",
          });
        }
      };
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      
      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const recording = {
          id: Date.now(),
          blob,
          url: URL.createObjectURL(blob),
          duration: recordingTime,
          transcription: currentTranscription,
          timestamp: new Date().toISOString()
        };
        
        setRecordings(prev => [...prev, recording]);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorderRef.current.start(1000); // Capturar dados a cada segundo
      setIsRecording(true);
      setRecordingTime(0);
      setCurrentTranscription('');
      
      // Iniciar transcrição em tempo real
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
      
      // Iniciar timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "Gravação iniciada",
        description: "Fale naturalmente. A transcrição aparecerá em tempo real.",
      });
      
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível acessar o microfone.",
        variant: "destructive",
      });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        if (recognitionRef.current) {
          recognitionRef.current.start();
        }
        intervalRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } else {
        mediaRecorderRef.current.pause();
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }
      setIsPaused(!isPaused);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      setIsRecording(false);
      setIsPaused(false);
      
      toast({
        title: "Gravação finalizada",
        description: "Áudio salvo e transcrição gerada com sucesso.",
      });
    }
  };

  const processTranscription = async (recording: any) => {
    setIsProcessing(true);
    
    try {
      // Simular processamento de IA (aqui você integraria com um serviço real)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const enhancedTranscription = `
📝 **Transcrição Processada:**

${recording.transcription}

🔍 **Insights Extraídos:**
- Principais tópicos discutidos
- Decisões tomadas durante a reunião
- Próximos passos identificados
- Pontos de atenção levantados

📊 **Análise de Sentimento:** Positivo (85%)
👥 **Participantes Identificados:** 2-3 pessoas
⏱️ **Duração:** ${Math.floor(recording.duration / 60)}:${(recording.duration % 60).toString().padStart(2, '0')}
`;
      
      onTranscriptionComplete(enhancedTranscription);
      
      toast({
        title: "Transcrição processada!",
        description: "Insights extraídos e adicionados à conversa.",
      });
      
    } catch (error) {
      console.error('Erro ao processar:', error);
      toast({
        title: "Erro no processamento",
        description: "Não foi possível processar a transcrição.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteRecording = (id: number) => {
    setRecordings(prev => {
      const recording = prev.find(r => r.id === id);
      if (recording?.url) {
        URL.revokeObjectURL(recording.url);
      }
      return prev.filter(r => r.id !== id);
    });
  };

  const downloadRecording = (recording: any) => {
    const a = document.createElement('a');
    a.href = recording.url;
    a.download = `gravacao-${new Date(recording.timestamp).toLocaleString('pt-BR').replace(/[\/\s:]/g, '-')}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Transcrição Inteligente
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controles de Gravação */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-4">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                size="lg"
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Mic className="h-5 w-5 mr-2" />
                Iniciar Gravação
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button
                  onClick={pauseRecording}
                  variant="outline"
                  size="lg"
                >
                  {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                </Button>
                <Button
                  onClick={stopRecording}
                  size="lg"
                  className="bg-gray-600 hover:bg-gray-700"
                >
                  <Square className="h-5 w-5 mr-2" />
                  Parar
                </Button>
              </div>
            )}
          </div>
          
          {isRecording && (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <Badge variant="destructive">
                  GRAVANDO - {formatTime(recordingTime)}
                </Badge>
              </div>
              {isPaused && (
                <Badge variant="secondary">PAUSADO</Badge>
              )}
            </div>
          )}
        </div>

        {/* Transcrição em Tempo Real */}
        {isRecording && currentTranscription && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Transcrição em tempo real:</h4>
            <div className="p-3 bg-gray-50 rounded-lg border max-h-40 overflow-y-auto">
              <p className="text-sm">{currentTranscription}</p>
            </div>
          </div>
        )}

        {/* Lista de Gravações */}
        {recordings.length > 0 && (
          <div className="space-y-4">
            <Separator />
            <h4 className="font-medium">Gravações ({recordings.length})</h4>
            
            <div className="space-y-3">
              {recordings.map((recording) => (
                <div key={recording.id} className="p-3 border rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        {new Date(recording.timestamp).toLocaleString('pt-BR')}
                      </span>
                      <Badge variant="outline">{formatTime(recording.duration)}</Badge>
                    </div>
                    
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => downloadRecording(recording)}
                      >
                        <Download className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => processTranscription(recording)}
                        disabled={isProcessing}
                      >
                        <Upload className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteRecording(recording.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Player de Áudio */}
                  <audio controls className="w-full">
                    <source src={recording.url} type="audio/webm" />
                  </audio>
                  
                  {/* Preview da Transcrição */}
                  {recording.transcription && (
                    <div className="text-xs text-muted-foreground bg-gray-50 p-2 rounded">
                      <strong>Transcrição:</strong> {recording.transcription.substring(0, 150)}
                      {recording.transcription.length > 150 && '...'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instruções */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 <strong>Dicas:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-4">
            <li>Fale claramente e em ritmo normal</li>
            <li>A transcrição aparece em tempo real</li>
            <li>Use "Processar" para extrair insights com IA</li>
            <li>Funciona melhor em ambientes silenciosos</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default EnhancedTranscription;