import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Plus, RefreshCw, BarChart3, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import JiraConfigModal from '@/components/jira/JiraConfigModal';
import JiraBoard from '@/components/jira/JiraBoard';
import AIInsightsPanel from '@/components/jira/AIInsightsPanel';
import PredictiveCharts from '@/components/jira/PredictiveCharts';

const JiraCockpit: React.FC = () => {
  const { toast } = useToast();
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configurations, setConfigurations] = useState<any[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [insights, setInsights] = useState<any[]>([]);

  useEffect(() => {
    loadConfigurations();
  }, []);

  useEffect(() => {
    if (selectedConfig) {
      loadProjectData();
    }
  }, [selectedConfig]);

  const loadConfigurations = async () => {
    try {
      const { data, error } = await supabase
        .from('jira_configurations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      setConfigurations(data || []);
      if (data && data.length > 0 && !selectedConfig) {
        setSelectedConfig(data[0]);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar configurações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjectData = async () => {
    if (!selectedConfig) return;

    try {
      // Load projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('jira_projects')
        .select('*')
        .eq('config_id', selectedConfig.id);

      if (projectsError) throw projectsError;
      setProjects(projectsData || []);

      // Load issues
      const { data: issuesData, error: issuesError } = await supabase
        .from('jira_issues')
        .select('*')
        .eq('config_id', selectedConfig.id)
        .order('updated_date', { ascending: false });

      if (issuesError) throw issuesError;
      setIssues(issuesData || []);

      // Load AI insights
      const { data: insightsData, error: insightsError } = await supabase
        .from('jira_ai_insights')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(50);

      if (insightsError) throw insightsError;
      setInsights(insightsData || []);

    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados do projeto",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSync = async () => {
    if (!selectedConfig) return;

    setIsSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke('jira-sync', {
        body: { 
          action: 'sync_config', 
          config_id: selectedConfig.id 
        }
      });

      if (error) throw error;

      toast({
        title: "Sincronização concluída",
        description: `Projetos e issues sincronizados com sucesso.`,
      });

      // Reload data
      await loadProjectData();

      // Trigger AI insights generation
      await supabase.functions.invoke('jira-ai-insights', {
        body: { 
          action: 'generate_sla_risk_insights',
          project_keys: selectedConfig.project_keys
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

  const handleConfigurationSaved = () => {
    setIsConfigModalOpen(false);
    loadConfigurations();
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

  if (configurations.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center max-w-md mx-auto">
          <div className="mb-8">
            <BarChart3 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-3xl font-bold mb-2">Cockpit Jira + IA</h1>
            <p className="text-muted-foreground mb-6">
              Configure sua primeira conexão com o Jira para começar a usar insights inteligentes.
            </p>
          </div>
          <Button onClick={() => setIsConfigModalOpen(true)} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Configurar Jira
          </Button>
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
        <div>
          <h1 className="text-3xl font-bold">Cockpit Jira + IA</h1>
          <p className="text-muted-foreground">
            Dashboard inteligente com insights preditivos para seus projetos Jira
          </p>
        </div>
        <div className="flex gap-2">
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

      {/* Configuration Selector */}
      {configurations.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Configurações Jira</CardTitle>
            <CardDescription>Selecione a configuração ativa</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {configurations.map((config) => (
                <Button
                  key={config.id}
                  variant={selectedConfig?.id === config.id ? "default" : "outline"}
                  onClick={() => setSelectedConfig(config)}
                  className="flex items-center gap-2"
                >
                  <Badge variant={config.sync_enabled ? "default" : "secondary"}>
                    {config.sync_enabled ? 'Ativo' : 'Inativo'}
                  </Badge>
                  {config.jira_url.replace('https://', '').split('.')[0]}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
              {projects.length} projetos ativos
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
              {selectedConfig?.last_sync_at ? 
                new Date(selectedConfig.last_sync_at).toLocaleTimeString('pt-BR', { 
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

      {/* Main Dashboard Content */}
      <div className="grid grid-cols-12 gap-6">
        {/* Jira Board - 8 columns */}
        <div className="col-span-12 lg:col-span-8">
          <JiraBoard 
            issues={issues} 
            projects={projects}
            insights={insights}
            onIssueUpdate={loadProjectData}
          />
        </div>

        {/* AI Insights Panel - 4 columns */}
        <div className="col-span-12 lg:col-span-4">
          <AIInsightsPanel 
            insights={insights}
            issues={issues}
            projects={projects}
          />
        </div>
      </div>

      {/* Predictive Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PredictiveCharts 
          issues={issues}
          insights={insights}
          projects={projects}
        />
      </div>

      <JiraConfigModal
        isOpen={isConfigModalOpen}
        onClose={() => setIsConfigModalOpen(false)}
        onSave={handleConfigurationSaved}
        selectedConfig={selectedConfig}
      />
    </div>
  );
};

export default JiraCockpit;