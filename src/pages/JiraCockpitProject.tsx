import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, RefreshCw, BarChart3, AlertTriangle, User, ArrowLeft, Brain, TrendingUp, Kanban } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import JiraConfigModal from '@/components/jira/JiraConfigModal';
import JiraBoard from '@/components/jira/JiraBoard';
import PredictiveCharts from '@/components/jira/PredictiveCharts';
import UserProjectParticipationModal from '@/components/jira/UserProjectParticipationModal';
import EconomicDashboard from '@/components/jira/EconomicDashboard';
import AIInsightsPanel from '@/components/jira/AIInsightsPanel';
import { useNavigate } from 'react-router-dom';

const JiraCockpitProject: React.FC = () => {
  const { projectId } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isParticipationModalOpen, setIsParticipationModalOpen] = useState(false);
  const [configuration, setConfiguration] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [issues, setIssues] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      loadProjectData();
    }
  }, [projectId]);

  const loadProjectData = async () => {
    try {
      setIsLoading(true);

      // Load project info
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select(`
          *,
          client:clients(name)
        `)
        .eq('id', projectId)
        .single();

      if (projectError) throw projectError;
      setProject(projectData);

      // Find Jira configuration for this project
      const { data: configData, error: configError } = await supabase
        .from('jira_configurations')
        .select('*')
        .eq('client_id', projectData.client_id)
        .limit(1)
        .single();

      if (configError && configError.code !== 'PGRST116') throw configError;
      setConfiguration(configData);

      if (configData) {
        // Load Jira project info
        const { data: jiraProjectData, error: jiraProjectError } = await supabase
          .from('jira_projects')
          .select('*')
          .eq('config_id', configData.id);

        if (jiraProjectError) throw jiraProjectError;

        // Load issues for this specific project
        const projectKeys = jiraProjectData.map(jp => jp.jira_key);
        const { data: issuesData, error: issuesError } = await supabase
          .from('jira_issues')
          .select('*')
          .eq('config_id', configData.id)
          .in('project_key', projectKeys)
          .order('updated_date', { ascending: false });

        if (issuesError) throw issuesError;
        setIssues(issuesData || []);

        // Load AI insights for jira projects
        const jiraProjectIds = jiraProjectData.map(jp => jp.id);
        const { data: insightsData, error: insightsError } = await supabase
          .from('jira_ai_insights')
          .select('*')
          .in('project_id', jiraProjectIds)
          .order('generated_at', { ascending: false })
          .limit(50);

        if (insightsError) throw insightsError;
        setInsights(insightsData || []);
      }

    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados do projeto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSync = async () => {
    if (!configuration) return;

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('jira-sync', {
        body: { 
          action: 'sync_config', 
          config_id: configuration.id 
        }
      });

      if (error) throw error;

      toast({
        title: "Sincronização concluída",
        description: `Dados do projeto sincronizados com sucesso.`,
      });

      // Reload data
      await loadProjectData();

      // Trigger AI insights generation for this specific project
      await supabase.functions.invoke('jira-ai-insights', {
        body: { 
          action: 'generate_sla_risk_insights',
          project_id: projectId,
          project_keys: configuration.project_keys,
          config_id: configuration.id
        }
      });

    } catch (error: any) {
      toast({
        title: "Erro na sincronização",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleConfigurationSaved = async () => {
    setIsConfigModalOpen(false);
    await loadProjectData();
  };

  const generateInsight = async (action: string, buttonText: string) => {
    if (!configuration) {
      toast({
        title: "Erro",
        description: "Nenhuma configuração Jira encontrada",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(action);
    const startTime = Date.now();
    
    try {
      toast({
        title: "Processando...",
        description: `Iniciando ${buttonText.toLowerCase()}. Isso pode levar até 30 segundos.`,
      });

      const apiUtils = await import("@/utils/apiUtils");
      
      const data = await apiUtils.invokeSupabaseFunctionWithTimeout('jira-ai-insights', { 
        action,
        project_id: projectId,
        project_keys: configuration.project_keys,
        config_id: configuration.id
      }, {
        timeoutMs: 30000, // 30 seconds
        retries: 1, // Try once more on failure
        retryDelayMs: 2000
      });

      const duration = Date.now() - startTime;
      
      toast({
        title: "Insight Gerado",
        description: `${buttonText} concluído com sucesso em ${Math.round(duration / 1000)}s!`,
      });

      // Reload insights reactively
      await loadProjectData();

    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      if (error.name === 'TimeoutError') {
        toast({
          title: "Tempo limite excedido",
          description: `A operação demorou mais que 30 segundos. Tente novamente ou verifique a configuração.`,
          variant: "destructive",
        });
      } else if (error.name === 'RetryError') {
        toast({
          title: "Falha após múltiplas tentativas",  
          description: `Tentamos ${error.attempts || 'várias'} vezes em ${Math.round(duration / 1000)}s. Verifique sua conexão e tente novamente.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao gerar insight",
          description: error.message || "Erro desconhecido durante a geração do insight",
          variant: "destructive",
        });
      }
      
      console.error(`generateInsight(${action}) failed after ${duration}ms:`, error);
    } finally {
      setIsGenerating(null);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  if (!configuration) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-8">
            <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-3xl font-bold mb-2">Insights do Projeto</h1>
            <p className="text-muted-foreground mb-6">
              Configure a conexão com o Jira para ver insights inteligentes deste projeto.
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate('/projects')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={() => setIsConfigModalOpen(true)} size="lg">
              <Settings className="h-4 w-4 mr-2" />
              Configurar Jira
            </Button>
          </div>
        </div>

        <JiraConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleConfigurationSaved}
        />
      </div>
    );
  }

  const activeIssuesCount = issues.filter(issue => !['Done', 'Closed', 'Resolved'].includes(issue.status)).length;
  const highPriorityIssues = issues.filter(issue => ['Highest', 'High'].includes(issue.priority)).length;
  const slaRiskIssues = insights.filter(insight => 
    insight.insight_type === 'sla_risk' && insight.confidence_score > 0.7
  ).length;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/projects')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Insights - {project?.name}</h1>
            <p className="text-muted-foreground">
              Dashboard inteligente focado neste projeto
            </p>
            {project?.client && (
              <Badge variant="outline" className="mt-1">
                Cliente: {project.client.name}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsParticipationModalOpen(true)}
          >
            <User className="h-4 w-4 mr-2" />
            Minha Participação
          </Button>
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={isSyncing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsConfigModalOpen(true)}
          >
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Issues Ativas</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeIssuesCount}</div>
            <p className="text-xs text-muted-foreground">
              Neste projeto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alta Prioridade</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{highPriorityIssues}</div>
            <p className="text-xs text-muted-foreground">
              Requer atenção imediata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Risco SLA</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{slaRiskIssues}</div>
            <p className="text-xs text-muted-foreground">
              Issues com risco alto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Sync</CardTitle>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {configuration?.last_sync_at ? 
                new Date(configuration.last_sync_at).toLocaleTimeString('pt-BR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                }) : 'Nunca'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Sincronização automática
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Modern Tabbed Dashboard */}
      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-fit">
          <TabsTrigger value="insights" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            <span className="hidden sm:inline">Insights IA</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="kanban" className="flex items-center gap-2">
            <Kanban className="h-4 w-4" />
            <span className="hidden sm:inline">Board</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-6">
          <AIInsightsPanel 
            insights={insights}
            issues={issues}
            projects={[project]}
            selectedConfig={configuration}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PredictiveCharts 
              issues={issues}
              insights={insights}
              projects={[project]}
            />
            <EconomicDashboard 
              insights={insights}
              issues={issues}
              projects={[project]}
            />
          </div>
        </TabsContent>

        <TabsContent value="kanban">
          <JiraBoard 
            issues={issues} 
            projects={[]}
            insights={insights}
            onIssueUpdate={loadProjectData}
          />
        </TabsContent>
      </Tabs>

      <JiraConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSave={handleConfigurationSaved}
        selectedConfig={configuration}
      />

      <UserProjectParticipationModal
        isOpen={isParticipationModalOpen}
        onClose={() => setIsParticipationModalOpen(false)}
        projects={[]}
      />
    </div>
  );
};

export default JiraCockpitProject;