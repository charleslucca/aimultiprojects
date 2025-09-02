import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, RefreshCw, BarChart3, AlertTriangle, User, ArrowLeft, Brain, TrendingUp, Kanban } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import AzureConfigModal from '@/components/azure/AzureConfigModal';
import AzureBoard from '@/components/azure/AzureBoard';
import PredictiveCharts from '@/components/jira/PredictiveCharts';
import UserProjectParticipationModal from '@/components/jira/UserProjectParticipationModal';
import EconomicDashboard from '@/components/jira/EconomicDashboard';
import AIInsightsPanel from '@/components/jira/AIInsightsPanel';
import { useNavigate } from 'react-router-dom';

const AzureCockpitProject: React.FC = () => {
  const { projectId } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [isParticipationModalOpen, setIsParticipationModalOpen] = useState(false);
  const [integration, setIntegration] = useState<any>(null);
  const [project, setProject] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [workItems, setWorkItems] = useState<any[]>([]);
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

      // Find Azure integration for this project
      const { data: integrationData, error: integrationError } = await supabase
        .from('project_integrations')
        .select('*')
        .eq('project_id', projectId)
        .eq('integration_type', 'azure_boards')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (integrationError && integrationError.code !== 'PGRST116') throw integrationError;
      setIntegration(integrationData);

      if (integrationData) {
        // Load Azure projects
        const { data: azureProjectData, error: azureProjectError } = await supabase
          .from('azure_projects')
          .select('*')
          .eq('integration_id', integrationData.id);

        if (azureProjectError) throw azureProjectError;

        // Load work items for this specific project
        const { data: workItemsData, error: workItemsError } = await supabase
          .from('azure_work_items')
          .select('*')
          .eq('integration_id', integrationData.id)
          .order('changed_date', { ascending: false });

        if (workItemsError) throw workItemsError;
        setWorkItems(workItemsData || []);

        // For now, insights will be empty as Azure insights may not be implemented yet
        setInsights([]);
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
    if (!integration) return;

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('azure-boards-sync', {
        body: { 
          action: 'sync_integration', 
          integration_id: integration.id,
          config: integration.configuration
        }
      });

      if (error) throw error;

      toast({
        title: "Sincronização concluída",
        description: `Dados do Azure Boards sincronizados com sucesso.`,
      });

      // Reload data
      await loadProjectData();

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
    if (!integration) {
      toast({
        title: "Erro",
        description: "Nenhuma integração Azure encontrada",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(action);
    
    try {
      toast({
        title: "Processando...",
        description: `Iniciando ${buttonText.toLowerCase()}. Isso pode levar até 30 segundos.`,
      });

      // For now, we'll show a message that Azure insights are not implemented yet
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "Insights de IA para Azure Boards em breve!",
        variant: "default",
      });

    } catch (error: any) {
      toast({
        title: "Erro ao gerar insight",
        description: error.message || "Erro desconhecido durante a geração do insight",
        variant: "destructive",
      });
      
      console.error(`generateInsight(${action}) failed:`, error);
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

  if (!integration) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-8">
            <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-3xl font-bold mb-2">Insights do Projeto</h1>
            <p className="text-muted-foreground mb-6">
              Configure a conexão com o Azure Boards para ver insights inteligentes deste projeto.
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => navigate('/projects')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button onClick={() => setIsConfigModalOpen(true)} size="lg">
              <Settings className="h-4 w-4 mr-2" />
              Configurar Azure
            </Button>
          </div>
        </div>

        <AzureConfigModal
          isOpen={isConfigModalOpen}
          onClose={() => setIsConfigModalOpen(false)}
          onSave={handleConfigurationSaved}
          projectId={projectId}
        />
      </div>
    );
  }

  const activeItemsCount = workItems.filter(item => !['Done', 'Closed', 'Resolved', 'Removed'].includes(item.state)).length;
  const highPriorityItems = workItems.filter(item => ['1', '2'].includes(item.priority?.toString())).length;
  const slaRiskItems = insights.filter(insight => 
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
            <h1 className="text-3xl font-bold">Azure Insights - {project?.name}</h1>
            <p className="text-muted-foreground">
              Dashboard inteligente do Azure Boards
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
            <CardTitle className="text-sm font-medium">Itens Ativos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeItemsCount}</div>
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
            <div className="text-2xl font-bold text-orange-600">{highPriorityItems}</div>
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
            <div className="text-2xl font-bold text-red-600">{slaRiskItems}</div>
            <p className="text-xs text-muted-foreground">
              Itens com risco alto
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
              {integration?.updated_at ? 
                new Date(integration.updated_at).toLocaleTimeString('pt-BR', { 
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Insights do Azure Boards
              </CardTitle>
              <CardDescription>
                Insights de IA para Azure Boards em desenvolvimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                As funcionalidades de insights inteligentes para Azure Boards estão sendo desenvolvidas.
                Em breve você terá acesso a análises avançadas dos seus work items.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Analytics do Azure</CardTitle>
                <CardDescription>Métricas e tendências dos work items</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Gráficos analíticos para Azure Boards em desenvolvimento.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Dashboard Econômico</CardTitle>
                <CardDescription>Análise de custos e produtividade</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Análise econômica dos projetos Azure em desenvolvimento.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="kanban">
          <AzureBoard 
            workItems={workItems} 
            projects={[]}
            insights={insights}
            onItemUpdate={loadProjectData}
          />
        </TabsContent>
      </Tabs>

      <AzureConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSave={handleConfigurationSaved}
        projectId={projectId}
        selectedIntegration={integration}
      />

      <UserProjectParticipationModal
        isOpen={isParticipationModalOpen}
        onClose={() => setIsParticipationModalOpen(false)}
        projects={[]}
      />
    </div>
  );
};

export default AzureCockpitProject;