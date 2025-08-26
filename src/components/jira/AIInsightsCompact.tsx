import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  AlertTriangle, 
  TrendingUp, 
  Clock, 
  Brain,
  CheckCircle,
  AlertCircle,
  Info,
  Loader2,
  BarChart3
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIInsightsCompactProps {
  insights: any[];
  issues: any[];
  projects: any[];
  selectedConfig?: any;
  projectId?: string;
  onInsightGenerated?: () => void;
}

const AIInsightsCompact: React.FC<AIInsightsCompactProps> = ({ 
  insights, 
  issues, 
  projects, 
  selectedConfig,
  projectId,
  onInsightGenerated 
}) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState<string | null>(null);

  // Group insights by type
  const slaRiskInsights = insights.filter(i => i.insight_type === 'sla_risk');
  const sprintPredictions = insights.filter(i => i.insight_type === 'sprint_prediction');

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
  }).slice(0, 3);

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
          project_id: projectId,
          project_keys: selectedConfig.project_keys,
          config_id: selectedConfig.id
        }
      });

      if (error) throw error;

      toast({
        title: "Insight Gerado",
        description: `${buttonText} concluído com sucesso!`,
      });

      // Call the callback to refresh data
      if (onInsightGenerated) {
        onInsightGenerated();
      }

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

  return (
    <div className="space-y-6">
      {/* Critical Alerts */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Alertas Críticos
          </CardTitle>
          <CardDescription>
            Issues que requerem atenção imediata
          </CardDescription>
        </CardHeader>
        <CardContent>
          {highRiskIssues.length > 0 ? (
            <div className="space-y-4">
              {highRiskIssues.slice(0, 3).map((insight) => {
                const issue = issues.find(i => i.id === insight.issue_id);
                if (!issue) return null;

                return (
                  <div key={insight.id} className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <Badge variant="destructive" className="mb-2">
                          {issue.jira_key}
                        </Badge>
                        <h4 className="font-semibold text-lg">{issue.summary}</h4>
                      </div>
                      <Badge variant="outline" className="text-destructive border-destructive">
                        {Math.round(insight.confidence_score * 100)}% risco
                      </Badge>
                    </div>
                    {insight.insight_data?.recommendations && (
                      <p className="text-muted-foreground mt-2">
                        {Array.isArray(insight.insight_data.recommendations) 
                          ? insight.insight_data.recommendations[0]
                          : insight.insight_data.recommendations
                        }
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-success" />
              <p className="text-lg font-medium text-success">Nenhum alerta crítico</p>
              <p className="text-sm">Todos os issues estão dentro do SLA esperado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Ações Rápidas
          </CardTitle>
          <CardDescription>
            Gere insights inteligentes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button 
            variant="outline" 
            className="w-full justify-start h-12"
            onClick={() => generateInsight('analyze_team_performance', 'Análise de Performance')}
            disabled={isGenerating === 'analyze_team_performance'}
          >
            {isGenerating === 'analyze_team_performance' ? (
              <Loader2 className="h-4 w-4 mr-3 animate-spin" />
            ) : (
              <TrendingUp className="h-4 w-4 mr-3" />
            )}
            <div className="text-left">
              <div className="font-medium">Performance da Equipe</div>
              <div className="text-xs text-muted-foreground">Análise detalhada de produtividade</div>
            </div>
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start h-12"
            onClick={() => generateInsight('cost_analysis', 'Análise de Custos')}
            disabled={isGenerating === 'cost_analysis'}
          >
            {isGenerating === 'cost_analysis' ? (
              <Loader2 className="h-4 w-4 mr-3 animate-spin" />
            ) : (
              <BarChart3 className="h-4 w-4 mr-3" />
            )}
            <div className="text-left">
              <div className="font-medium">Análise de Custos</div>
              <div className="text-xs text-muted-foreground">Relatório financeiro do projeto</div>
            </div>
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full justify-start h-12"
            onClick={() => generateInsight('predict_sprint_completion', 'Previsão de Sprint')}
            disabled={isGenerating === 'predict_sprint_completion'}
          >
            {isGenerating === 'predict_sprint_completion' ? (
              <Loader2 className="h-4 w-4 mr-3 animate-spin" />
            ) : (
              <AlertTriangle className="h-4 w-4 mr-3" />
            )}
            <div className="text-left">
              <div className="font-medium">Previsão de Sprint</div>
              <div className="text-xs text-muted-foreground">Probabilidade de conclusão</div>
            </div>
          </Button>
        </CardContent>
      </Card>

      {/* Sprint Predictions */}
      {sprintPredictions.length > 0 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Previsões de Sprint
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sprintPredictions.slice(0, 2).map((prediction) => (
                <div key={prediction.id} className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="secondary">
                      {prediction.insight_data?.sprint_name || 'Sprint Ativo'}
                    </Badge>
                    <span className="text-lg font-bold text-primary">
                      {Math.round((prediction.confidence_score || 0) * 100)}%
                    </span>
                  </div>
                  
                  {prediction.insight_data?.recommendations && (
                    <p className="text-muted-foreground text-sm">
                      {Array.isArray(prediction.insight_data.recommendations) 
                        ? prediction.insight_data.recommendations[0]
                        : prediction.insight_data.recommendations
                      }
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Analysis */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Análise de Riscos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center mb-4">
            <div className="p-3 bg-destructive/10 rounded-lg">
              <div className="text-2xl font-bold text-destructive">
                {highRiskIssues.length}
              </div>
              <div className="text-xs text-muted-foreground">Alto Risco</div>
            </div>
            <div className="p-3 bg-warning/10 rounded-lg">
              <div className="text-2xl font-bold text-warning">
                {mediumRiskIssues.length}
              </div>
              <div className="text-xs text-muted-foreground">Médio Risco</div>
            </div>
            <div className="p-3 bg-success/10 rounded-lg">
              <div className="text-2xl font-bold text-success">
                {slaRiskInsights.length - highRiskIssues.length - mediumRiskIssues.length}
              </div>
              <div className="text-xs text-muted-foreground">Baixo Risco</div>
            </div>
          </div>
          
          {slaRiskInsights.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              <p className="text-sm">Execute uma sincronização para analisar riscos</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentInsights.length > 0 ? (
            <div className="space-y-3">
              {recentInsights.map((insight) => {
                const issue = insight.issue_id ? issues.find(i => i.id === insight.issue_id) : null;

                return (
                  <div key={insight.id} className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-lg">
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
    </div>
  );
};

export default AIInsightsCompact;