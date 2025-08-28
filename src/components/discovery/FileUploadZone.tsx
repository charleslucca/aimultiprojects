import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { sanitizeFileName, formatFileSize, validateFileType } from "@/utils/fileUtils";

interface FileUploadZoneProps {
  sessionId: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  acceptedTypes?: Record<string, string[]>;
  maxSize?: number;
}

interface UploadedFile {
  id: string;
  name: string;
  originalName: string;
  sanitizedName: string;
  size: number;
  type: string;
  path: string;
  status: 'uploading' | 'completed' | 'error';
  progress: number;
  analysis?: any;
  errorMessage?: string;
}

export const FileUploadZone: React.FC<FileUploadZoneProps> = ({
  sessionId,
  onUploadComplete,
  acceptedTypes = {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'application/msword': ['.doc'],
    'text/plain': ['.txt'],
    'audio/mpeg': ['.mp3'],
    'audio/wav': ['.wav'],
    'audio/mp4': ['.m4a'],
    'video/mp4': ['.mp4']
  },
  maxSize = 25 * 1024 * 1024 // 25MB
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const { toast } = useToast();

  const onDrop = useCallback(async (acceptedFiles: File[], rejectedFiles: any[]) => {
    console.log('Arquivos selecionados:', acceptedFiles);
    console.log('Arquivos rejeitados:', rejectedFiles);

    // Processar arquivos rejeitados
    if (rejectedFiles.length > 0) {
      rejectedFiles.forEach(rejection => {
        const errorMessages = rejection.errors.map((e: any) => e.message).join(', ');
        toast({
          title: "Arquivo rejeitado",
          description: `${rejection.file.name}: ${errorMessages}`,
          variant: "destructive",
        });
      });
    }

    // Validar e preparar arquivos aceitos
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    acceptedFiles.forEach(file => {
      if (!validateFileType(file, acceptedTypes)) {
        invalidFiles.push(file.name);
        return;
      }
      
      const sanitized = sanitizeFileName(file.name);
      if (sanitized !== file.name) {
        console.log(`Arquivo sanitizado: ${file.name} -> ${sanitized}`);
      }
      
      validFiles.push(file);
    });

    // Notificar sobre arquivos inválidos
    if (invalidFiles.length > 0) {
      toast({
        title: "Arquivos não suportados",
        description: `Os seguintes arquivos não são suportados: ${invalidFiles.join(', ')}`,
        variant: "destructive",
      });
    }

    if (validFiles.length === 0) return;

    const newFiles: UploadedFile[] = validFiles.map(file => {
      const sanitized = sanitizeFileName(file.name);
      return {
        id: `${Date.now()}-${Math.random()}`,
        name: file.name,
        originalName: file.name,
        sanitizedName: sanitized,
        size: file.size,
        type: file.type,
        path: '',
        status: 'uploading',
        progress: 0
      };
    });

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Upload cada arquivo válido
    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const fileData = newFiles[i];

      try {
        // Função para atualizar progresso
        const updateProgress = (progress: number) => {
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileData.id ? { ...f, progress } : f
          ));
        };

        const updateError = (errorMessage: string) => {
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileData.id ? { ...f, status: 'error', errorMessage, progress: 0 } : f
          ));
        };

        // Upload para Supabase Storage usando nome sanitizado
        const fileName = `${sessionId}/${Date.now()}-${fileData.sanitizedName}`;
        
        updateProgress(25);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        updateProgress(50);

        // Salvar informações no banco de dados (manter nome original para exibição)
        const { data: dbData, error: dbError } = await supabase
          .from('session_attachments')
          .insert({
            session_id: sessionId,
            file_name: fileData.originalName, // Nome original para exibição
            file_path: uploadData.path, // Caminho sanitizado no storage
            file_type: file.type,
            uploaded_by: (await supabase.auth.getUser()).data.user?.id
          })
          .select()
          .single();

        if (dbError) throw dbError;

        updateProgress(75);

        // TODO: Chamar Edge Function para análise do arquivo se necessário
        // Para arquivos de texto/audio, poderia fazer transcrição/análise
        
        updateProgress(100);

        // Marcar como completo
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileData.id 
            ? { ...f, status: 'completed', path: uploadData.path, progress: 100 }
            : f
        ));

        toast({
          title: "Upload concluído",
          description: `${file.name} foi carregado com sucesso.`,
        });

      } catch (error: any) {
        console.error('Erro no upload:', error);
        
        const errorMessage = error.message || 'Erro desconhecido';
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, status: 'error', errorMessage, progress: 0 } : f
        ));

        toast({
          title: "Erro no upload",
          description: `Falha ao carregar ${fileData.originalName}: ${errorMessage}`,
          variant: "destructive",
        });
      }
    }

    // Callback com arquivos completos
    const completedFiles = newFiles.filter(f => f.status === 'completed');
    if (completedFiles.length > 0) {
      onUploadComplete?.(completedFiles);
    }

  }, [sessionId, onUploadComplete, toast, acceptedTypes]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    maxSize,
    multiple: true
  });

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // formatFileSize foi movido para utils/fileUtils.ts

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors duration-200
              ${isDragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
              }
            `}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragActive 
                  ? 'Solte os arquivos aqui...' 
                  : 'Arraste arquivos ou clique para selecionar'
                }
              </p>
              <p className="text-sm text-muted-foreground">
                Suporte para documentos (PDF, Word), áudio (MP3, WAV) e texto. 
                Máximo {Math.round(maxSize / (1024 * 1024))}MB por arquivo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h4 className="font-medium mb-4">Arquivos Carregados</h4>
            <div className="space-y-3">
              {uploadedFiles.map((file) => (
                <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <File className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{file.originalName}</p>
                      <Badge variant={
                        file.status === 'completed' ? 'default' :
                        file.status === 'error' ? 'destructive' : 'secondary'
                      }>
                        {file.status === 'completed' ? 'Completo' :
                         file.status === 'error' ? 'Erro' : 'Enviando'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatFileSize(file.size)}</span>
                      {file.status === 'uploading' && (
                        <>
                          <span>•</span>
                          <span>{file.progress}%</span>
                        </>
                      )}
                      {file.sanitizedName !== file.originalName && (
                        <>
                          <span>•</span>
                          <span className="text-xs">Nome sanitizado</span>
                        </>
                      )}
                    </div>
                    
                    {file.status === 'uploading' && (
                      <Progress value={file.progress} className="mt-2" />
                    )}
                    
                    {file.status === 'error' && file.errorMessage && (
                      <p className="text-xs text-destructive mt-1">{file.errorMessage}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {file.status === 'completed' && (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    )}
                    {file.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      className="p-1 h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};