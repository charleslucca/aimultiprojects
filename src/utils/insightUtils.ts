// Utility functions for processing and categorizing AI insights

export interface CriticalAlert {
  type: 'HR' | 'FINANCIAL' | 'SLA';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  title: string;
  description: string;
  icon: string;
  actionRequired: boolean;
}

export interface InsightSummary {
  executive_summary: string;
  critical_alerts: CriticalAlert[];
  criticality_score: number;
  category: string;
}

// Extract critical alerts from insight data
export const extractCriticalAlerts = (insight: any): CriticalAlert[] => {
  const alerts: CriticalAlert[] = [];
  const data = insight.insight_data || {};
  const type = insight.insight_type;

  // HR Critical Alerts - Burnout, Performance, Workload
  if (type === 'team_performance') {
    // Check for workload recommendations
    const workloadRecs = extractArrayFromField(data.workload_recommendations || data.recommendations);
    workloadRecs.forEach((rec: string) => {
      if (rec.toLowerCase().includes('0%') || rec.toLowerCase().includes('completion rate')) {
        alerts.push({
          type: 'HR',
          severity: 'CRITICAL',
          title: '🔥 Membro com 0% de Conclusão',
          description: rec,
          icon: 'AlertTriangle',
          actionRequired: true
        });
      } else if (rec.toLowerCase().includes('sobrecarga') || rec.toLowerCase().includes('burnout')) {
        alerts.push({
          type: 'HR',
          severity: 'HIGH',
          title: '⚠️ Risco de Burnout Detectado',
          description: rec,
          icon: 'Users',
          actionRequired: true
        });
      }
    });

    // Check team members performance
    if (data.team_members && Array.isArray(data.team_members)) {
      data.team_members.forEach((member: any) => {
        if (member.completion_rate === 0 || member.performance_score < 0.3) {
          alerts.push({
            type: 'HR',
            severity: 'CRITICAL',
            title: `🔥 ${member.name}: Performance Crítica`,
            description: `${member.name} com ${(member.completion_rate || 0) * 100}% de conclusão - Suporte urgente necessário`,
            icon: 'UserX',
            actionRequired: true
          });
        }
      });
    }
  }

  // Financial Critical Alerts
  if (type === 'cost_analysis' || type === 'budget_alerts') {
    const budgetIssues = extractArrayFromField(data.budget_issues || data.financial_impact);
    budgetIssues.forEach((issue: string) => {
      if (issue.toLowerCase().includes('sem valor') || issue.toLowerCase().includes('sem estimativa')) {
        alerts.push({
          type: 'FINANCIAL',
          severity: 'HIGH',
          title: '💰 Issues sem Estimativa',
          description: issue,
          icon: 'DollarSign',
          actionRequired: true
        });
      }
    });

    if (data.cost_overrun_risk > 0.7) {
      alerts.push({
        type: 'FINANCIAL',
        severity: 'CRITICAL',
        title: '🔥 Risco de Estouro Orçamentário',
        description: `${Math.round(data.cost_overrun_risk * 100)}% de probabilidade de estourar o orçamento`,
        icon: 'AlertCircle',
        actionRequired: true
      });
    }
  }

  // SLA Critical Alerts
  if (type === 'sla_risk' || type === 'sprint_prediction') {
    if (insight.confidence_score > 0.7 && type === 'sla_risk') {
      alerts.push({
        type: 'SLA',
        severity: 'CRITICAL',
        title: '🔥 Alto Risco de SLA',
        description: `${Math.round(insight.confidence_score * 100)}% de risco de quebra de SLA`,
        icon: 'Clock',
        actionRequired: true
      });
    }

    // Check workflow issues
    const workflowIssues = extractArrayFromField(data.workflow_issues || data.risk_factors);
    workflowIssues.forEach((issue: string) => {
      if (issue.toLowerCase().includes('sem assignee') || issue.toLowerCase().includes('sem responsável')) {
        alerts.push({
          type: 'SLA',
          severity: 'HIGH',
          title: '⚠️ Issues sem Responsável',
          description: issue,
          icon: 'UserMinus',
          actionRequired: true
        });
      } else if (issue.toLowerCase().includes('excesso') && issue.toLowerCase().includes('doing')) {
        alerts.push({
          type: 'SLA',
          severity: 'HIGH',
          title: '⚠️ Gargalo no Workflow',
          description: issue,
          icon: 'BarChart3',
          actionRequired: true
        });
      }
    });
  }

  return alerts;
};

