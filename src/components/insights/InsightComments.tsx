import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, User, Calendar, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface InsightCommentsProps {
  projectId: string;
  clientId?: string;
}

const INSIGHT_ORIGINS = [
  { value: 'CSM', label: 'CSM' },
  { value: 'SALES', label: 'Vendas' },
  { value: 'BRAINSTORM', label: 'Brainstorm' },
  { value: '1:1', label: '1:1' },
  { value: 'RETROSPECTIVE', label: 'Retrospectiva' },
  { value: 'OTHER', label: 'Outros' }
];

interface Comment {
  id: string;
  content: string;
  insight_origin: string;
  created_at: string;
  processed: boolean;
  ai_analysis?: any;
  created_by?: string;
}

export const InsightComments = ({ projectId, clientId }: InsightCommentsProps) => {
  const [comment, setComment] = useState('');
  const [origin, setOrigin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    loadComments();
  }, [projectId]);

  const loadComments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('project_insights_comments')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      toast({
        title: 'Erro ao carregar comentários',
        description: 'Não foi possível carregar os comentários',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const submitComment = async () => {
    if (!comment.trim() || !origin) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o comentário e selecione a origem',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabase
        .from('project_insights_comments')
        .insert({
          project_id: projectId,
          client_id: clientId,
          content: comment,
          insight_origin: origin,
          insight_type: 'external',
          created_by: user.id
        });

      if (error) throw error;

      // Trigger AI analysis
      try {
        await supabase.functions.invoke('analyze-comments', {
          body: { projectId, clientId }
        });
      } catch (aiError) {
        console.log('AI analysis will be processed later:', aiError);
      }

      toast({
        title: 'Comentário adicionado',
        description: 'O comentário foi salvo e será analisado pela IA',
      });

      setComment('');
      setOrigin('');
      loadComments();
    } catch (error) {
      toast({
        title: 'Erro ao salvar comentário',
        description: 'Não foi possível salvar o comentário',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getOriginBadgeColor = (origin: string) => {
    const colors: Record<string, string> = {
      'CSM': 'bg-blue-100 text-blue-800 border-blue-200',
      'SALES': 'bg-green-100 text-green-800 border-green-200',
      'BRAINSTORM': 'bg-purple-100 text-purple-800 border-purple-200',
      '1:1': 'bg-orange-100 text-orange-800 border-orange-200',
      'RETROSPECTIVE': 'bg-pink-100 text-pink-800 border-pink-200',
      'OTHER': 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[origin] || colors['OTHER'];
  };

  return (
    <div className="space-y-6">
      {/* Formulário para novo comentário */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Adicionar Insight Manual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Origem do Insight *
            </label>
            <Select value={origin} onValueChange={setOrigin}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a origem..." />
              </SelectTrigger>
              <SelectContent>
                {INSIGHT_ORIGINS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium text-muted-foreground mb-2 block">
              Comentário/Insight *
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Descreva o insight, observação ou comentário importante sobre o projeto..."
              rows={4}
            />
          </div>

          <Button 
            onClick={submitComment}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Salvando...' : 'Adicionar Insight'}
          </Button>
        </CardContent>
      </Card>

      {/* Lista de comentários */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <User className="h-5 w-5" />
          Insights Manuais ({comments.length})
        </h3>
        
        {loading ? (
          <Card>
            <CardContent className="py-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Carregando comentários...</p>
            </CardContent>
          </Card>
        ) : comments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum insight manual encontrado</p>
              <p className="text-sm">Adicione o primeiro comentário acima</p>
            </CardContent>
          </Card>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge className={getOriginBadgeColor(comment.insight_origin)}>
                      {INSIGHT_ORIGINS.find(o => o.value === comment.insight_origin)?.label || comment.insight_origin}
                    </Badge>
                    {comment.processed && (
                      <Badge variant="outline" className="text-green-600 border-green-200">
                        <Tag className="h-3 w-3 mr-1" />
                        Analisado pela IA
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(comment.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                  </div>
                </div>
                
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">
                  {comment.content}
                </p>
                
                {comment.ai_analysis && (
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">
                      Análise da IA:
                    </h4>
                    <p className="text-sm text-foreground">
                      {comment.ai_analysis.summary || 'Análise em processamento...'}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};