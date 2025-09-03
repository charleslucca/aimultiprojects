import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

import { useToast } from "@/hooks/use-toast";
import {
  FileUp,
  File,
  Trash2,
  CheckCircle,
  Loader2,
  Mic,
  FileText,
  Image,
  Video,
  Settings,
  Eye,
  Edit3
} from "lucide-react";

interface SmartFileUploadProps {
  sessionId: string;
  sessionType: 'discovery' | 'delivery' | 'chat';
  stageName: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  accept?: string;
  maxFiles?: number;
  maxSize?: number;
  className?: string;
}

interface UploadedFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_path: string;
  transcription?: string;
  ai_analysis?: any;
  processing_status: string;
  created_at: string;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  id: string;
  error?: string;
}

export function SmartFileUpload({
  sessionId,
  sessionType,
  stageName,
  onUploadComplete,
  accept = "audio/*,video/*,image/*,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  maxFiles = 5,
  maxSize = 50 * 1024 * 1024, // 50MB
  className
}: SmartFileUploadProps) {
  // Remove auth dependencies for now
  const user = null; // Remove user dependency
  const { toast } = useToast();
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState<UploadProgress[]>([]);
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [lastUsedPrompt, setLastUsedPrompt] = useState('');
  const [lastResponse, setLastResponse] = useState('');

  const uploadFile = async (file: File): Promise<UploadedFile | null> => {
    if (!user) return null;
    
    // Validate sessionId is a proper UUID
    if (!sessionId || sessionId === 'temp' || sessionId.length !== 36) {
      throw new Error('ID de sessão inválido. Crie uma conversa primeiro.');
    }

    const fileId = crypto.randomUUID();
    const uploadProgress: UploadProgress = {
      file,
      progress: 0,
      status: 'uploading',
      id: fileId
    };
    
    setUploading(prev => [...prev, uploadProgress]);

    // Try Direct OpenAI Analysis first (Fase 1)
    try {
      setUploading(prev => prev.map(up => 
        up.id === fileId ? { ...up, progress: 20, status: 'processing' } : up
      ));

      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatId', sessionId);
      
      const analysisMessage = `Analise este arquivo em detalhes e gere automaticamente:

🎯 **ARTEFATOS OBRIGATÓRIOS:**
1. **Personas Completas** - Perfis detalhados dos usuários/stakeholders
2. **Requisitos Estruturados** - Funcionais e não-funcionais organizados
3. **Business Model Canvas** - Modelo de negócio completo (se aplicável)
4. **Product Backlog** - User Stories com critérios de aceitação
5. **Memorial Descritivo** - Escopo de entrega para contratos
6. **Análise de Riscos** - Identificação e mitigação de riscos
7. **Próximos Passos** - Plano de ação estruturado

📋 **FORMATO ESPERADO:**
- Resposta conversacional explicando os achados
- Artefatos estruturados em JSON para cada item encontrado
- Insights práticos e acionáveis
- Recomendações de implementação

💡 **CONTEXTO:** Este é um projeto digital que precisa de análise completa para definição de escopo, requisitos e planejamento de desenvolvimento.`;
      
      formData.append('message', analysisMessage);
      if (customPrompt.trim()) {
        formData.append('customPrompt', customPrompt);
      }

      console.log('Attempting direct OpenAI analysis...');
      
      const directResponse = await supabase.functions.invoke('direct-file-analysis', {
        body: formData,
      });

      // Handle AI service overload
      if (directResponse.data?.error === 'temporary_overload') {
        const retryAfter = directResponse.data.retry_after || 180;
        throw new Error(`⚠️ Serviço de IA temporariamente sobrecarregado. Tente novamente em ${Math.ceil(retryAfter/60)} minutos.`);
      }

      if (directResponse.error) {
        throw new Error(directResponse.error.message || 'Erro na análise direta');
      }

      if (directResponse.data?.success) {
        console.log('Direct analysis successful!');
        
        // Store debug information
        setLastUsedPrompt(directResponse.data.prompt_used || 'Prompt padrão utilizado');
        setLastResponse(directResponse.data.analysis || '');
        
        setUploading(prev => prev.map(up => 
          up.id === fileId ? { ...up, progress: 100, status: 'completed' } : up
        ));

        // Create a direct result without traditional upload
        const directResult: UploadedFile = {
          id: fileId,
          file_name: file.name,
          file_type: file.type,
          file_size: file.size,
          file_path: 'direct-analysis',
          processing_status: 'completed',
          created_at: new Date().toISOString(),
          ai_analysis: {
            extracted_content: directResponse.data.analysis,
            artifacts: directResponse.data.artifacts,
            processing_time: directResponse.data.processingTime,
            method: 'direct_openai',
            prompt_used: directResponse.data.prompt_used
          }
        };

        setTimeout(() => {
          setUploading(prev => prev.filter(up => up.id !== fileId));
        }, 2000);

        return directResult;
      }
    } catch (directError: any) {
      console.warn('Direct analysis failed:', directError);
      
      // Show user-friendly error message for overloaded service
      if (directError.message?.includes('sobrecarregado')) {
        toast({
          title: "Serviço de IA Sobrecarregado",
          description: directError.message,
          variant: "destructive",
        });
        
        // Mark as error and don't fallback to traditional upload
        setUploading(prev => prev.map(up => 
          up.id === fileId ? { ...up, status: 'error', error: directError.message } : up
        ));
        
        setTimeout(() => {
          setUploading(prev => prev.filter(up => up.id !== fileId));
        }, 5000);
        
        throw directError;
      }
      
      // For other errors, reset to fallback mode
      setUploading(prev => prev.map(up => 
        up.id === fileId ? { ...up, progress: 0, status: 'uploading' } : up
      ));
    }

    // Fallback to traditional upload

    const sanitizedName = file.name
      .replace(/[^a-zA-Z0-9.\-_]/g, '_')
      .replace(/_{2,}/g, '_')
      .toLowerCase();
    const fileName = `${user.id}/${sessionType}/${sessionId}/${stageName}/${fileId}_${sanitizedName}`;

    try {
      // Upload to smart-hub-files bucket
      const { error: uploadError } = await supabase.storage
        .from('smart-hub-files')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setUploading(prev => prev.map(up => 
        up.id === fileId ? { ...up, progress: 50, status: 'processing' } : up
      ));

      // Save to database
      const { data: dbData, error: dbError } = await supabase
        .from('smart_hub_uploads')
        .insert({
          session_id: sessionId,
          session_type: sessionType,
          stage_name: stageName,
          user_id: user.id,
          file_name: file.name,
          file_path: fileName,
          file_type: file.type,
          file_size: file.size,
          processing_status: 'pending'
        })
        .select()
        .single();

      if (dbError) throw dbError;

      setUploading(prev => prev.map(up => 
        up.id === fileId ? { ...up, progress: 75 } : up
      ));

      // Trigger AI processing for supported file types
      const supportedTypes = [
        'text/plain',
        'application/pdf', 
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (file.type.startsWith('audio/') || file.type.startsWith('video/') || 
          file.type.startsWith('image/') || supportedTypes.includes(file.type)) {
        
        try {
          await supabase.functions.invoke('process-attachments', {
            body: {
              fileId: dbData.id,
              filePath: fileName,
              fileType: file.type
            }
          });
        } catch (aiError) {
          console.warn('AI processing failed:', aiError);
        }
      }

      // Complete upload
      setUploading(prev => prev.map(up => 
        up.id === fileId ? { ...up, progress: 100, status: 'completed' } : up
      ));

      setTimeout(() => {
        setUploading(prev => prev.filter(up => up.id !== fileId));
      }, 2000);

      return dbData;

    } catch (error: any) {
      console.error('Upload error:', error);
      
      setUploading(prev => prev.map(up => 
        up.id === fileId ? { ...up, status: 'error', error: error.message } : up
      ));

      setTimeout(() => {
        setUploading(prev => prev.filter(up => up.id !== fileId));
      }, 5000);

      throw error;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    try {
      const uploadPromises = acceptedFiles.slice(0, maxFiles).map(uploadFile);
      const results = await Promise.allSettled(uploadPromises);
      
      const successful = results
        .filter((result): result is PromiseFulfilledResult<UploadedFile> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value);

      const failed = results.filter(result => result.status === 'rejected');

      if (successful.length > 0) {
        setUploadedFiles(prev => [...prev, ...successful]);
        onUploadComplete?.(successful);
        
        toast({
          title: "Upload concluído",
          description: `${successful.length} arquivo(s) enviado(s) com sucesso.`,
        });
      }

      if (failed.length > 0) {
        toast({
          title: "Erro no upload",
          description: `${failed.length} arquivo(s) falharam no upload.`,
          variant: "destructive",
        });
      }

    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [sessionId, sessionType, stageName, user, maxFiles, onUploadComplete, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: accept.split(',').reduce((acc, type) => {
      const trimmedType = type.trim();
      acc[trimmedType] = [];
      return acc;
    }, {} as Record<string, string[]>),
    maxFiles,
    maxSize,
    disabled: uploading.length > 0
  });

  const removeFile = async (fileId: string) => {
    try {
      const file = uploadedFiles.find(f => f.id === fileId);
      if (!file) return;

      // Remove from storage
      const { error: storageError } = await supabase.storage
        .from('smart-hub-files')
        .remove([file.file_path]);

      if (storageError) console.warn('Storage removal failed:', storageError);

      // Remove from database
      const { error: dbError } = await supabase
        .from('smart_hub_uploads')
        .delete()
        .eq('id', fileId);

      if (dbError) throw dbError;

      setUploadedFiles(prev => prev.filter(f => f.id !== fileId));

      toast({
        title: "Arquivo removido",
        description: "Arquivo removido com sucesso.",
      });

    } catch (error: any) {
      toast({
        title: "Erro ao remover arquivo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('audio/')) return Mic;
    if (fileType.startsWith('video/')) return Video;
    if (fileType.startsWith('image/')) return Image;
    return FileText;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className={className}>
      {/* Upload Area */}
      <Card 
        {...getRootProps()} 
        className={`cursor-pointer transition-colors border-2 border-dashed ${
          isDragActive ? 'border-primary bg-primary/5' : 'border-muted'
        } ${uploading.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <CardContent className="p-6 text-center">
          <input {...getInputProps()} />
          <FileUp className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          
          {isDragActive ? (
            <p className="text-primary">Solte os arquivos aqui...</p>
          ) : (
            <div>
              <p className="text-sm font-medium mb-1">
                Clique ou arraste arquivos para fazer upload
              </p>
              <p className="text-xs text-muted-foreground">
                Áudio, vídeo, imagens, PDFs e documentos de texto
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Máximo {maxFiles} arquivo(s), até {formatFileSize(maxSize)} cada
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploading.length > 0 && (
        <div className="space-y-2 mt-4">
          {uploading.map((upload) => {
            const Icon = getFileIcon(upload.file.type);
            
            return (
              <Card key={upload.id} className="p-3">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{upload.file.name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={upload.progress} className="h-1 flex-1" />
                       <span className="text-xs text-muted-foreground">
                        {upload.status === 'uploading' ? 'Enviando...' :
                         upload.status === 'processing' ? 'Análise Direta OpenAI...' :
                         upload.status === 'completed' ? 'Concluído' : 'Erro'}
                       </span>
                    </div>
                    {upload.error && (
                      <p className="text-xs text-destructive mt-1">{upload.error}</p>
                    )}
                  </div>
                  {upload.status === 'uploading' || upload.status === 'processing' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : upload.status === 'completed' ? (
                    <CheckCircle className="h-4 w-4 text-success" />
                  ) : null}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2 mt-4">
          <h4 className="text-sm font-medium">Arquivos Anexados</h4>
          {uploadedFiles.map((file) => {
            const Icon = getFileIcon(file.file_type);
            
            return (
              <Card key={file.id} className="p-3">
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.file_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)}
                      </span>
                      <Badge variant={
                        file.processing_status === 'completed' ? 'default' :
                        file.processing_status === 'processing' ? 'secondary' :
                        file.processing_status === 'error' ? 'destructive' : 'outline'
                      } className="text-xs">
                        {file.processing_status === 'completed' ? 'Processado' :
                         file.processing_status === 'processing' ? 'Processando' :
                         file.processing_status === 'error' ? 'Erro' : 'Pendente'}
                      </Badge>
                    </div>
                    {file.transcription && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        Transcrição: {file.transcription.slice(0, 100)}...
                      </p>
                    )}
                    {file.ai_analysis?.extracted_content && (
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                        <div className="flex items-center gap-1 mb-1">
                          <CheckCircle className="h-3 w-3 text-success" />
                          <span className="font-medium text-success">
                            Análise Completa {file.ai_analysis.method === 'direct_openai' ? '⚡ OpenAI Direto' : ''}
                          </span>
                          {file.ai_analysis.processing_time && (
                            <span className="text-muted-foreground">
                              • {file.ai_analysis.processing_time}
                            </span>
                          )}
                        </div>
                        <p className="line-clamp-2 text-muted-foreground">
                          {file.ai_analysis.extracted_content.slice(0, 150)}...
                        </p>
                        {file.ai_analysis.artifacts && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {Array.isArray(file.ai_analysis.artifacts) ? 
                              file.ai_analysis.artifacts.map((artifact: any, idx: number) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {artifact.artifact_type?.replace(/_/g, ' ') || 'Artefato'}
                                </Badge>
                              )) :
                              <Badge variant="secondary" className="text-xs">
                                {file.ai_analysis.artifacts.artifact_type?.replace(/_/g, ' ') || 'Artefato'}
                              </Badge>
                            }
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(file.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Debug Panel */}
      <div className="mt-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowDebugPanel(!showDebugPanel)}
          className="w-full"
        >
          <Settings className="h-4 w-4 mr-2" />
          {showDebugPanel ? 'Ocultar Painel de Debug' : 'Mostrar Prompt e Debug'}
        </Button>

        {showDebugPanel && (
          <Card className="mt-3">
            <CardContent className="p-4 space-y-4">
              {/* Custom Prompt Editor */}
              <div>
                <Label htmlFor="custom-prompt">Prompt Personalizado (Opcional)</Label>
                <Textarea
                  id="custom-prompt"
                  placeholder="Digite um prompt personalizado para análise de arquivos... (deixe vazio para usar o prompt padrão otimizado)"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={4}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  💡 O prompt padrão já está otimizado para gerar personas, requisitos, BMC, backlog e escopo automaticamente
                </p>
              </div>

              {/* Last Used Prompt Display */}
              {lastUsedPrompt && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4" />
                    <Label>Último Prompt Utilizado</Label>
                  </div>
                  <div className="bg-muted p-3 rounded text-xs font-mono max-h-32 overflow-y-auto">
                    {lastUsedPrompt}
                  </div>
                </div>
              )}

              {/* Last Response Display */}
              {lastResponse && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-4 w-4" />
                    <Label>Última Resposta da IA</Label>
                  </div>
                  <div className="bg-muted p-3 rounded text-xs max-h-32 overflow-y-auto">
                    {lastResponse}
                  </div>
                </div>
              )}
              
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={() => {
                  setCustomPrompt('');
                  setLastUsedPrompt('');
                  setLastResponse('');
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Limpar Debug
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}