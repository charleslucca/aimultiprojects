import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  Loader2
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
  // Group insights by type
  const slaRiskInsights = insights.filter(i => i.insight_type === 'sla_risk');
  const sprintPredictions = insights.filter(i => i.insight_type === 'sprint_prediction');
  const sentimentInsights = insights.filter(i => i.insight_type === 'sentiment');

  // Calculate high-risk issues
  const highRiskIssues = slaRiskInsights.filter(insight => insight.confidence_score > 0.7);
  const mediumRiskIssues = slaRiskInsights.filter(insight => 
    insight.confidence_score >= 0.4 && insight.confidence_score <= 0.7
  );

  // Get recent insights (last 24 hours)
  const recentInsights = insights.filter(insight => {
    const insightDate = new Date(insight.generated_at);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return insightDate > dayAgo;
  }).slice(0, 5);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'sla_risk':
        return AlertTriangle;
      case 'sprint_prediction':
        return Target;
      case 'sentiment':
        return Users;
      default:
        return Brain;
    }
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
    switch (type) {
      case 'sla_risk':
        return 'Risco SLA';
      case 'sprint_prediction':
        return 'Previsão Sprint';
      case 'sentiment':
        return 'Sentimento';
      case 'cost_analysis':
        return 'Análise de Custo';
      case 'productivity_economics':
        return 'Economia Produtiva';
      case 'budget_alerts':
        return 'Alertas Orçamentários';
      default:
        return type;
    }
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
    <div className="space-y-4">
      {/* AI Insights Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-500" />
            Insights de IA
          </CardTitle>
          <CardDescription>
            Análises inteligentes em tempo real dos seus projetos
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Risk Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            Alertas de Risco
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-red-600">{highRiskIssues.length}</div>
              <div className="text-xs text-muted-foreground">Alto Risco</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{mediumRiskIssues.length}</div>
              <div className="text-xs text-muted-foreground">Médio Risco</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {slaRiskInsights.length - highRiskIssues.length - mediumRiskIssues.length}
              </div>
              <div className="text-xs text-muted-foreground">Baixo Risco</div>
            </div>
          </div>

          {highRiskIssues.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm text-red-600 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Issues Críticas
              </h4>
              {highRiskIssues.slice(0, 3).map((insight) => {
                const issue = issues.find(i => i.id === insight.issue_id);
                if (!issue) return null;

                return (
                  <div key={insight.id} className="p-2 bg-red-50 rounded border-l-2 border-red-200">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <Badge variant="outline" className="text-xs mb-1">
                          {issue.jira_key}
                        </Badge>
                        <p className="text-xs font-medium line-clamp-1">
                          {issue.summary}
                        </p>
                      </div>
                      <Badge variant="destructive" className="text-xs">
                        {Math.round(insight.confidence_score * 100)}%
                      </Badge>
                    </div>
                    {insight.insight_data?.recommendations && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {insight.insight_data.recommendations.slice(0, 80)}...
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sprint Predictions */}
      {sprintPredictions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-4 w-4 text-blue-500" />
              Previsões de Sprint
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sprintPredictions.slice(0, 2).map((prediction) => (
              <div key={prediction.id} className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">
                    {prediction.insight_data?.sprint_name || 'Sprint Ativo'}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-sm font-medium">
                      {Math.round((prediction.confidence_score || 0) * 100)}%
                    </span>
                  </div>
                </div>
                
                <Progress 
                  value={(prediction.confidence_score || 0) * 100} 
                  className="mb-2" 
                />
                
                {prediction.insight_data?.velocity_insights && (
                  <p className="text-xs text-muted-foreground">
                    {prediction.insight_data.velocity_insights}
                  </p>
                )}
                
                {prediction.insight_data?.recommendations && (
                  <div className="mt-2 p-2 bg-blue-50 rounded text-xs">
                    <p className="font-medium text-blue-800">Recomendação:</p>
                    <p className="text-blue-700">
                      {Array.isArray(prediction.insight_data.recommendations) 
                        ? prediction.insight_data.recommendations[0]
                        : prediction.insight_data.recommendations
                      }
                    </p>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Insights Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentInsights.length > 0 ? (
            <div className="space-y-3">
              {recentInsights.map((insight) => {
                const IconComponent = getInsightIcon(insight.insight_type);
                const issue = insight.issue_id ? issues.find(i => i.id === insight.issue_id) : null;

                return (
                  <div key={insight.id} className="flex items-start gap-3 p-2 hover:bg-muted/50 rounded">
                    <IconComponent 
                      className={cn(
                        "h-4 w-4 mt-0.5",
                        getInsightColor(insight.confidence_score, insight.insight_type)
                      )} 
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs">
                          {formatInsightType(insight.insight_type)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(insight.generated_at).toLocaleTimeString('pt-BR', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {issue && (
                        <p className="text-sm font-medium line-clamp-1">
                          {issue.jira_key}: {issue.summary}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Confiabilidade: {Math.round(insight.confidence_score * 100)}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm">Nenhum insight recente</p>
              <p className="text-xs">
                Execute uma sincronização para gerar novos insights
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
    </div>
  );
};

export default AIInsightsPanel;