// Generate executive summary from insight data
export const generateExecutiveSummary = (insight: any): string => {
  const data = insight.insight_data || {};
  const type = insight.insight_type;
  
  // If already has summary, enhance it with critical points
  if (data.summary) {
    const alerts = extractCriticalAlerts(insight);
    const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
    
    if (criticalCount > 0) {
      return `🔥 ${criticalCount} ALERTA(S) CRÍTICO(S): ${data.summary}`;
    }
    return data.summary;
  }

  // Generate summary based on type and critical alerts
  const alerts = extractCriticalAlerts(insight);
  const criticalAlerts = alerts.filter(a => a.severity === 'CRITICAL');
  
  if (criticalAlerts.length > 0) {
    return criticalAlerts[0].description;
  }

  // Fallback summaries by type
  const fallbackSummaries = {
    'team_performance': 'Análise de performance da equipe concluída',
    'sla_risk': `${Math.round(insight.confidence_score * 100)}% de risco identificado`,
    'cost_analysis': 'Análise de custos realizada',
    'sprint_prediction': `${Math.round((data.completion_probability || 0.5) * 100)}% de probabilidade de conclusão`,
    'budget_alerts': 'Alertas orçamentários verificados'
  };

  return fallbackSummaries[type as keyof typeof fallbackSummaries] || 'Insight processado com sucesso';
};

// Calculate criticality score based on alerts and confidence
export const calculateCriticalityScore = (insight: any): number => {
  const alerts = extractCriticalAlerts(insight);
  const criticalCount = alerts.filter(a => a.severity === 'CRITICAL').length;
  const highCount = alerts.filter(a => a.severity === 'HIGH').length;
  
  let score = insight.confidence_score || 0.5;
  
  // Boost score based on alerts
  score += criticalCount * 0.3;
  score += highCount * 0.15;
  
  // Cap at 1.0
  return Math.min(score, 1.0);
};

// Determine alert category
export const categorizeInsight = (insight: any): string => {
  const alerts = extractCriticalAlerts(insight);
  
  if (alerts.some(a => a.type === 'HR' && a.severity === 'CRITICAL')) return 'HR_CRITICAL';
  if (alerts.some(a => a.type === 'FINANCIAL' && a.severity === 'CRITICAL')) return 'FINANCIAL_CRITICAL';
  if (alerts.some(a => a.type === 'SLA' && a.severity === 'CRITICAL')) return 'SLA_CRITICAL';
  
  if (alerts.some(a => a.type === 'HR')) return 'HR';
  if (alerts.some(a => a.type === 'FINANCIAL')) return 'FINANCIAL';
  if (alerts.some(a => a.type === 'SLA')) return 'SLA';
  
  return 'GENERAL';
};

// Helper function to extract arrays from various field formats
export const extractArrayFromField = (field: any): string[] => {
  if (!field) return [];
  
  if (Array.isArray(field)) {
    return field.filter(Boolean);
  }
  
  if (typeof field === 'object' && field !== null) {
    return Object.values(field).filter(Boolean) as string[];
  }
  
  if (typeof field === 'string') {
    return [field];
  }
  
  return [];
};

// Process insight to add enhanced metadata
export const processInsightForDisplay = (insight: any): any => {
  const alerts = extractCriticalAlerts(insight);
  const executive_summary = generateExecutiveSummary(insight);
  const criticality_score = calculateCriticalityScore(insight);
  const alert_category = categorizeInsight(insight);
  
  return {
    ...insight,
    critical_alerts: alerts,
    executive_summary,
    criticality_score,
    alert_category,
    processed_at: new Date().toISOString()
  };
};