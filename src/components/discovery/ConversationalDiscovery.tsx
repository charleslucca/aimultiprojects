import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Settings, FileText, Download, History, Mic, Users, Target, PlayCircle, Trash2, CheckCircle, FileSpreadsheet } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ChatInterface } from './ChatInterface';
import { DiscoveryWizard } from './DiscoveryWizard';
import { FileUploadZone } from './FileUploadZone';
import StageStatusManager from './StageStatusManager';
import MeetingTranscriptionPlugin from '../transcription/MeetingTranscriptionPlugin';
import { DiscoveryExporter } from '@/utils/discoveryExporter';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  extractedData?: any;
}

interface DiscoverySession {
  id: string;
  session_name: string;
  current_stage: string;
  status: string;
  business_canvas_data?: any;
  inception_data?: any;
  pbb_data?: any;
  sprint0_data?: any;
  generated_backlog?: any;
  related_project_id?: string;
  stage_status?: {
    business_canvas: 'pending' | 'in_progress' | 'completed';
    inception: 'pending' | 'in_progress' | 'completed';
    pbb: 'pending' | 'in_progress' | 'completed';
    sprint0: 'pending' | 'in_progress' | 'completed';
  };
  finalized_at?: string;
  final_document?: any;
}

interface ConversationalDiscoveryProps {
  sessionId?: string;
  onBack?: () => void;
}

