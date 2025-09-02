import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import InsightDetailModal from './InsightDetailModal';
import { processInsightForDisplay, extractCriticalAlerts, type CriticalAlert } from '@/utils/insightUtils';
import { InsightComments } from '@/components/insights/InsightComments';
import { 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Users, 
  Target,
  Brain,
  CheckCircle,
  AlertCircle,
  Info,
  DollarSign,
  Loader2,
  Search,
  Filter,
  BarChart3,
  Eye,
  Calendar,
  Flame,
  UserX,
  UserMinus,
  MessageSquare
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIInsightsPanelProps {
  insights: any[];
  issues: any[];
  projects: any[];
  selectedConfig?: any;
  projectId?: string;
  clientId?: string;
}

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ insights, issues, projects, selectedConfig, projectId, clientId }) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');

  // Process insights to work with unified format
  const processedInsights = useMemo(() => {
    return insights.map(insight => {
      // All insights now come from unified_insights table
      try {
        const parsedContent = typeof insight.content === 'string' ? JSON.parse(insight.content) : insight.content;
        return {
          ...insight,
          insight_data: parsedContent,
          executive_summary: insight.metadata?.executive_summary || insight.title,
          alert_category: insight.metadata?.alert_category || 'GENERAL',
          generated_at: insight.created_at
        };
      } catch (e) {
        console.error('Error parsing insight content:', e);
        return {
          ...insight,
          insight_data: {},
          executive_summary: insight.title,
          alert_category: 'GENERAL',
          generated_at: insight.created_at
        };
      }
    });
  }, [insights]);

  // Get filtered insights based on processed insights
  const filteredInsights = useMemo(() => {
    let filtered = processedInsights.map(insight => {
      // Process each insight with critical alerts
      return processInsightForDisplay(insight, issues);
    });

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(insight => {
        const insightText = JSON.stringify(insight.insight_data).toLowerCase();
        const relatedIssue = issues.find(i => i.id === insight.issue_id);
        const issueText = relatedIssue ? `${relatedIssue.jira_key} ${relatedIssue.summary}`.toLowerCase() : '';
        const alertText = insight.critical_alerts?.map((a: CriticalAlert) => `${a.title} ${a.description}`).join(' ').toLowerCase() || '';
        return insightText.includes(searchTerm.toLowerCase()) || 
               issueText.includes(searchTerm.toLowerCase()) ||
               alertText.includes(searchTerm.toLowerCase());
      });
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(insight => insight.insight_type === selectedType);
    }

    // Sort insights (prioritize critical alerts)
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'criticality':
          return (b.criticality_score || 0) - (a.criticality_score || 0);
        case 'confidence':
          return (b.confidence_score || 0) - (a.confidence_score || 0);
        case 'type':
          return a.insight_type.localeCompare(b.insight_type);
        case 'date':
        default:
          // Sort by criticality first, then by date
          const aCritical = a.critical_alerts?.some((alert: CriticalAlert) => alert.severity === 'CRITICAL') ? 1 : 0;
          const bCritical = b.critical_alerts?.some((alert: CriticalAlert) => alert.severity === 'CRITICAL') ? 1 : 0;
          
          if (aCritical !== bCritical) {
            return bCritical - aCritical; // Critical first
          }
          
          return new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime();
      }
    });

    return filtered;
  }, [processedInsights, issues, searchTerm, selectedType, sortBy]);

  // Group insights by type for summary with processing
  const insightsByType = useMemo(() => {
    const groups: Record<string, any[]> = {};
    
    filteredInsights.forEach((insight) => {
      const type = insight.insight_type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(insight);
    });
    return groups;
  }, [filteredInsights]);

  // Critical insights for dashboard
  const criticalInsights = useMemo(() => {
    return filteredInsights.filter(insight => 
      insight.critical_alerts?.some((alert: CriticalAlert) => alert.severity === 'CRITICAL')
    );
  }, [filteredInsights]);

  // Get unique insight types for filter
  const insightTypes = useMemo(() => {
    return [...new Set(insights.map(i => i.insight_type))];
  }, [insights]);

  const getInsightIcon = (type: string) => {
    const icons = {
      'sla_risk': AlertTriangle,
      'sprint_prediction': Target,
      'sentiment': Users,
      'cost_analysis': DollarSign,
      'productivity_economics': BarChart3,
      'budget_alerts': AlertCircle,
      'team_performance': TrendingUp,
      // GitHub AI Insights Icons
      'github_security': AlertTriangle,
      'github_quality': CheckCircle,
      'github_testing': Target,
      'github_performance': TrendingUp,
      'github_pipeline': Clock,
      'github_dev_performance': Users,
      'github_release_prediction': Calendar
    };
    return icons[type as keyof typeof icons] || Brain;
  };

  const getInsightColor = (confidence: number, type: string) => {
    if (type === 'sla_risk') {
      if (confidence > 0.7) return 'text-red-500';
      if (confidence > 0.4) return 'text-orange-500';
      return 'text-green-500';
    }
    
    if (confidence > 0.8) return 'text-green-500';
    if (confidence > 0.6) return 'text-orange-500';
    return 'text-red-500';
  };

  const formatInsightType = (type: string) => {
    const types = {
      'sla_risk': 'Risco SLA',
      'sprint_prediction': 'Previsão Sprint',
      'sentiment': 'Análise de Sentimento',
      'cost_analysis': 'Análise de Custos',
      'productivity_economics': 'Economia e Produtividade',
      'budget_alerts': 'Alertas Orçamentários',
      'team_performance': 'Performance da Equipe',
      // GitHub AI Insights Types
      'github_security': 'Segurança do Código',
      'github_quality': 'Qualidade do Código', 
      'github_testing': 'Cobertura de Testes',
      'github_performance': 'Performance do Código',
      'github_pipeline': 'Saúde do Pipeline',
      'github_dev_performance': 'Performance da Equipe',
      'github_release_prediction': 'Previsão de Release',
      'github_code_insights': 'GitHub Code Insights'
    };
    return types[type as keyof typeof types] || type.replace(/_/g, ' ');
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-success';
    if (score >= 0.6) return 'text-warning';
    return 'text-destructive';
  };

  const getConfidenceBadgeVariant = (score: number) => {
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'destructive';
  };

  const generateInsight = async (action: string, buttonText: string) => {
    if (!selectedConfig) {
      toast({
        title: "Erro",
        description: "Nenhuma configuração Jira selecionada",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(action);
    try {
      const { data, error } = await supabase.functions.invoke('jira-ai-insights', {
        body: { 
          action,
          project_keys: selectedConfig.project_keys,
          config_id: selectedConfig.id
        }
      });

      if (error) throw error;

      toast({
        title: "Insight Gerado",
        description: `${buttonText} concluído com sucesso!`,
      });

      // Refresh the page to show new insights
      window.location.reload();

    } catch (error: any) {
      toast({
        title: "Erro ao gerar insight",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Brain className="h-6 w-6 text-primary" />
                Insights de IA
              </CardTitle>
              <CardDescription className="text-base">
                {insights.length} insights disponíveis • {insightTypes.length} tipos diferentes
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-lg px-4 py-2">
                <BarChart3 className="h-4 w-4 mr-2" />
                {insights.length}
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Enhanced Summary Cards by Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(insightsByType).map(([type, typeInsights]) => {
          const IconComponent = getInsightIcon(type);
          const averageConfidence = typeInsights.reduce((sum, insight) => sum + (insight.confidence_score || 0), 0) / typeInsights.length;
          const criticalCount = typeInsights.filter(insight => 
            insight.critical_alerts?.some((alert: CriticalAlert) => alert.severity === 'CRITICAL')
          ).length;
          const criticalAlerts = typeInsights.flatMap(insight => 
            insight.critical_alerts?.filter((alert: CriticalAlert) => alert.severity === 'CRITICAL') || []
          );
          
          return (
            <Card 
              key={type} 
              className={cn(
                "hover:shadow-md transition-shadow cursor-pointer",
                criticalCount > 0 && "border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-950/10"
              )}
              onClick={() => setSelectedType(type)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconComponent className={cn(
                      "h-5 w-5",
                      criticalCount > 0 ? "text-red-500" : "text-primary"
                    )} />
                    <CardTitle className="text-base">{formatInsightType(type)}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="secondary">{typeInsights.length}</Badge>
                    {criticalCount > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        <Flame className="h-3 w-3 mr-1" />
                        {criticalCount}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Confiabilidade Média</span>
                    <span className={cn("font-semibold", getConfidenceColor(averageConfidence))}>
                      {Math.round(averageConfidence * 100)}%
                    </span>
                  </div>
                  {criticalCount > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs text-red-600 dark:text-red-400 font-medium">
                        ⚠️ {criticalCount} alerta(s) crítico(s) requer(em) ação imediata
                      </div>
                      {criticalAlerts.slice(0, 2).map((alert: CriticalAlert, index: number) => (
                        <div key={index} className="p-2 bg-red-100 dark:bg-red-950/50 rounded text-xs">
                          <div className="font-medium text-red-800 dark:text-red-300">
                            {alert.title}
                          </div>
                          {alert.relatedIssues && alert.relatedIssues.length > 0 && (
                            <div className="mt-1 space-x-1">
                              {alert.relatedIssues.slice(0, 3).map((issue, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs h-5">
                                  {issue.jira_key}
                                </Badge>
                              ))}
                              {alert.relatedIssues.length > 3 && (
                                <Badge variant="outline" className="text-xs h-5">
                                  +{alert.relatedIssues.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Último: {new Date(Math.max(...typeInsights.map(i => new Date(i.generated_at).getTime()))).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar insights..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedType} onValueChange={setSelectedType}>
                <SelectTrigger className="w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {insightTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {formatInsightType(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Por data</SelectItem>
                  <SelectItem value="criticality">Por criticidade</SelectItem>
                  <SelectItem value="confidence">Por confiabilidade</SelectItem>
                  <SelectItem value="type">Por tipo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs com Insights da IA e Comentários Manuais */}
      <Tabs defaultValue="ai-insights" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ai-insights" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Insights IA ({filteredInsights.length})
          </TabsTrigger>
          <TabsTrigger value="manual-comments" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Insights Manuais
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="ai-insights" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Insights Gerados pela IA ({filteredInsights.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredInsights.length > 0 ? (
                <div className="space-y-4">
                  {filteredInsights.map((insight) => {
                    const IconComponent = getInsightIcon(insight.insight_type);
                    const issue = insight.issue_id ? issues.find(i => i.id === insight.issue_id) : null;
                    const insightData = insight.insight_data || {};
                    const criticalAlerts = insight.critical_alerts?.filter((a: CriticalAlert) => a.severity === 'CRITICAL') || [];
                    const hasCritical = criticalAlerts.length > 0;

                    return (
                      <div 
                        key={insight.id} 
                        className={cn(
                          "p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors",
                          hasCritical && "border-red-200 bg-red-50/30 dark:border-red-800 dark:bg-red-950/10"
                        )}
                        onClick={() => setSelectedInsight(insight)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-start gap-3 flex-1">
                            <IconComponent className={cn(
                              "h-5 w-5 mt-1 flex-shrink-0",
                              hasCritical ? "text-red-500" : "text-primary"
                            )} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <Badge variant="outline">
                                  {formatInsightType(insight.insight_type)}
                                </Badge>
                                <Badge 
                                  variant={getConfidenceBadgeVariant(insight.confidence_score)}
                                  className="text-xs"
                                >
                                  {Math.round(insight.confidence_score * 100)}%
                                </Badge>
                                {hasCritical && (
                                  <Badge variant="destructive" className="text-xs">
                                    <Flame className="h-3 w-3 mr-1" />
                                    CRÍTICO
                                  </Badge>
                                )}
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(insight.generated_at).toLocaleDateString('pt-BR')}
                                </div>
                              </div>
                              
                              {/* Critical Alerts Preview */}
                              {criticalAlerts.length > 0 && (
                                <div className="mb-3 p-2 bg-red-100 dark:bg-red-950/20 border-l-4 border-red-500 rounded-r">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Flame className="h-4 w-4 text-red-600" />
                                    <span className="text-sm font-semibold text-red-800 dark:text-red-300">
                                      Ação Crítica Necessária
                                    </span>
                                  </div>
                                  <p className="text-sm text-red-700 dark:text-red-400 line-clamp-2">
                                    {criticalAlerts[0].description}
                                  </p>
                                  {criticalAlerts.length > 1 && (
                                    <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                                      +{criticalAlerts.length - 1} outro(s) alerta(s) crítico(s)
                                    </p>
                                  )}
                                </div>
                              )}
                              
                              {issue && (
                                <div className="mb-2">
                                  <Badge variant="secondary" className="font-mono text-xs">
                                    {issue.jira_key}
                                  </Badge>
                                  <p className="font-medium mt-1 line-clamp-1">{issue.summary}</p>
                                </div>
                              )}
                              
                              {/* Executive Summary */}
                              {insight.executive_summary && (
                                <p className="text-muted-foreground text-sm line-clamp-2 mb-2 font-medium">
                                  {insight.executive_summary}
                                </p>
                              )}
                              
                              {/* Fallback to regular summary */}
                              {!insight.executive_summary && insightData.summary && (
                                <p className="text-muted-foreground text-sm line-clamp-2 mb-2">
                                  {insightData.summary}
                                </p>
                              )}
                              
                              {insightData.key_findings && Array.isArray(insightData.key_findings) && (
                                <div className="text-xs text-muted-foreground">
                                  <strong>Principais descobertas:</strong> {insightData.key_findings.slice(0, 2).join(' • ')}
                                  {insightData.key_findings.length > 2 && '...'}
                                </div>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="ml-2 flex-shrink-0">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-lg font-medium">Nenhum insight encontrado</p>
                  <p className="text-sm">
                    {searchTerm || selectedType !== 'all' 
                      ? 'Tente ajustar os filtros de busca' 
                      : 'Execute uma sincronização para gerar insights'
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="manual-comments" className="mt-6">
          {projectId && <InsightComments projectId={projectId} clientId={clientId} />}
        </TabsContent>
      </Tabs>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => generateInsight('analyze_team_performance', 'Relatório de Performance')}
            disabled={isGenerating === 'analyze_team_performance'}
          >
            {isGenerating === 'analyze_team_performance' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <TrendingUp className="h-4 w-4 mr-2" />
            )}
            Gerar Relatório de Performance
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => generateInsight('productivity_economics', 'Análise de Produtividade')}
            disabled={isGenerating === 'productivity_economics'}
          >
            {isGenerating === 'productivity_economics' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Users className="h-4 w-4 mr-2" />
            )}
            Analisar Produtividade/Custo
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => generateInsight('cost_analysis', 'Análise de Custo')}
            disabled={isGenerating === 'cost_analysis'}
          >
            {isGenerating === 'cost_analysis' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <DollarSign className="h-4 w-4 mr-2" />
            )}
            Análise de Custos
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full justify-start"
            onClick={() => generateInsight('budget_alerts', 'Alertas Orçamentários')}
            disabled={isGenerating === 'budget_alerts'}
          >
            {isGenerating === 'budget_alerts' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-2" />
            )}
            Alertas de Orçamento
          </Button>
        </CardContent>
      </Card>

      {/* Insight Detail Modal */}
      <InsightDetailModal
        open={!!selectedInsight}
        onOpenChange={(open) => !open && setSelectedInsight(null)}
        insight={selectedInsight}
        relatedIssue={selectedInsight?.issue_id ? issues.find(i => i.id === selectedInsight.issue_id) : null}
      />
    </div>
  );
};

export default AIInsightsPanel;