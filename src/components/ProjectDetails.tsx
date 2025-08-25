import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { FileUpload } from '@/components/FileUpload';
import { 
  Calendar, 
  DollarSign, 
  Users, 
  FileText, 
  MessageSquare,
  TrendingUp,
  Clock,
  Plus,
  Send,
  Loader2,
  Bot
} from 'lucide-react';

interface ProjectDetailsProps {
  projectId: string;
  onClose: () => void;
}

interface Comment {
  id: string;
  content: string;
  author_id: string;
  department: string;
  priority: string;
  tags: string[];
  created_at: string;
  ai_analysis?: any;
}

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  category: string;
  uploaded_at: string;
  ai_insights?: any;
}

export const ProjectDetails = ({ projectId, onClose }: ProjectDetailsProps) => {
  const { toast } = useToast();
  const [project, setProject] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  useEffect(() => {
    fetchProjectDetails();
    fetchComments();
    fetchAttachments();
  }, [projectId]);

  const fetchProjectDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      if (error) throw error;
      setProject(data);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar projeto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('project_comments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setComments(data || []);
    } catch (error: any) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttachments = async () => {
    try {
      const { data, error } = await supabase
        .from('project_attachments')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      setAttachments(data || []);
    } catch (error: any) {
      console.error('Error fetching attachments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    setCommentLoading(true);
    try {
      const { error } = await supabase
        .from('project_comments')
        .insert([{
          project_id: projectId,
          content: newComment,
          department: 'general',
          priority: 'medium'
        }]);

      if (error) throw error;

      setNewComment('');
      await fetchComments();
      
      toast({
        title: "Comentário adicionado",
        description: "Seu comentário foi adicionado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar comentário",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCommentLoading(false);
    }
  };

  const generateInsights = async () => {
    try {
      const response = await fetch('https://kfhhfrsqdvdagmtqxcgu.supabase.co/functions/v1/generate-insights', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmaGhmcnNxZHZkYWdtdHF4Y2d1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYxNDk4NjMsImV4cCI6MjA3MTcyNTg2M30.v-obcZOvFWTiFcDnv_As_cJhnNOUPmCprN-WWZJP5Qo',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          organizationId: 'mock-org-id' // This would come from user context
        }),
      });

      const result = await response.json();
      
      toast({
        title: "Insights gerados",
        description: "Novos insights foram gerados com base nos dados do projeto.",
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar insights",
        description: "Não foi possível gerar insights no momento.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!project) {
    return <div className="p-8 text-center">Projeto não encontrado.</div>;
  }

  return (
    <div className="space-y-6">
      {/* Project Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">{project.name}</h2>
          <p className="text-muted-foreground">{project.description}</p>
          <div className="flex gap-2">
            <Badge variant="secondary">{project.status}</Badge>
            {project.budget && (
              <Badge variant="outline">
                <DollarSign className="h-3 w-3 mr-1" />
                R$ {project.budget?.toLocaleString('pt-BR')}
              </Badge>
            )}
          </div>
        </div>
        <Button variant="outline" onClick={onClose}>
          Fechar
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="files">Arquivos</TabsTrigger>
          <TabsTrigger value="comments">Comentários</TabsTrigger>
          <TabsTrigger value="insights">Insights IA</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Data de Início</p>
                    <p className="text-sm text-muted-foreground">
                      {project.start_date ? new Date(project.start_date).toLocaleDateString('pt-BR') : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Prazo</p>
                    <p className="text-sm text-muted-foreground">
                      {project.end_date ? new Date(project.end_date).toLocaleDateString('pt-BR') : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Arquivos</p>
                    <p className="text-sm text-muted-foreground">{attachments.length} arquivo(s)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Progresso do Projeto</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progresso</span>
                  <span>65%</span>
                </div>
                <Progress value={65} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <div className="space-y-4">
            <FileUpload 
              projectId={projectId} 
              onUploadComplete={fetchAttachments}
            />
            
            {attachments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Arquivos do Projeto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {attachments.map((attachment) => (
                      <div key={attachment.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{attachment.file_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(attachment.uploaded_at).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <Badge variant="outline">{attachment.category}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="comments">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Adicionar Comentário</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Textarea
                    placeholder="Adicione seu comentário..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                  />
                  <Button 
                    onClick={handleAddComment} 
                    disabled={commentLoading || !newComment.trim()}
                  >
                    {commentLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Comentário
                  </Button>
                </div>
              </CardContent>
            </Card>

            {comments.length > 0 && (
              <div className="space-y-3">
                {comments.map((comment) => (
                  <Card key={comment.id}>
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex gap-2">
                            <Badge variant="outline">{comment.department}</Badge>
                            <Badge variant="secondary">{comment.priority}</Badge>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        <p>{comment.content}</p>
                        {comment.tags && comment.tags.length > 0 && (
                          <div className="flex gap-1">
                            {comment.tags.map((tag, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="insights">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="h-5 w-5" />
                  Insights de IA
                </CardTitle>
                <CardDescription>
                  Análises automáticas baseadas nos dados do projeto
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Button onClick={generateInsights} className="w-full">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Gerar Novos Insights
                  </Button>
                  
                  <div className="grid gap-4">
                    <Card className="border-l-4 border-l-primary">
                      <CardContent className="p-4">
                        <h4 className="font-medium text-primary mb-2">Progresso do Projeto</h4>
                        <p className="text-sm text-muted-foreground">
                          O projeto está progredindo dentro do cronograma esperado. Com base nos arquivos enviados e comentários, 
                          recomenda-se uma revisão das etapas finais.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-warning">
                      <CardContent className="p-4">
                        <h4 className="font-medium text-warning mb-2">Riscos Identificados</h4>
                        <p className="text-sm text-muted-foreground">
                          Atenção ao orçamento: os custos atuais podem exceder 15% do planejado se não houver controle rigoroso.
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-success">
                      <CardContent className="p-4">
                        <h4 className="font-medium text-success mb-2">Oportunidades</h4>
                        <p className="text-sm text-muted-foreground">
                          Há potencial para finalizar o projeto 10% antes do prazo se a equipe mantiver o ritmo atual.
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};