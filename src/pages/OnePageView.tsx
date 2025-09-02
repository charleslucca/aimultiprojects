import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  DollarSign,
  Calendar,
  Users,
  Activity,
  BarChart3
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Client {
  id: string;
  name: string;
  status_color: string | null;
  risk_level: string | null;
  overall_health: any;
  project_count?: number;
  total_budget?: number;
  active_issues?: number;
  completion_rate?: number;
  has_jira_connection?: boolean;
}

export default function OnePageView() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMetrics, setTotalMetrics] = useState({
    totalClients: 0,
    totalBudget: 0,
    activeProjects: 0,
    riskProjects: 0,
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadClientsData();
  }, []);

  const loadClientsData = async () => {
    try {
      setLoading(true);
      console.log('OnePageView: Loading clients data...');

      // Load clients with basic info
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*');

      if (clientsError) {
        console.error('OnePageView: Error loading clients:', clientsError);
        
        // If it's a permission error or table doesn't exist, show empty state instead of error
        if (clientsError.code === '42P01' || clientsError.code === 'PGRST116') {
          console.log('OnePageView: Clients table not found or no access, showing empty state');
          setClients([]);
          setTotalMetrics({
            totalClients: 0,
            totalBudget: 0,
            activeProjects: 0,
            riskProjects: 0,
          });
          return;
        }
        
        throw clientsError;
      }

      console.log('OnePageView: Loaded', clientsData?.length || 0, 'clients');

      // Load project metrics for each client
      const clientsWithMetrics = await Promise.all(
        (clientsData || []).map(async (client) => {
          try {
            // Get projects for this client
            const { data: projects } = await supabase
              .from('projects')
              .select('id, budget, status')
              .eq('client_id', client.id);

            // Load Jira issues count for projects of this client
            const projectIds = projects?.map(p => p.id) || [];
            
            // Check if any projects have Jira connections
            const { data: jiraConfigs } = await supabase
              .from('jira_configurations')
              .select('id, project_keys')
              .eq('client_id', client.id);

            let issuesCount = 0;
            let hasJiraConnection = false;

            if (jiraConfigs && jiraConfigs.length > 0) {
              hasJiraConnection = true;
              try {
                const { count } = await supabase
                  .from('jira_issues')
                  .select('*', { count: 'exact', head: true })
                  .in('config_id', jiraConfigs.map(c => c.id));
                issuesCount = count || 0;
              } catch (jiraError) {
                // Ignore Jira errors, just set count to 0
                console.warn('OnePageView: Could not load Jira issues for client', client.id);
                issuesCount = 0;
              }
            }

            const totalBudget = projects?.reduce((sum, p) => sum + (p.budget || 0), 0) || 0;
            const activeProjects = projects?.filter(p => p.status === 'active').length || 0;
            const completionRate = Math.floor(Math.random() * 100); // Placeholder calculation

            return {
              ...client,
              project_count: projects?.length || 0,
              total_budget: totalBudget,
              active_issues: issuesCount,
              completion_rate: completionRate,
              has_jira_connection: hasJiraConnection,
            };
          } catch (clientError) {
            console.warn('OnePageView: Error loading data for client', client.id, clientError);
            
            // Return client with default values if there's an error
            return {
              ...client,
              project_count: 0,
              total_budget: 0,
              active_issues: 0,
              completion_rate: 0,
              has_jira_connection: false,
            };
          }
        })
      );

      setClients(clientsWithMetrics);

      // Calculate total metrics
      const metrics = {
        totalClients: clientsWithMetrics.length,
        totalBudget: clientsWithMetrics.reduce((sum, c) => sum + (c.total_budget || 0), 0),
        activeProjects: clientsWithMetrics.reduce((sum, c) => sum + (c.project_count || 0), 0),
        riskProjects: clientsWithMetrics.filter(c => c.status_color === 'red').length,
      };

      console.log('OnePageView: Calculated metrics:', metrics);
      setTotalMetrics(metrics);

    } catch (error: any) {
      console.error('OnePageView: Error in loadClientsData:', error);
      
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados dos clientes. Tente novamente.",
        variant: "destructive",
      });
      
      // Set empty state on error to prevent blank screen
      setClients([]);
      setTotalMetrics({
        totalClients: 0,
        totalBudget: 0,
        activeProjects: 0,
        riskProjects: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (statusColor: string | null, riskLevel: string | null) => {
    if (statusColor === 'red') return <AlertTriangle className="h-5 w-5 text-red-500" />;
    if (statusColor === 'yellow') return <TrendingDown className="h-5 w-5 text-yellow-500" />;
    return <CheckCircle className="h-5 w-5 text-green-500" />;
  };

  const getStatusBadge = (statusColor: string | null) => {
    const colors = {
      red: 'bg-red-100 text-red-800 border-red-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
      green: 'bg-green-100 text-green-800 border-green-200'
    };
    
    const labels = {
      red: 'Alto Risco',
      yellow: 'Atenção',
      green: 'Saudável'
    };

    const color = (statusColor || 'green') as keyof typeof colors;

    return (
      <Badge className={colors[color]}>
        {labels[color]}
      </Badge>
    );
  };

  const handleClientClick = (clientId: string) => {
    navigate(`/projects?client=${clientId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando visão executiva...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">One Page View</h1>
          <p className="text-muted-foreground mt-2">
            Visão executiva consolidada de todos os clientes e projetos
          </p>
        </div>
        <Button onClick={loadClientsData} variant="outline">
          <Activity className="mr-2 h-4 w-4" />
          Atualizar Dados
        </Button>
      </div>

      {/* Executive Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.totalClients}</div>
            <p className="text-xs text-muted-foreground">Clientes ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Orçamento Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { 
                style: 'currency', 
                currency: 'BRL',
                minimumFractionDigits: 0 
              }).format(totalMetrics.totalBudget)}
            </div>
            <p className="text-xs text-muted-foreground">Em todos os projetos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos Ativos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMetrics.activeProjects}</div>
            <p className="text-xs text-muted-foreground">Em andamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projetos de Risco</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalMetrics.riskProjects}</div>
            <p className="text-xs text-muted-foreground">Requerem atenção</p>
          </CardContent>
        </Card>
      </div>

      {/* Clients Overview */}
      <div>
        <h2 className="text-2xl font-semibold mb-6">Clientes</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {clients.map((client) => (
            <Card 
              key={client.id} 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => handleClientClick(client.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{client.name}</CardTitle>
                  {getStatusIcon(client.status_color, client.risk_level)}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(client.status_color)}
                  <Badge variant="outline">
                    {client.project_count} projeto{client.project_count !== 1 ? 's' : ''}
                  </Badge>
                  {client.has_jira_connection && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Jira
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Orçamento Total</span>
                  <span className="font-medium">
                    {new Intl.NumberFormat('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL',
                      minimumFractionDigits: 0 
                    }).format(client.total_budget || 0)}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Issues Ativas</span>
                  <span className="font-medium">{client.active_issues}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progresso Geral</span>
                    <span className="font-medium">{client.completion_rate}%</span>
                  </div>
                  <Progress value={client.completion_rate} className="h-2" />
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Score de Saúde</span>
                  <span className="font-medium">{client.overall_health?.score || 100}/100</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {clients.length === 0 && (
          <Card className="p-8">
            <div className="text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Comece cadastrando seus primeiros clientes na seção Projetos.
              </p>
              <Button onClick={() => navigate('/projects')}>
                Gerenciar Projetos
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}