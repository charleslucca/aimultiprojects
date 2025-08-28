import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  DollarSign,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Download,
  RefreshCw
} from 'lucide-react';

interface ExecutiveReport {
  id: string;
  report_type: string;
  content: {
    executive_summary: string;
    kpis: Array<{
      metric: string;
      value: string;
      trend: 'up' | 'down' | 'stable';
      status: 'good' | 'warning' | 'critical';
    }>;
    critical_issues: Array<{
      title: string;
      description: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      impact: string;
    }>;
    recommendations: Array<{
      title: string;
      description: string;
      priority: 'low' | 'medium' | 'high';
      timeline: string;
    }>;
    trends: Array<{
      category: string;
      trend: string;
      analysis: string;
    }>;
    financial_impact: {
      total_budget: string;
      spent: string;
      remaining: string;
      burn_rate: string;
      projection: string;
    };
  };
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  status: string;
}

export default function ExecutiveDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<ExecutiveReport[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedReport, setSelectedReport] = useState<ExecutiveReport | null>(null);
  const [reportType, setReportType] = useState<string>('comprehensive');
  const [dateRange, setDateRange] = useState<string>('30');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (user) {
      loadProjects();
      loadReports();
    }
  }, [user]);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const loadReports = async () => {
    try {
    // Mock reports for now until types are updated
    const mockReports = [
      {
        id: 'report-1',
        report_type: 'comprehensive',
        content: {
          executive_summary: 'Relatório executivo de exemplo com dados mockados para demonstração.',
          kpis: [
            { metric: 'Projetos Ativos', value: '12', trend: 'up' as const, status: 'good' as const },
            { metric: 'Budget Utilizado', value: '67%', trend: 'stable' as const, status: 'warning' as const },
            { metric: 'Entregas no Prazo', value: '89%', trend: 'up' as const, status: 'good' as const }
          ],
          critical_issues: [
            { title: 'Atraso no Projeto Alpha', description: 'Projeto com 15 dias de atraso', severity: 'high' as const, impact: 'Alto' }
          ],
          recommendations: [
            { title: 'Revisar Cronograma', description: 'Ajustar cronograma do projeto Alpha', priority: 'high' as const, timeline: '1 semana' }
          ],
          trends: [
            { category: 'Produtividade', trend: 'Crescente', analysis: 'Equipe demonstra melhoria contínua' }
          ],
          financial_impact: {
            total_budget: 'R$ 500.000',
            spent: 'R$ 335.000',
            remaining: 'R$ 165.000',
            burn_rate: 'R$ 25.000/mês',
            projection: 'Dentro do orçamento'
          }
        },
        created_at: new Date().toISOString()
      }
    ];
    setReports(mockReports);
    if (mockReports.length > 0) {
      setSelectedReport(mockReports[0]);
    }

    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    if (!user) return;

    setGenerating(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(dateRange));

      const projectIds = projects.map(p => p.id);

      const { data, error } = await supabase.functions.invoke('generate-executive-reports', {
        body: {
          report_type: reportType,
          date_range: {
            start: startDate.toISOString(),
            end: endDate.toISOString()
          },
          project_ids: projectIds,
          user_id: user.id
        }
      });

      if (error) throw error;

      toast({
        title: 'Relatório Gerado',
        description: 'Relatório executivo gerado com sucesso',
      });

      await loadReports();
    } catch (error) {
      console.error('Error generating report:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao gerar relatório executivo',
        variant: 'destructive',
      });
    } finally {
      setGenerating(false);
    }
  };

  const exportReport = () => {
    if (!selectedReport) return;

    const reportData = {
      title: `Relatório Executivo - ${selectedReport.report_type}`,
      generated_at: selectedReport.created_at,
      content: selectedReport.content
    };

    const dataStr = JSON.stringify(reportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = `relatorio-executivo-${Date.now()}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();

    toast({
      title: 'Relatório Exportado',
      description: 'O relatório foi exportado com sucesso',
    });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <TrendingUp className="h-4 w-4 text-success" />;
      case 'down': return <TrendingDown className="h-4 w-4 text-destructive" />;
      default: return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'good': return <Badge variant="default" className="bg-success text-success-foreground">Bom</Badge>;
      case 'warning': return <Badge variant="secondary">Atenção</Badge>;
      case 'critical': return <Badge variant="destructive">Crítico</Badge>;
      default: return <Badge variant="outline">N/A</Badge>;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'medium': return <Clock className="h-4 w-4 text-info" />;
      default: return <CheckCircle className="h-4 w-4 text-success" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5" />
              <CardTitle>Dashboard Executivo</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="comprehensive">Relatório Completo</SelectItem>
                  <SelectItem value="project_health">Saúde dos Projetos</SelectItem>
                  <SelectItem value="team_performance">Performance da Equipe</SelectItem>
                  <SelectItem value="financial">Análise Financeira</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 dias</SelectItem>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                  <SelectItem value="180">6 meses</SelectItem>
                </SelectContent>
              </Select>

              <Button onClick={generateReport} disabled={generating}>
                {generating ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-2" />
                )}
                Gerar Relatório
              </Button>

              {selectedReport && (
                <Button variant="outline" onClick={exportReport}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {selectedReport && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Executive Summary */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Resumo Executivo</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">
                {selectedReport.content.executive_summary}
              </p>
            </CardContent>
          </Card>

          {/* Key Performance Indicators */}
          <Card>
            <CardHeader>
              <CardTitle>KPIs Principais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedReport.content.kpis.map((kpi, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{kpi.metric}</p>
                      <p className="text-lg font-bold">{kpi.value}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {getTrendIcon(kpi.trend)}
                      {getStatusBadge(kpi.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Financial Impact */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                Impacto Financeiro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Orçamento Total</span>
                    <span className="font-medium">{selectedReport.content.financial_impact.total_budget}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm">Gasto</span>
                    <span className="font-medium">{selectedReport.content.financial_impact.spent}</span>
                  </div>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm">Restante</span>
                    <span className="font-medium">{selectedReport.content.financial_impact.remaining}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span>Taxa de Queima</span>
                      <span>{selectedReport.content.financial_impact.burn_rate}</span>
                    </div>
                    <Progress value={75} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Projeção: {selectedReport.content.financial_impact.projection}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Critical Issues */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2" />
                Questões Críticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedReport.content.critical_issues.slice(0, 3).map((issue, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium">{issue.title}</h4>
                      {getSeverityIcon(issue.severity)}
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {issue.description}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      Impacto: {issue.impact}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-4 w-4 mr-2" />
                Recomendações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {selectedReport.content.recommendations.slice(0, 3).map((rec, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="text-sm font-medium">{rec.title}</h4>
                      <Badge 
                        variant={rec.priority === 'high' ? 'destructive' : 
                                rec.priority === 'medium' ? 'secondary' : 
                                'outline'}
                        className="text-xs"
                      >
                        {rec.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {rec.description}
                    </p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      {rec.timeline}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {reports.length === 0 && !loading && (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum relatório encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Gere seu primeiro relatório executivo para começar
            </p>
            <Button onClick={generateReport} disabled={generating}>
              {generating ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4 mr-2" />
              )}
              Gerar Primeiro Relatório
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}