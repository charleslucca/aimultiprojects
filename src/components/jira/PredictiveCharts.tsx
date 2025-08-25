import React, { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Activity, DollarSign, AlertTriangle } from 'lucide-react';

interface PredictiveChartsProps {
  issues: any[];
  insights: any[];
  projects: any[];
}

const PredictiveCharts: React.FC<PredictiveChartsProps> = ({ issues, insights, projects }) => {
  // Burndown chart data with predictions
  const burndownData = useMemo(() => {
    // Group issues by creation week for the last 8 weeks
    const weeks = [];
    const now = new Date();
    
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weekIssues = issues.filter(issue => {
        const createdDate = new Date(issue.created_date);
        return createdDate >= weekStart && createdDate <= weekEnd;
      });

      const completedIssues = issues.filter(issue => {
        if (!issue.resolved_date) return false;
        const resolvedDate = new Date(issue.resolved_date);
        return resolvedDate >= weekStart && resolvedDate <= weekEnd;
      });

      weeks.push({
        week: `Sem ${i === 0 ? 'Atual' : i + 1}`,
        created: weekIssues.length,
        completed: completedIssues.length,
        cumulative: weeks.reduce((sum, w) => sum + w.created, 0) + weekIssues.length - 
                   weeks.reduce((sum, w) => sum + w.completed, 0) - completedIssues.length
      });
    }

    // Add prediction for next 2 weeks based on trend
    const recentWeeks = weeks.slice(-4);
    const avgCreated = recentWeeks.reduce((sum, w) => sum + w.created, 0) / recentWeeks.length;
    const avgCompleted = recentWeeks.reduce((sum, w) => sum + w.completed, 0) / recentWeeks.length;

    const lastCumulative = weeks[weeks.length - 1]?.cumulative || 0;

    // Prediction weeks
    weeks.push({
      week: '+1 Sem',
      created: Math.round(avgCreated),
      completed: Math.round(avgCompleted * 1.1), // Slight improvement
      cumulative: lastCumulative + Math.round(avgCreated - avgCompleted * 1.1),
      predicted: true
    });

    weeks.push({
      week: '+2 Sem',
      created: Math.round(avgCreated * 0.9),
      completed: Math.round(avgCompleted * 1.2), // Better improvement
      cumulative: lastCumulative + Math.round(avgCreated - avgCompleted * 1.1) + 
                 Math.round(avgCreated * 0.9 - avgCompleted * 1.2),
      predicted: true
    });

    return weeks;
  }, [issues]);

  // Team performance data
  const teamPerformanceData = useMemo(() => {
    const assigneeStats = issues.reduce((stats: any, issue) => {
      if (!issue.assignee_name) return stats;
      
      if (!stats[issue.assignee_name]) {
        stats[issue.assignee_name] = {
          name: issue.assignee_name,
          total: 0,
          completed: 0,
          storyPoints: 0,
          avgTimeToComplete: 0
        };
      }
      
      stats[issue.assignee_name].total++;
      stats[issue.assignee_name].storyPoints += issue.story_points || 0;
      
      if (issue.status === 'Done' && issue.resolved_date && issue.created_date) {
        stats[issue.assignee_name].completed++;
        const timeToComplete = new Date(issue.resolved_date).getTime() - new Date(issue.created_date).getTime();
        const daysToComplete = timeToComplete / (1000 * 60 * 60 * 24);
        stats[issue.assignee_name].avgTimeToComplete = daysToComplete;
      }
      
      return stats;
    }, {});

    return Object.values(assigneeStats)
      .map((stats: any) => ({
        ...stats,
        completionRate: stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0,
        velocity: stats.storyPoints / Math.max(stats.total, 1)
      }))
      .sort((a: any, b: any) => b.completionRate - a.completionRate)
      .slice(0, 8); // Top 8 performers
  }, [issues]);

  // Issue type distribution
  const issueTypeData = useMemo(() => {
    const typeStats = issues.reduce((stats: any, issue) => {
      const type = issue.issue_type || 'Unknown';
      stats[type] = (stats[type] || 0) + 1;
      return stats;
    }, {});

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];
    
    return Object.entries(typeStats).map(([type, count], index) => ({
      name: type,
      value: count,
      color: colors[index % colors.length]
    }));
  }, [issues]);

  // Risk trend over time
  const riskTrendData = useMemo(() => {
    const slaRiskInsights = insights.filter(i => i.insight_type === 'sla_risk');
    
    // Group by date
    const riskByDate = slaRiskInsights.reduce((acc: any, insight) => {
      const date = new Date(insight.generated_at).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, highRisk: 0, mediumRisk: 0, lowRisk: 0, total: 0 };
      }
      
      acc[date].total++;
      if (insight.confidence_score > 0.7) acc[date].highRisk++;
      else if (insight.confidence_score > 0.4) acc[date].mediumRisk++;
      else acc[date].lowRisk++;
      
      return acc;
    }, {});

    return Object.values(riskByDate)
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7); // Last 7 days
  }, [insights]);

  // Cost prediction data
  const costPredictionData = useMemo(() => {
    // Get cost analysis insights
    const costInsights = insights.filter(i => i.insight_type === 'cost_analysis');
    const productivityInsights = insights.filter(i => i.insight_type === 'productivity_economics');
    
    if (costInsights.length === 0) return [];

    // Calculate weekly cost trend
    const weeks = [];
    const now = new Date();
    
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      
      const weekIssues = issues.filter(issue => {
        const createdDate = new Date(issue.created_date);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return createdDate >= weekStart && createdDate <= weekEnd;
      });

      // Estimate cost based on story points and average hourly rate
      const totalStoryPoints = weekIssues.reduce((sum, issue) => sum + (issue.story_points || 0), 0);
      const estimatedCost = totalStoryPoints * 8 * 100; // 8 hours per story point, $100/hour

      weeks.push({
        week: `Sem ${i === 0 ? 'Atual' : i + 1}`,
        actualCost: estimatedCost,
        storyPoints: totalStoryPoints,
        issueCount: weekIssues.length
      });
    }

    // Add predictions for next 4 weeks
    const recentWeeks = weeks.slice(-4);
    const avgCost = recentWeeks.reduce((sum, w) => sum + w.actualCost, 0) / recentWeeks.length;
    const avgStoryPoints = recentWeeks.reduce((sum, w) => sum + w.storyPoints, 0) / recentWeeks.length;
    
    const lastWeek = weeks[weeks.length - 1];
    
    for (let i = 1; i <= 4; i++) {
      const growthFactor = 1 + (i * 0.05); // 5% growth per week
      weeks.push({
        week: `+${i} Sem`,
        predictedCost: Math.round(avgCost * growthFactor),
        actualCost: 0,
        storyPoints: Math.round(avgStoryPoints * growthFactor),
        issueCount: Math.round((lastWeek.issueCount || 0) * growthFactor),
        predicted: true
      });
    }

    return weeks;
  }, [issues, insights]);

  // ROI trend prediction
  const roiTrendData = useMemo(() => {
    const costInsights = insights.filter(i => i.insight_type === 'cost_analysis');
    
    if (costInsights.length === 0) return [];

    // Historical ROI data (simulated based on cost insights)
    const months = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthName = monthDate.toLocaleDateString('pt-BR', { month: 'short' });
      
      // Calculate issues completed in this month
      const monthIssues = issues.filter(issue => {
        if (!issue.resolved_date) return false;
        const resolvedDate = new Date(issue.resolved_date);
        return resolvedDate.getMonth() === monthDate.getMonth() && 
               resolvedDate.getFullYear() === monthDate.getFullYear();
      });

      const completedStoryPoints = monthIssues.reduce((sum, issue) => sum + (issue.story_points || 0), 0);
      const estimatedValue = completedStoryPoints * 200; // $200 value per story point
      const estimatedCost = completedStoryPoints * 8 * 100; // $100/hour, 8 hours per SP
      const roi = estimatedCost > 0 ? ((estimatedValue - estimatedCost) / estimatedCost) * 100 : 0;

      months.push({
        month: monthName,
        roi: Math.max(0, roi),
        investment: estimatedCost,
        value: estimatedValue,
        storyPoints: completedStoryPoints
      });
    }

    // Add future predictions
    const avgROI = months.slice(-3).reduce((sum, m) => sum + m.roi, 0) / 3;
    const avgInvestment = months.slice(-3).reduce((sum, m) => sum + m.investment, 0) / 3;
    
    for (let i = 1; i <= 3; i++) {
      const futureMonth = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const monthName = futureMonth.toLocaleDateString('pt-BR', { month: 'short' });
      
      months.push({
        month: monthName,
        predictedROI: Math.round(avgROI * (1 + i * 0.1)), // 10% improvement per month
        roi: 0,
        investment: Math.round(avgInvestment * 1.05), // 5% cost increase
        predicted: true
      });
    }

    return months;
  }, [issues, insights]);

  // Budget overrun prediction
  const budgetOverrunData = useMemo(() => {
    const budgetInsights = insights.filter(i => i.insight_type === 'budget_alerts');
    
    // Create weekly budget tracking even without budget insights
    const weeks = [];
    const now = new Date();
    const monthlyBudget = 50000; // $50k monthly budget (can be dynamic)
    const weeklyBudget = monthlyBudget / 4;
    
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      
      const weekIssues = issues.filter(issue => {
        const createdDate = new Date(issue.created_date);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        return createdDate >= weekStart && createdDate <= weekEnd;
      });

      const weeklySpend = weekIssues.reduce((sum, issue) => {
        return sum + ((issue.story_points || 0) * 8 * 100);
      }, 0);

      const budgetUsage = (weeklySpend / weeklyBudget) * 100;
      const overrun = budgetUsage > 100;
      const riskLevel = budgetUsage > 100 ? 'high' : budgetUsage > 80 ? 'medium' : 'low';

      weeks.push({
        week: `Sem ${i === 0 ? 'Atual' : i + 1}`,
        actualSpend: weeklySpend,
        budgetLimit: weeklyBudget,
        usage: Math.min(budgetUsage, 150), // Cap at 150% for visualization
        overrun: overrun,
        riskLevel: riskLevel,
        barColor: overrun ? '#ff7c7c' : riskLevel === 'medium' ? '#ffc658' : '#82ca9d'
      });
    }

    return weeks;
  }, [issues, insights]);

  return (
    <>
      {/* Burndown Chart with Predictions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Burndown Preditivo
          </CardTitle>
          <CardDescription>
            Evolução de issues criadas vs resolvidas com previsões IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={burndownData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="week" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="created" 
                stroke="#8884d8" 
                name="Criadas"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="completed" 
                stroke="#82ca9d" 
                name="Concluídas"
                strokeWidth={2}
              />
              <Line 
                type="monotone" 
                dataKey="cumulative" 
                stroke="#ff7c7c" 
                name="Acumulado"
                strokeWidth={2}
                strokeDasharray={burndownData.some(d => d.predicted) ? "5 5" : "0"}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Team Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Performance da Equipe
          </CardTitle>
          <CardDescription>
            Taxa de conclusão e velocidade por membro da equipe
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamPerformanceData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis />
              <Tooltip 
                formatter={(value, name) => [
                  name === 'completionRate' ? `${value}%` : value,
                  name === 'completionRate' ? 'Taxa de Conclusão' : 'Velocidade (SP/Issue)'
                ]}
              />
              <Legend />
              <Bar dataKey="completionRate" fill="#8884d8" name="Taxa Conclusão %" />
              <Bar dataKey="velocity" fill="#82ca9d" name="Velocidade" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Issue Type Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChartIcon className="h-5 w-5" />
            Distribuição por Tipo
          </CardTitle>
          <CardDescription>
            Proporção de diferentes tipos de issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={issueTypeData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {issueTypeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Cost Prediction */}
      {costPredictionData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Previsão de Custos
            </CardTitle>
            <CardDescription>
              Custos reais vs previstos baseados em story points e produtividade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={costPredictionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value, name) => [
                    `$${value.toLocaleString()}`,
                    name === 'actualCost' ? 'Custo Real' : 'Custo Previsto'
                  ]}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="actualCost"
                  stackId="1"
                  stroke="#8884d8"
                  fill="#8884d8"
                  name="Custo Real"
                  fillOpacity={0.6}
                />
                <Area
                  type="monotone"
                  dataKey="predictedCost"
                  stackId="2"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  name="Custo Previsto"
                  strokeDasharray="5 5"
                  fillOpacity={0.3}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ROI Trend Prediction */}
      {roiTrendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Tendência de ROI
            </CardTitle>
            <CardDescription>
              ROI histórico e previsões futuras baseadas em entrega de valor
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={roiTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <Tooltip 
                  formatter={(value, name) => [
                    `${value}%`,
                    name === 'roi' ? 'ROI Real' : 'ROI Previsto'
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="roi"
                  stroke="#8884d8"
                  strokeWidth={3}
                  name="ROI Real"
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="predictedROI"
                  stroke="#82ca9d"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="ROI Previsto"
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Budget Overrun Alert */}
      {budgetOverrunData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Alertas de Orçamento
            </CardTitle>
            <CardDescription>
              Monitoramento de gastos vs orçamento planejado com alertas de estouro
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={budgetOverrunData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'usage' ? `${value}%` : `$${value.toLocaleString()}`,
                    name === 'usage' ? 'Uso do Orçamento' : 
                    name === 'actualSpend' ? 'Gasto Real' : 'Limite Orçamento'
                  ]}
                />
                <Legend />
                <Bar 
                  dataKey="usage" 
                  fill="#8884d8"
                  name="Uso do Orçamento (%)"
                >
                  {budgetOverrunData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.barColor} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Risk Trend */}
      {riskTrendData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Tendência de Riscos
            </CardTitle>
            <CardDescription>
              Evolução dos níveis de risco SLA nos últimos 7 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={riskTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="highRisk" stackId="a" fill="#ff7c7c" name="Alto Risco" />
                <Bar dataKey="mediumRisk" stackId="a" fill="#ffc658" name="Médio Risco" />
                <Bar dataKey="lowRisk" stackId="a" fill="#82ca9d" name="Baixo Risco" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </>
  );
};

export default PredictiveCharts;