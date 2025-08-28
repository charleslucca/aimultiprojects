import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FileUploadZoneProps {
  sessionId: string;
  onUploadComplete?: (files: UploadedFile[]) => void;
  acceptedTypes?: Record<string, string[]>;
  maxSize?: number;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  path: string;
  status: 'uploading' | 'completed' | 'error';
  progress: number;
  analysis?: any;
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

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    console.log('Arquivos selecionados:', acceptedFiles);

    const newFiles: UploadedFile[] = acceptedFiles.map(file => ({
      id: `${Date.now()}-${file.name}`,
      name: file.name,
      size: file.size,
      type: file.type,
      path: '',
      status: 'uploading',
      progress: 0
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Upload cada arquivo
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const fileData = newFiles[i];

      try {
        // Simular progresso de upload
        const updateProgress = (progress: number) => {
          setUploadedFiles(prev => prev.map(f => 
            f.id === fileData.id ? { ...f, progress } : f
          ));
        };

        // Upload para Supabase Storage
        const fileName = `${sessionId}/${Date.now()}-${file.name}`;
        
        updateProgress(25);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('project-files')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        updateProgress(50);

        // Salvar informações no banco de dados
        const { data: dbData, error: dbError } = await supabase
          .from('session_attachments')
          .insert({
            session_id: sessionId,
            file_name: file.name,
            file_path: uploadData.path,
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

      } catch (error) {
        console.error('Erro no upload:', error);
        
        setUploadedFiles(prev => prev.map(f => 
          f.id === fileData.id 
            ? { ...f, status: 'error', progress: 0 }
            : f
        ));

        toast({
          title: "Erro no upload",
          description: `Falha ao carregar ${file.name}: ${error.message}`,
          variant: "destructive",
        });
      }
    }

    // Callback com arquivos completos
    const completedFiles = uploadedFiles.filter(f => f.status === 'completed');
    onUploadComplete?.(completedFiles);

  }, [sessionId, onUploadComplete, uploadedFiles, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes,
    maxSize,
    multiple: true
  });

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

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
                      <p className="font-medium truncate">{file.name}</p>
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
                    </div>
                    
                    {file.status === 'uploading' && (
                      <Progress value={file.progress} className="mt-2" />
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