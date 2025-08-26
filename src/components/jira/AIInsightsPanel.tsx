import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import InsightDetailModal from './InsightDetailModal';
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
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIInsightsPanelProps {
  insights: any[];
  issues: any[];
  projects: any[];
  selectedConfig?: any;
}

const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({ insights, issues, projects, selectedConfig }) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState<string | null>(null);
  const [selectedInsight, setSelectedInsight] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');

  // Memoized filtered and sorted insights
  const filteredInsights = useMemo(() => {
    let filtered = insights;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(insight => {
        const insightText = JSON.stringify(insight.insight_data).toLowerCase();
        const relatedIssue = issues.find(i => i.id === insight.issue_id);
        const issueText = relatedIssue ? `${relatedIssue.jira_key} ${relatedIssue.summary}`.toLowerCase() : '';
        return insightText.includes(searchTerm.toLowerCase()) || issueText.includes(searchTerm.toLowerCase());
      });
    }

    // Filter by type
    if (selectedType !== 'all') {
      filtered = filtered.filter(insight => insight.insight_type === selectedType);
    }

    // Sort insights
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'confidence':
          return (b.confidence_score || 0) - (a.confidence_score || 0);
        case 'type':
          return a.insight_type.localeCompare(b.insight_type);
        case 'date':
        default:
          return new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime();
      }
    });

    return filtered;
  }, [insights, issues, searchTerm, selectedType, sortBy]);

  // Group insights by type for summary
  const insightsByType = useMemo(() => {
    const groups: Record<string, any[]> = {};
    insights.forEach((insight) => {
      const type = insight.insight_type;
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(insight);
    });
    return groups;
  }, [insights]);

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
      'team_performance': TrendingUp
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
      'team_performance': 'Performance da Equipe'
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

      {/* Summary Cards by Type */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Object.entries(insightsByType).map(([type, typeInsights]) => {
          const IconComponent = getInsightIcon(type);
          const averageConfidence = typeInsights.reduce((sum, insight) => sum + (insight.confidence_score || 0), 0) / typeInsights.length;
          
          return (
            <Card key={type} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedType(type)}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconComponent className="h-5 w-5 text-primary" />
                    <CardTitle className="text-base">{formatInsightType(type)}</CardTitle>
                  </div>
                  <Badge variant="secondary">{typeInsights.length}</Badge>
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
                  <SelectItem value="confidence">Por confiabilidade</SelectItem>
                  <SelectItem value="type">Por tipo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Insights List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Todos os Insights ({filteredInsights.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInsights.length > 0 ? (
            <div className="space-y-4">
              {filteredInsights.map((insight) => {
                const IconComponent = getInsightIcon(insight.insight_type);
                const issue = insight.issue_id ? issues.find(i => i.id === insight.issue_id) : null;
                const insightData = insight.insight_data || {};

                return (
                  <div 
                    key={insight.id} 
                    className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedInsight(insight)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3 flex-1">
                        <IconComponent className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant="outline">
                              {formatInsightType(insight.insight_type)}
                            </Badge>
                            <Badge 
                              variant={getConfidenceBadgeVariant(insight.confidence_score)}
                              className="text-xs"
                            >
                              {Math.round(insight.confidence_score * 100)}%
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {new Date(insight.generated_at).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                          
                          {issue && (
                            <div className="mb-2">
                              <Badge variant="secondary" className="font-mono text-xs">
                                {issue.jira_key}
                              </Badge>
                              <p className="font-medium mt-1 line-clamp-1">{issue.summary}</p>
                            </div>
                          )}
                          
                          {insightData.summary && (
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