const ConversationalDiscovery: React.FC<ConversationalDiscoveryProps> = ({
  sessionId,
  onBack
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [session, setSession] = useState<DiscoverySession | null>(null);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [sessionVersions, setSessionVersions] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (sessionId) {
      loadExistingSession();
    }
  }, [sessionId]);

  const loadExistingSession = async () => {
    if (!sessionId) return;

    try {
      const { data, error } = await supabase
        .from('smart_discovery_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (error) throw error;

      setSession({
        ...data,
        stage_status: data.stage_status as any || {
          business_canvas: 'pending',
          inception: 'pending', 
          pbb: 'pending',
          sprint0: 'pending'
        }
      } as DiscoverySession);
      
      // Carregar mensagens iniciais baseadas nos dados da sessão
      const welcomeMessages: ChatMessage[] = [];
      
      if (data.business_canvas_data && (data.business_canvas_data as any)?.questions) {
        welcomeMessages.push({
          role: 'assistant',
          content: 'Ótimo! Já temos algumas perguntas geradas para o Business Model Canvas. Podemos continuar com mais detalhes ou partir para a próxima etapa.',
          timestamp: new Date().toISOString(),
          extractedData: data.business_canvas_data
        });
      }

      if (data.inception_data && (data.inception_data as any)?.questions) {
        welcomeMessages.push({
          role: 'assistant',
          content: 'Perguntas do Inception Workshop também estão prontas. Vamos continuar evoluindo o discovery?',
          timestamp: new Date().toISOString(),
          extractedData: data.inception_data
        });
      }

      if (welcomeMessages.length === 0) {
        welcomeMessages.push({
          role: 'assistant',
          content: `Olá! Vamos continuar com o ${data.session_name}. Estamos na etapa de ${data.current_stage.replace('_', ' ')}. Me conte mais sobre o projeto para eu gerar perguntas específicas para sua reunião.`,
          timestamp: new Date().toISOString(),
        });
      }

      setMessages(welcomeMessages);

    } catch (error) {
      console.error('Erro ao carregar sessão:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a sessão.",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async (message: string) => {
    if (!session || isProcessing) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      console.log('Enviando mensagem para IA...', {
        sessionId: session.id,
        message,
        currentStage: session.current_stage,
        conversationHistory: messages
      });

      const { data, error } = await supabase.functions.invoke('discovery-ai-chat', {
        body: {
          sessionId: session.id,
          message,
          currentStage: session.current_stage,
          conversationHistory: messages
        }
      });

      if (error) {
        console.error('Erro da Edge Function:', error);
        throw error;
      }

      console.log('Resposta da IA recebida:', data);

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        extractedData: data.extractedData
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Atualizar dados da sessão se houve alterações
      if (data.sessionContext) {
        setSession(prev => prev ? {
          ...prev,
          business_canvas_data: data.sessionContext.business_canvas_data,
          inception_data: data.sessionContext.inception_data,
          pbb_data: data.sessionContext.pbb_data,
          sprint0_data: data.sessionContext.sprint0_data,
        } : null);
      }

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar sua mensagem. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const loadSessionVersions = async () => {
    if (!session?.id) return;

    try {
      const { data, error } = await supabase
        .from('discovery_session_versions')
        .select('*')
        .eq('session_id', session.id)
        .order('version_number', { ascending: false });

      if (error) throw error;
      setSessionVersions(data || []);
    } catch (error) {
      console.error('Erro ao carregar versões:', error);
    }
  };

  const createSessionVersion = async (versionName: string, changesSummary: string) => {
    if (!session?.id) return;

    try {
      const currentVersion = sessionVersions.length > 0 ? Math.max(...sessionVersions.map(v => v.version_number)) + 1 : 1;
      
      const snapshotData = JSON.stringify({
        session_data: session,
        messages: messages,
        timestamp: new Date().toISOString()
      });

      const { error } = await supabase
        .from('discovery_session_versions')
        .insert({
          session_id: session.id,
          version_number: currentVersion,
          version_name: versionName,
          changes_summary: changesSummary,
          snapshot_data: snapshotData,
          created_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;

      toast({
        title: "Versão salva!",
        description: `Versão ${currentVersion} - ${versionName} criada com sucesso.`,
      });

      loadSessionVersions();
    } catch (error) {
      console.error('Erro ao criar versão:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a versão.",
        variant: "destructive",
      });
    }
  };

  const exportComprehensiveData = () => {
    if (!session) return;

    const allQuestions: any[] = [];
    
    // Coletar todas as perguntas de todos os stages
    if (session.business_canvas_data?.questions) {
      allQuestions.push({
        stage: 'Business Model Canvas',
        icon: '🎯',
        questions: session.business_canvas_data.questions,
        next_steps: session.business_canvas_data.next_steps,
        meeting_format: session.business_canvas_data.meeting_format
      });
    }

    if (session.inception_data?.questions) {
      allQuestions.push({
        stage: 'Inception Workshop',
        icon: '👥',
        questions: session.inception_data.questions,
        next_steps: session.inception_data.next_steps,  
        meeting_format: session.inception_data.meeting_format
      });
    }

    if (session.pbb_data?.questions) {
      allQuestions.push({
        stage: 'Product Backlog Building',
        icon: '📋',
        questions: session.pbb_data.questions,
        next_steps: session.pbb_data.next_steps,
        meeting_format: session.pbb_data.meeting_format
      });
    }

    if (session.sprint0_data?.questions) {
      allQuestions.push({
        stage: 'Sprint 0',
        icon: '🚀',
        questions: session.sprint0_data.questions,
        next_steps: session.sprint0_data.next_steps,
        meeting_format: session.sprint0_data.meeting_format
      });
    }

    // INCLUIR CONVERSA COMPLETA NO EXPORT
    const conversationSection = `
${'='.repeat(60)}
CONVERSA COMPLETA:
${'='.repeat(60)}

${messages.map((msg, index) => `
[${new Date(msg.timestamp).toLocaleString('pt-BR')}] ${msg.role === 'user' ? '👤 USUÁRIO' : '🤖 ASSISTENTE'}:
${msg.content.replace(/```json[\s\S]*?```/g, '[Dados estruturados extraídos]')}
${'~'.repeat(40)}
`).join('\n')}`;

    const exportContent = `DISCOVERY COMPLETO - ${session.session_name.toUpperCase()}
${'='.repeat(60)}

SESSÃO: ${session.session_name}
DATA: ${new Date().toLocaleDateString('pt-BR')}
STATUS: ${session.status}
ETAPA ATUAL: ${session.current_stage.replace('_', ' ').toUpperCase()}
${session.finalized_at ? `FINALIZADO EM: ${new Date(session.finalized_at).toLocaleString('pt-BR')}` : ''}

${'='.repeat(60)}

${allQuestions.map(stage => `
${stage.icon} ${stage.stage.toUpperCase()}
${'-'.repeat(40)}

PERGUNTAS PARA REUNIÃO:
${stage.questions.map((q: any, index: number) => 
  `${index + 1}. [${q.category?.toUpperCase() || 'GERAL'}] ${q.question}
   💡 Contexto: ${q.context || 'N/A'}`
).join('\n\n')}

${stage.next_steps ? `PRÓXIMOS PASSOS:
${stage.next_steps}

` : ''}${stage.meeting_format ? `FORMATO DA REUNIÃO:
${stage.meeting_format}

` : ''}`).join('\n')}

${'='.repeat(60)}
BACKLOG GERADO:
${session.generated_backlog?.map((item: any, index: number) => 
  `${index + 1}. ${item.title || item.description}`
).join('\n') || 'Nenhum item de backlog gerado ainda.'}

${conversationSection}

${'='.repeat(60)}
RESUMO DA CONVERSA:
Total de mensagens: ${messages.length}
Perguntas estruturadas geradas: ${allQuestions.reduce((acc, stage) => acc + (stage.questions?.length || 0), 0)}

Gerado automaticamente em: ${new Date().toLocaleString('pt-BR')}
Powered by Smart Hub 2.0 - Discovery Conversacional`;

    const blob = new Blob([exportContent], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `discovery-completo-${session.session_name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Discovery exportado!",
      description: "Arquivo completo baixado com sucesso.",
    });
  };

  const exportExcelReport = () => {
    if (!session) return;
    
    try {
      DiscoveryExporter.downloadExcel(session, messages);
      toast({
        title: "Excel gerado!",
        description: "Relatório completo baixado em formato Excel.",
      });
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório Excel.",
        variant: "destructive",
      });
    }
  };

  const handleStageComplete = async (stage: string) => {
    if (!session?.id) return;

    try {
      const newStageStatus = {
        ...session.stage_status,
        [stage]: 'completed'
      };

      const { error } = await supabase
        .from('smart_discovery_sessions')
        .update({ 
          stage_status: newStageStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', session.id);

      if (error) throw error;

      setSession(prev => prev ? {
        ...prev,
        stage_status: newStageStatus
      } : null);

      toast({
        title: "Etapa finalizada!",
        description: `${stage.replace('_', ' ').toUpperCase()} marcada como concluída.`,
      });

    } catch (error) {
      console.error('Erro ao finalizar etapa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível finalizar a etapa.",
        variant: "destructive",
      });
    }
  };

  const handleStageSelect = async (stage: string) => {
    if (!session?.id || stage === session.current_stage) return;

    try {
      const newStageStatus = {
        ...session.stage_status,
        [stage]: session.stage_status?.[stage as keyof typeof session.stage_status] === 'pending' ? 'in_progress' : session.stage_status?.[stage as keyof typeof session.stage_status]
      };

      const { error } = await supabase
        .from('smart_discovery_sessions')
        .update({ 
          current_stage: stage,
          stage_status: newStageStatus
        })
        .eq('id', session.id);

      if (error) throw error;

      setSession(prev => prev ? {
        ...prev,
        current_stage: stage,
        stage_status: newStageStatus
      } : null);

      // Adicionar mensagem de contexto sobre mudança de etapa
      const contextMessage: ChatMessage = {
        role: 'assistant',
        content: `🔄 **Mudamos para a etapa: ${stage.replace('_', ' ').toUpperCase()}**\n\nAgora vou focar nas questões específicas desta etapa. Como posso ajudar?`,
        timestamp: new Date().toISOString(),
      };

      setMessages(prev => [...prev, contextMessage]);

      toast({
        title: "Etapa alterada!",
        description: `Agora estamos na etapa: ${stage.replace('_', ' ').toUpperCase()}`,
      });

    } catch (error) {
      console.error('Erro ao alterar etapa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível alterar a etapa.",
        variant: "destructive",
      });
    }
  };

  const finalizeDiscovery = async () => {
    if (!session?.id) return;

    const confirmed = window.confirm(
      `Deseja finalizar o Discovery "${session.session_name}"?\n\nIsso irá:\n- Gerar documento final consolidado\n- Marcar sessão como concluída\n- Analisar todas as etapas com IA\n\nEsta ação não pode ser desfeita.`
    );

    if (!confirmed) return;

    try {
      toast({
        title: "Finalizando Discovery...",
        description: "Gerando documento final com IA. Isso pode levar alguns segundos.",
      });

      const { data, error } = await supabase.functions.invoke('finalize-discovery', {
        body: { sessionId: session.id }
      });

      if (error) throw error;

      setSession(prev => prev ? {
        ...prev,
        status: 'completed',
        finalized_at: new Date().toISOString(),
        final_document: data.final_document
      } : null);

      toast({
        title: "Discovery Finalizado! 🎉",
        description: `Documento final gerado com ${data.completeness_percentage}% de completude.`,
      });

    } catch (error) {
      console.error('Erro ao finalizar discovery:', error);
      toast({
        title: "Erro",
        description: "Não foi possível finalizar o discovery.",
        variant: "destructive",
      });
    }
  };

  const deleteSession = async () => {
    if (!session?.id) return;

    const confirmed = window.confirm(
      `⚠️ ATENÇÃO: Deseja EXCLUIR permanentemente o Discovery "${session.session_name}"?\n\nTodos os dados, conversas e versões serão perdidos.\n\nEsta ação NÃO PODE ser desfeita.`
    );

    if (!confirmed) return;

    const doubleConfirm = window.prompt(
      `Para confirmar a exclusão, digite: "${session.session_name}"`
    );

    if (doubleConfirm !== session.session_name) {
      toast({
        title: "Exclusão cancelada",
        description: "Nome não confere. Sessão não foi excluída.",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('smart_discovery_sessions')
        .delete()
        .eq('id', session.id);

      if (error) throw error;

      toast({
        title: "Sessão excluída",
        description: "Discovery foi excluído permanentemente.",
      });

      // Redirecionar de volta
      if (onBack) {
        onBack();
      }

    } catch (error) {
      console.error('Erro ao excluir sessão:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a sessão.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (showVersions && session?.id) {
      loadSessionVersions();
    }
  }, [showVersions, session?.id]);

  if (!session) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando sessão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {onBack && (
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
              )}
              <div>
                <CardTitle className="text-xl">{session.session_name}</CardTitle>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline">
                    {session.current_stage.replace('_', ' ').toUpperCase()}
                  </Badge>
                  <Badge variant={session.status === 'completed' ? 'default' : 'secondary'}>
                    {session.status === 'completed' ? 'Concluído' : 'Em Andamento'}
                  </Badge>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFileUpload(!showFileUpload)}
              >
                <FileText className="h-4 w-4 mr-2" />
                {showFileUpload ? 'Ocultar' : 'Arquivos'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTranscription(!showTranscription)}
              >
                <Mic className="h-4 w-4 mr-2" />
                {showTranscription ? 'Ocultar' : 'Áudio'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVersions(!showVersions)}
              >
                <History className="h-4 w-4 mr-2" />
                {showVersions ? 'Ocultar' : 'Versões'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportComprehensiveData}
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar TXT
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportExcelReport}
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
              {session.status !== 'completed' && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={finalizeDiscovery}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finalizar Discovery
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4 mr-2" />
                {showSettings ? 'Ocultar' : 'Configurar'}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={deleteSession}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Stage Status Manager */}
      <StageStatusManager
        stageStatus={session.stage_status || {
          business_canvas: 'pending',
          inception: 'pending', 
          pbb: 'pending',
          sprint0: 'pending'
        }}
        stageData={{
          business_canvas_data: session.business_canvas_data,
          inception_data: session.inception_data,
          pbb_data: session.pbb_data,
          sprint0_data: session.sprint0_data
        }}
        currentStage={session.current_stage}
        onStageComplete={handleStageComplete}
        onStageSelect={handleStageSelect}
      />

      {/* Progress Wizard */}
      <DiscoveryWizard 
        currentStage={session.current_stage}
        sessionData={session}
      />

      {/* File Upload Zone */}
      {showFileUpload && (
        <FileUploadZone 
          sessionId={session.id}
          onUploadComplete={(files) => {
            toast({
              title: "Arquivos carregados!",
              description: `${files.length} arquivo(s) processado(s) com sucesso.`,
            });
          }}
        />
      )}

      {/* Transcription Plugin */}
      {showTranscription && (
        <MeetingTranscriptionPlugin
          sessionId={session.id}
          sessionType="discovery"
          projectId={session.related_project_id}
          clientId={null}
          onTranscriptionComplete={(transcriptionData) => {
            // Adicionar transcrição como mensagem no chat
            const transcriptionMessage = {
              role: 'assistant' as const,
              content: `📝 **Transcrição processada com sucesso!**

**Resumo:** ${transcriptionData.ai_summary || 'Processando...'}

**Decisões identificadas:** ${transcriptionData.key_decisions?.length || 0}
**Itens de ação:** ${transcriptionData.action_items?.length || 0}

A transcrição foi salva e pode ser referenciada durante nossa conversa.`,
              timestamp: new Date().toISOString(),
            };
            
            setMessages(prev => [...prev, transcriptionMessage]);
            
            toast({
              title: "Transcrição processada!",
              description: "A transcrição foi adicionada ao contexto da conversa.",
            });
          }}
        />
      )}

      {/* Versions Panel */}
      {showVersions && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5" />
              Versões da Sessão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const versionName = prompt('Nome da versão:');
                    const changesSummary = prompt('Resumo das mudanças:');
                    if (versionName && changesSummary) {
                      createSessionVersion(versionName, changesSummary);
                    }
                  }}
                >
                  Salvar Versão Atual
                </Button>
              </div>
              
              {sessionVersions.length > 0 ? (
                <div className="space-y-3">
                  {sessionVersions.map((version) => (
                    <Card key={version.id} className="p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">
                            v{version.version_number} - {version.version_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {version.changes_summary}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(version.created_at).toLocaleString('pt-BR')}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          Restaurar
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhuma versão salva ainda.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configurações da Sessão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Dados Coletados por Etapa:</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Target className="h-5 w-5 text-blue-500" />
                      <div>
                        <div className="font-medium">Business Model Canvas</div>
                        <div className="text-sm text-muted-foreground">
                          {session.business_canvas_data?.questions ? 
                            `${session.business_canvas_data.questions.length} perguntas geradas` : 
                            'Nenhuma pergunta ainda'
                          }
                        </div>
                      </div>
                    </div>
                    <Badge variant={session.business_canvas_data?.questions ? 'default' : 'secondary'}>
                      {session.business_canvas_data?.questions ? 'Completo' : 'Pendente'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Users className="h-5 w-5 text-purple-500" />
                      <div>
                        <div className="font-medium">Inception Workshop</div>
                        <div className="text-sm text-muted-foreground">
                          {session.inception_data?.questions ? 
                            `${session.inception_data.questions.length} perguntas geradas` : 
                            'Nenhuma pergunta ainda'
                          }
                        </div>
                      </div>
                    </div>
                    <Badge variant={session.inception_data?.questions ? 'default' : 'secondary'}>
                      {session.inception_data?.questions ? 'Completo' : 'Pendente'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-green-500" />
                      <div>
                        <div className="font-medium">Product Backlog Building</div>
                        <div className="text-sm text-muted-foreground">
                          {session.pbb_data?.questions ? 
                            `${session.pbb_data.questions.length} perguntas geradas` : 
                            'Nenhuma pergunta ainda'
                          }
                        </div>
                      </div>
                    </div>
                    <Badge variant={session.pbb_data?.questions ? 'default' : 'secondary'}>
                      {session.pbb_data?.questions ? 'Completo' : 'Pendente'}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <PlayCircle className="h-5 w-5 text-orange-500" />
                      <div>
                        <div className="font-medium">Sprint 0</div>
                        <div className="text-sm text-muted-foreground">
                          {session.sprint0_data?.questions ? 
                            `${session.sprint0_data.questions.length} perguntas geradas` : 
                            'Nenhuma pergunta ainda'
                          }
                        </div>
                      </div>
                    </div>
                    <Badge variant={session.sprint0_data?.questions ? 'default' : 'secondary'}>
                      {session.sprint0_data?.questions ? 'Completo' : 'Pendente'}
                    </Badge>
                  </div>
                </div>
              </div>

              <Separator />
              
              <div>
                <h4 className="font-medium mb-2">Estatísticas da Sessão:</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Total de mensagens:</span>
                    <div className="font-medium">{messages.length}</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Perguntas geradas:</span>
                    <div className="font-medium">
                      {[session.business_canvas_data, session.inception_data, session.pbb_data, session.sprint0_data]
                        .reduce((acc, data) => acc + (data?.questions?.length || 0), 0)}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Arquivos enviados:</span>
                    <div className="font-medium">0</div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Versões salvas:</span>
                    <div className="font-medium">{sessionVersions.length}</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Interface */}
      <ChatInterface
        messages={messages}
        onSendMessage={sendMessage}
        isProcessing={isProcessing}
        sessionData={session}
        currentStage={session.current_stage}
      />
    </div>
  );
};

export default ConversationalDiscovery;