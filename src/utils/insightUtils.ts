// Utility functions for processing and categorizing AI insights

export interface CriticalAlert {
  type: 'HR' | 'FINANCIAL' | 'SLA';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  title: string;
  description: string;
  icon: string;
  actionRequired: boolean;
  relatedIssues?: Array<{
    jira_key: string;
    id: string;
    summary: string;
    status: string;
    priority: string;
    assignee_name?: string;
  }>;
}

export interface InsightSummary {
  executive_summary: string;
  critical_alerts: CriticalAlert[];
  criticality_score: number;
  category: string;
}

// Extract critical alerts from insight data with issue traceability
export const extractCriticalAlerts = (insight: any, allIssues: any[] = []): CriticalAlert[] => {
  const alerts: CriticalAlert[] = [];
  const data = insight.insight_data || {};
  const type = insight.insight_type;

  // HR Critical Alerts - Burnout, Performance, Workload
  if (type === 'team_performance') {
    // Check for workload recommendations
    const workloadRecs = extractArrayFromField(data.workload_recommendations || data.recommendations);
    workloadRecs.forEach((rec: string) => {
      // Ensure rec is a string before calling string methods
      const recText = typeof rec === 'string' ? rec : String(rec || '');
      
      if (recText.toLowerCase().includes('0%') || recText.toLowerCase().includes('completion rate')) {
        alerts.push({
          type: 'HR',
          severity: 'CRITICAL',
          title: '🔥 Membro com 0% de Conclusão',
          description: recText,
          icon: 'AlertTriangle',
          actionRequired: true
        });
      } else if (recText.toLowerCase().includes('sobrecarga') || recText.toLowerCase().includes('burnout')) {
        alerts.push({
          type: 'HR',
          severity: 'HIGH',
          title: '⚠️ Risco de Burnout Detectado',
          description: recText,
          icon: 'Users',
          actionRequired: true
        });
      }
    });

    // Check team members performance
    if (data.team_members && Array.isArray(data.team_members)) {
      data.team_members.forEach((member: any) => {
        if (member.completion_rate === 0 || member.performance_score < 0.3) {
          // Find issues assigned to this team member
          const memberIssues = allIssues.filter(issue => 
            issue.assignee_name && issue.assignee_name.toLowerCase().includes(member.name.toLowerCase())
          ).slice(0, 3);

          alerts.push({
            type: 'HR',
            severity: 'CRITICAL',
            title: `🔥 ${member.name}: Performance Crítica`,
            description: `${member.name} com ${(member.completion_rate || 0) * 100}% de conclusão - Suporte urgente necessário`,
            icon: 'UserX',
            actionRequired: true,
            relatedIssues: memberIssues.map(issue => ({
              jira_key: issue.jira_key,
              id: issue.id,
              summary: issue.summary,
              status: issue.status,
              priority: issue.priority,
              assignee_name: issue.assignee_name
            }))
          });
        }
      });
    }
  }

  // Financial Critical Alerts
  if (type === 'cost_analysis' || type === 'budget_alerts') {
    const budgetIssues = extractArrayFromField(data.budget_issues || data.financial_impact);
    budgetIssues.forEach((issue: string) => {
      const issueText = typeof issue === 'string' ? issue : String(issue || '');
      
      if (issueText.toLowerCase().includes('sem valor') || issueText.toLowerCase().includes('sem estimativa')) {
        alerts.push({
          type: 'FINANCIAL',
          severity: 'HIGH',
          title: '💰 Issues sem Estimativa',
          description: issueText,
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
      // Find the specific issue if insight is related to one
      const relatedIssue = insight.issue_id ? allIssues.find(i => i.id === insight.issue_id) : null;
      
      alerts.push({
        type: 'SLA',
        severity: 'CRITICAL',
        title: '🔥 Alto Risco de SLA',
        description: `${Math.round(insight.confidence_score * 100)}% de risco de quebra de SLA`,
        icon: 'Clock',
        actionRequired: true,
        relatedIssues: relatedIssue ? [{
          jira_key: relatedIssue.jira_key,
          id: relatedIssue.id,
          summary: relatedIssue.summary,
          status: relatedIssue.status,
          priority: relatedIssue.priority,
          assignee_name: relatedIssue.assignee_name
        }] : []
      });
    }

    // Check workflow issues
    const workflowIssues = extractArrayFromField(data.workflow_issues || data.risk_factors);
    workflowIssues.forEach((issue: string) => {
      const issueText = typeof issue === 'string' ? issue : String(issue || '');
      
      if (issueText.toLowerCase().includes('sem assignee') || issueText.toLowerCase().includes('sem responsável')) {
        // Find unassigned issues
        const unassignedIssues = allIssues.filter(issue => !issue.assignee_name).slice(0, 5);
        
        alerts.push({
          type: 'SLA',
          severity: 'HIGH',
          title: '⚠️ Issues sem Responsável',
          description: issueText,
          icon: 'UserMinus',
          actionRequired: true,
          relatedIssues: unassignedIssues.map(issue => ({
            jira_key: issue.jira_key,
            id: issue.id,
            summary: issue.summary,
            status: issue.status,
            priority: issue.priority,
            assignee_name: issue.assignee_name
          }))
        });
      } else if (issueText.toLowerCase().includes('excesso') && issueText.toLowerCase().includes('doing')) {
        // Find issues in "In Progress" or "Doing" status
        const inProgressIssues = allIssues.filter(issue => 
          issue.status && (
            issue.status.toLowerCase().includes('progress') || 
            issue.status.toLowerCase().includes('doing') ||
            issue.status.toLowerCase().includes('desenvolvimento')
          )
        ).slice(0, 5);
        
        alerts.push({
          type: 'SLA',
          severity: 'HIGH',
          title: '⚠️ Gargalo no Workflow',
          description: issueText,
          icon: 'BarChart3',
          actionRequired: true,
          relatedIssues: inProgressIssues.map(issue => ({
            jira_key: issue.jira_key,
            id: issue.id,
            summary: issue.summary,
            status: issue.status,
            priority: issue.priority,
            assignee_name: issue.assignee_name
          }))
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
    return field.filter(Boolean).map(item => typeof item === 'string' ? item : String(item || ''));
  }
  
  if (typeof field === 'object' && field !== null) {
    return Object.values(field).filter(Boolean).map(item => typeof item === 'string' ? item : String(item || ''));
  }
  
  if (typeof field === 'string') {
    return [field];
  }
  
  // Convert other types to string
  return [String(field || '')];
};

// Process insight to add enhanced metadata
export const processInsightForDisplay = (insight: any, allIssues: any[] = []): any => {
  const alerts = extractCriticalAlerts(insight, allIssues);
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