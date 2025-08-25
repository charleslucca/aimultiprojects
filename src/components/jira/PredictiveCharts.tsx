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
  Legend
} from 'recharts';
import { TrendingUp, BarChart3, PieChart as PieChartIcon, Activity } from 'lucide-react';

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