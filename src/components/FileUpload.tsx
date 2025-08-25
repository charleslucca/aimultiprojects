import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  projectId: string;
  onUploadComplete?: (files: any[]) => void;
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
}

interface UploadFile {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  id: string;
  error?: string;
}

export const FileUpload = ({ 
  projectId, 
  onUploadComplete,
  accept = {
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt'],
    'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.svg'],
    'video/*': ['.mp4', '.avi', '.mov', '.wmv']
  },
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024 // 50MB
}: FileUploadProps) => {
  const { toast } = useToast();
  const [uploadingFiles, setUploadingFiles] = useState<UploadFile[]>([]);

  const uploadFile = async (file: File): Promise<any> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${projectId}/${fileName}`;

    // Upload to Supabase Storage (bucket would need to be created)
    // For now, we'll simulate the upload and store metadata in project_attachments
    
    const uploadFile: UploadFile = {
      file,
      progress: 0,
      status: 'uploading',
      id: Math.random().toString()
    };

    setUploadingFiles(prev => [...prev, uploadFile]);

    try {
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadingFiles(prev => 
          prev.map(f => f.id === uploadFile.id ? { ...f, progress: i } : f)
        );
      }

      // Store file metadata in database
      const { data, error } = await supabase
        .from('project_attachments')
        .insert([{
          project_id: projectId,
          file_name: file.name,
          file_path: filePath,
          file_type: file.type,
          category: 'document'
        }])
        .select()
        .single();

      if (error) throw error;

      // Update status to completed
      setUploadingFiles(prev => 
        prev.map(f => f.id === uploadFile.id ? { ...f, status: 'completed' as const } : f)
      );

      // Trigger AI analysis after upload
      try {
        await fetch('https://kfhhfrsqdvdagmtqxcgu.supabase.co/functions/v1/analyze-project', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmaGhmcnNxZHZkYWdtdHF4Y2d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNDk4NjMsImV4cCI6MjA3MTcyNTg2M30.v-obcZOvFWTiFcDnv_As_cJhnNOUPmCprN-WWZJP5Qo',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            projectId,
            attachmentId: data.id,
            fileName: file.name,
            fileType: file.type
          }),
        });
      } catch (aiError) {
        console.warn('AI analysis failed:', aiError);
      }

      return data;
    } catch (error: any) {
      setUploadingFiles(prev => 
        prev.map(f => f.id === uploadFile.id ? { 
          ...f, 
          status: 'error' as const, 
          error: error.message 
        } : f)
      );
      throw error;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    try {
      const uploadPromises = acceptedFiles.map(uploadFile);
      const results = await Promise.allSettled(uploadPromises);
      
      const successful = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);

      const failed = results.filter(result => result.status === 'rejected');

      if (successful.length > 0) {
        toast({
          title: "Upload concluído",
          description: `${successful.length} arquivo(s) enviado(s) com sucesso.`,
        });
        onUploadComplete?.(successful);
      }

      if (failed.length > 0) {
        toast({
          title: "Erro no upload",
          description: `${failed.length} arquivo(s) falharam no upload.`,
          variant: "destructive",
        });
      }

      // Clear completed files after 3 seconds
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.status === 'uploading'));
      }, 3000);

    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [projectId, onUploadComplete, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles,
    maxSize,
    multiple: true
  });

  const removeFile = (fileId: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== fileId));
  };

  return (
    <div className="space-y-4">
      <Card 
        {...getRootProps()} 
        className={cn(
          "border-2 border-dashed cursor-pointer transition-colors",
          isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
        )}
      >
        <CardContent className="p-8 text-center">
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {isDragActive ? "Solte os arquivos aqui" : "Arraste arquivos ou clique para enviar"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Suporte para PDF, DOC, DOCX, TXT, imagens e vídeos (até {Math.round(maxSize / 1024 / 1024)}MB)
          </p>
          <Button type="button" variant="outline">
            Selecionar Arquivos
          </Button>
        </CardContent>
      </Card>

      {uploadingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Enviando arquivos:</h4>
          {uploadingFiles.map((uploadFile) => (
            <Card key={uploadFile.id} className="p-4">
              <div className="flex items-center gap-3">
                <File className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {uploadFile.file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {uploadFile.status === 'uploading' && (
                      <Progress value={uploadFile.progress} className="flex-1" />
                    )}
                    {uploadFile.status === 'completed' && (
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-xs">Concluído</span>
                      </div>
                    )}
                    {uploadFile.status === 'error' && (
                      <div className="flex items-center gap-1 text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-xs">{uploadFile.error}</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => removeFile(uploadFile.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};