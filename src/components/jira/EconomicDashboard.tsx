import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DollarSign, TrendingUp, AlertTriangle, Target, Users, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EconomicDashboardProps {
  insights: any[];
  issues: any[];
  projects: any[];
}

const EconomicDashboard: React.FC<EconomicDashboardProps> = ({ insights, issues, projects }) => {
  const [economicData, setEconomicData] = useState<any>({
    totalCost: 0,
    completedCost: 0,
    budgetUsed: 0,
    costPerStoryPoint: 0,
    mostExpensiveIssues: [],
    teamProductivity: []
  });

  useEffect(() => {
    calculateEconomicMetrics();
  }, [insights, issues]);

  const calculateEconomicMetrics = () => {
    const costInsights = insights.filter(i => i.insight_type === 'cost_analysis');
    const productivityInsights = insights.filter(i => i.insight_type === 'productivity_economics');
    const budgetInsights = insights.filter(i => i.insight_type === 'budget_alerts');

    if (costInsights.length > 0) {
      const latestCostInsight = costInsights[0];
      const data = latestCostInsight.insight_data;

      setEconomicData({
        totalCost: data.total_cost || 0,
        completedCost: data.completed_cost || 0,
        budgetUsed: data.cost_completion_rate || 0,
        costPerStoryPoint: data.total_cost / (issues.reduce((sum, issue) => sum + (issue.story_points || 0), 0) || 1),
        mostExpensiveIssues: (data.cost_effective_issues || []).slice(0, 5),
        teamProductivity: productivityInsights[0]?.insight_data?.productivity_data || {},
        budgetAlerts: budgetInsights[0]?.insight_data || {}
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getProductivityColor = (completionRate: number) => {
    if (completionRate >= 80) return 'text-green-600';
    if (completionRate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const totalStoryPoints = issues.reduce((sum, issue) => sum + (issue.story_points || 0), 0);
  const completedStoryPoints = issues
    .filter(issue => issue.status === 'Done')
    .reduce((sum, issue) => sum + (issue.story_points || 0), 0);

  const completionRate = totalStoryPoints > 0 ? (completedStoryPoints / totalStoryPoints) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Economic Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Total Estimado</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(economicData.totalCost)}</div>
            <p className="text-xs text-muted-foreground">
              Baseado em participações ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Trabalho Concluído</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(economicData.completedCost)}</div>
            <p className="text-xs text-muted-foreground">
              {completionRate.toFixed(1)}% do projeto
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo por Story Point</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(economicData.costPerStoryPoint)}
            </div>
            <p className="text-xs text-muted-foreground">
              Média por SP entregue
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficiência Orçamentária</CardTitle>
            <TrendingUp className={cn(
              "h-4 w-4",
              economicData.budgetUsed <= 1 ? 'text-green-500' : 'text-red-500'
            )} />
          </CardHeader>
          <CardContent>
            <div className={cn(
              "text-2xl font-bold",
              economicData.budgetUsed <= 1 ? 'text-green-600' : 'text-red-600'
            )}>
              {(economicData.budgetUsed * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              Orçamento utilizado
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-500" />
            Progresso vs. Orçamento
          </CardTitle>
          <CardDescription>
            Comparação entre trabalho concluído e orçamento consumido
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Trabalho Concluído</span>
              <span>{completionRate.toFixed(1)}%</span>
            </div>
            <Progress value={completionRate} className="h-2" />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Orçamento Utilizado</span>
              <span className={cn(
                economicData.budgetUsed <= 1 ? 'text-green-600' : 'text-red-600'
              )}>
                {(economicData.budgetUsed * 100).toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={Math.min(economicData.budgetUsed * 100, 100)} 
              className={cn(
                "h-2",
                economicData.budgetUsed > 1 && "[&>div]:bg-red-500"
              )} 
            />
          </div>

          {economicData.budgetUsed > 1 && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <div className="text-sm">
                <p className="font-medium text-red-700">Alerta: Estouro de Orçamento</p>
                <p className="text-red-600">
                  O projeto está {((economicData.budgetUsed - 1) * 100).toFixed(1)}% acima do previsto
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Team Productivity Economics */}
      {Object.keys(economicData.teamProductivity).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-500" />
              Produtividade da Equipe
            </CardTitle>
            <CardDescription>
              Análise custo-benefício por membro da equipe
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(economicData.teamProductivity)
                .slice(0, 5)
                .map(([member, data]: [string, any]) => {
                  const completionRate = data.total_issues > 0 ? 
                    (data.completed_issues / data.total_issues) * 100 : 0;
                  const costPerStoryPoint = data.story_points > 0 ? 
                    data.estimated_cost / data.story_points : 0;

                  return (
                    <div key={member} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{member}</span>
                          <Badge 
                            variant={completionRate >= 70 ? "default" : completionRate >= 50 ? "secondary" : "destructive"}
                            className="text-xs"
                          >
                            {completionRate.toFixed(0)}% concluído
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <span>Issues: {data.completed_issues}/{data.total_issues}</span>
                          <span>Story Points: {data.story_points}</span>
                          <span>Custo: {formatCurrency(data.estimated_cost)}</span>
                          <span>R$/SP: {formatCurrency(costPerStoryPoint)}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          "text-lg font-bold",
                          getProductivityColor(completionRate)
                        )}>
                          {completionRate.toFixed(0)}%
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Produtividade
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Budget Alerts */}
      {economicData.budgetAlerts?.critical_warnings?.length > 0 && (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Alertas Orçamentários
            </CardTitle>
            <CardDescription>
              Avisos críticos sobre o orçamento do projeto
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {economicData.budgetAlerts.critical_warnings.map((warning: string, index: number) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-800">Aviso Crítico</p>
                    <p className="text-sm text-red-700">{warning}</p>
                  </div>
                </div>
              ))}
            </div>

            {economicData.budgetAlerts.optimization_suggestions && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-medium text-blue-800 mb-2">Recomendações de Otimização:</p>
                <ul className="text-sm text-blue-700 space-y-1">
                  {Array.isArray(economicData.budgetAlerts.optimization_suggestions) 
                    ? economicData.budgetAlerts.optimization_suggestions.map((suggestion: string, index: number) => (
                        <li key={index}>• {suggestion}</li>
                      ))
                    : <li>• {economicData.budgetAlerts.optimization_suggestions}</li>
                  }
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Most Expensive Issues */}
      {economicData.mostExpensiveIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              Issues de Maior Impacto Financeiro
            </CardTitle>
            <CardDescription>
              Top 5 issues com maior custo estimado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {economicData.mostExpensiveIssues.map((issue: any, index: number) => (
                <div key={issue.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {issue.jira_key}
                      </Badge>
                      <Badge variant={issue.status === 'Done' ? 'default' : 'secondary'} className="text-xs">
                        {issue.status}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium line-clamp-1 mb-1">
                      {issue.summary}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>SP: {issue.story_points || 0}</span>
                      <span>Assignee: {issue.assignee_name || 'Não atribuído'}</span>
                      <span>Prioridade: {issue.priority}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-green-600">
                      {formatCurrency(issue.estimated_cost || 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Custo estimado
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ROI Insights */}
      {(() => {
        const roiInsights = insights.find(i => i.insight_type === 'cost_analysis')?.insight_data?.roi_insights;
        if (!roiInsights) return null;

        // Handle case where roi_insights is an object
        if (typeof roiInsights === 'object' && roiInsights !== null) {
          return (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Insights de ROI
                </CardTitle>
                <CardDescription>
                  Análise de retorno sobre investimento
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {roiInsights.current_roi && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-medium text-green-800 mb-1">ROI Atual:</p>
                      <p className="text-sm text-green-700">{roiInsights.current_roi}</p>
                    </div>
                  )}
                  {roiInsights.future_roi_potential && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm font-medium text-blue-800 mb-1">Potencial ROI Futuro:</p>
                      <p className="text-sm text-blue-700">{roiInsights.future_roi_potential}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        }

        // Handle case where roi_insights is a string
        return (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-blue-500" />
                Insights de ROI
              </CardTitle>
              <CardDescription>
                Análise de retorno sobre investimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">{String(roiInsights)}</p>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
};

export default EconomicDashboard;