import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Target,
  Brain,
  Calendar,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Info,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface InsightDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  insight: any;
  relatedIssue?: any;
}

// Utility function to safely render any content (objects, arrays, strings)
const renderSafeContent = (content: any): React.ReactNode => {
  if (typeof content === 'string') {
    return content;
  }
  
  if (typeof content === 'number') {
    return content.toString();
  }
  
  if (content === null || content === undefined) {
    return 'N/A';
  }
  
  if (Array.isArray(content)) {
    return (
      <ul className="space-y-1">
        {content.map((item, index) => (
          <li key={index} className="flex items-start gap-2">
            <div className="h-1.5 w-1.5 bg-primary rounded-full mt-2 flex-shrink-0" />
            <span>{renderSafeContent(item)}</span>
          </li>
        ))}
      </ul>
    );
  }
  
  if (typeof content === 'object') {
    // Handle specific object structures
    if (content.suggestions && Array.isArray(content.suggestions)) {
      return (
        <div className="space-y-2">
          <div className="text-sm font-medium text-primary">Sugestões da Equipe:</div>
          {content.suggestions.map((suggestion: any, index: number) => (
            <div key={index} className="p-2 bg-primary/5 rounded border-l-2 border-primary">
              {suggestion.member && (
                <div className="flex items-center gap-2 mb-1">
                  <UserCheck className="h-3 w-3 text-primary" />
                  <span className="text-sm font-medium">{suggestion.member}</span>
                </div>
              )}
              <p className="text-sm text-muted-foreground">{suggestion.recommendation || suggestion.description || 'N/A'}</p>
            </div>
          ))}
        </div>
      );
    }
    
    // Handle other object structures
    const entries = Object.entries(content);
    if (entries.length === 0) return 'N/A';
    
    return (
      <div className="space-y-1">
        {entries.map(([key, value], index) => (
          <div key={index} className="text-sm">
            <span className="font-medium capitalize">{key.replace(/_/g, ' ')}: </span>
            <span className="text-muted-foreground">{renderSafeContent(value)}</span>
          </div>
        ))}
      </div>
    );
  }
  
  return String(content);
};

const InsightDetailModal: React.FC<InsightDetailModalProps> = ({
  open,
  onOpenChange,
  insight,
  relatedIssue
}) => {
  if (!insight) return null;

  const getInsightIcon = (type: string) => {
    const icons = {
      'sla_risk': AlertTriangle,
      'sprint_prediction': Target,
      'team_performance': Users,
      'cost_analysis': DollarSign,
      'productivity_economics': BarChart3,
      'budget_alerts': AlertCircle,
      'sentiment': Users
    };
    return icons[type as keyof typeof icons] || Brain;
  };

  const formatInsightType = (type: string) => {
    const types = {
      'sla_risk': 'Análise de Risco SLA',
      'sprint_prediction': 'Previsão de Sprint',
      'team_performance': 'Performance da Equipe',
      'cost_analysis': 'Análise de Custos',
      'productivity_economics': 'Economia e Produtividade',
      'budget_alerts': 'Alertas Orçamentários',
      'sentiment': 'Análise de Sentimento'
    };
    return types[type as keyof typeof types] || type;
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-success border-success bg-success/10';
    if (score >= 0.6) return 'text-warning border-warning bg-warning/10';
    return 'text-destructive border-destructive bg-destructive/10';
  };

  const IconComponent = getInsightIcon(insight.insight_type);
  const insightData = insight.insight_data || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <IconComponent className="h-6 w-6 text-primary" />
            {formatInsightType(insight.insight_type)}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {/* Header Info */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge 
                  variant="outline" 
                  className={cn("text-sm px-3 py-1", getConfidenceColor(insight.confidence_score))}
                >
                  Confiabilidade: {Math.round(insight.confidence_score * 100)}%
                </Badge>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {new Date(insight.generated_at).toLocaleString('pt-BR')}
                </div>
              </div>
            </div>

            {/* Related Issue */}
            {relatedIssue && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Issue Relacionada</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-3">
                    <Badge variant="outline" className="font-mono">
                      {relatedIssue.jira_key}
                    </Badge>
                    <div className="flex-1">
                      <h4 className="font-semibold">{relatedIssue.summary}</h4>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span>Prioridade: {relatedIssue.priority || 'N/A'}</span>
                        <span>Status: {relatedIssue.status || 'N/A'}</span>
                        <span>Assignee: {relatedIssue.assignee_name || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary */}
            {insightData.summary && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Resumo Executivo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {insightData.summary}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Key Findings */}
            {insightData.key_findings && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Principais Descobertas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                   <div className="text-muted-foreground">
                     {renderSafeContent(insightData.key_findings)}
                   </div>
                </CardContent>
              </Card>
            )}

            {/* Metrics/Data */}
            {(insightData.metrics || insightData.financial_impact || insightData.performance_metrics) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Métricas e Dados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {insightData.metrics && Object.entries(insightData.metrics).map(([key, value]: [string, any]) => (
                      <div key={key} className="p-3 bg-muted/50 rounded-lg">
                        <div className="text-sm font-medium capitalize">{key.replace(/_/g, ' ')}</div>
                        <div className="text-lg font-bold">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</div>
                      </div>
                    ))}
                    {insightData.financial_impact && Object.entries(insightData.financial_impact).map(([key, value]: [string, any]) => (
                      <div key={key} className="p-3 bg-primary/5 rounded-lg">
                        <div className="text-sm font-medium text-primary capitalize">{key.replace(/_/g, ' ')}</div>
                        <div className="text-lg font-bold text-primary">
                          {typeof value === 'number' ? `R$ ${value.toLocaleString('pt-BR')}` : value}
                        </div>
                      </div>
                    ))}
                    {insightData.performance_metrics && Object.entries(insightData.performance_metrics).map(([key, value]: [string, any]) => (
                      <div key={key} className="p-3 bg-success/5 rounded-lg">
                        <div className="text-sm font-medium text-success capitalize">{key.replace(/_/g, ' ')}</div>
                        <div className="text-lg font-bold text-success">{typeof value === 'number' ? value.toLocaleString('pt-BR') : value}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommendations */}
            {insightData.recommendations && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Recomendações
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    // Handle different recommendation formats
                    let recommendations = [];
                    
                    if (Array.isArray(insightData.recommendations)) {
                      recommendations = insightData.recommendations;
                    } else if (typeof insightData.recommendations === 'object' && insightData.recommendations !== null) {
                      // Handle object format like {recommendation_1, recommendation_2, recommendation_3}
                      recommendations = Object.values(insightData.recommendations).filter(Boolean);
                    } else if (typeof insightData.recommendations === 'string') {
                      recommendations = [insightData.recommendations];
                    }
                    
                     return recommendations.length > 0 ? (
                       <div className="space-y-3">
                         {recommendations.map((rec: any, index: number) => (
                           <div key={index} className="p-3 bg-primary/5 border-l-4 border-primary rounded-r-lg">
                             <div className="text-muted-foreground">{renderSafeContent(rec)}</div>
                           </div>
                         ))}
                       </div>
                     ) : (
                       <div className="p-3 bg-muted/5 border-l-4 border-muted rounded-r-lg">
                         <p className="text-muted-foreground">Nenhuma recomendação disponível</p>
                       </div>
                     );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Risk Factors */}
            {insightData.risk_factors && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" />
                    Fatores de Risco
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    let riskFactors = [];
                    
                    if (Array.isArray(insightData.risk_factors)) {
                      riskFactors = insightData.risk_factors;
                    } else if (typeof insightData.risk_factors === 'object' && insightData.risk_factors !== null) {
                      riskFactors = Object.values(insightData.risk_factors).filter(Boolean);
                    } else if (typeof insightData.risk_factors === 'string') {
                      riskFactors = [insightData.risk_factors];
                    }
                    
                     return riskFactors.length > 0 ? (
                       <div className="space-y-2">
                         {riskFactors.map((risk: any, index: number) => (
                           <div key={index} className="flex items-start gap-2 p-2 bg-warning/5 rounded">
                             <AlertTriangle className="h-4 w-4 text-warning mt-0.5 flex-shrink-0" />
                             <div className="text-muted-foreground flex-1">{renderSafeContent(risk)}</div>
                           </div>
                         ))}
                       </div>
                     ) : (
                       <div className="flex items-start gap-2 p-2 bg-muted/5 rounded">
                         <AlertTriangle className="h-4 w-4 text-muted mt-0.5 flex-shrink-0" />
                         <span className="text-muted-foreground">Nenhum fator de risco identificado</span>
                       </div>
                     );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Action Items */}
            {insightData.action_items && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    Ações Recomendadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    let actionItems = [];
                    
                    if (Array.isArray(insightData.action_items)) {
                      actionItems = insightData.action_items;
                    } else if (typeof insightData.action_items === 'object' && insightData.action_items !== null) {
                      actionItems = Object.values(insightData.action_items).filter(Boolean);
                    } else if (typeof insightData.action_items === 'string') {
                      actionItems = [insightData.action_items];
                    }
                    
                     return actionItems.length > 0 ? (
                       <div className="space-y-2">
                         {actionItems.map((action: any, index: number) => (
                           <div key={index} className="flex items-start gap-2 p-2 bg-success/5 rounded">
                             <CheckCircle2 className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                             <div className="text-muted-foreground flex-1">{renderSafeContent(action)}</div>
                           </div>
                         ))}
                       </div>
                     ) : (
                       <div className="flex items-start gap-2 p-2 bg-muted/5 rounded">
                         <CheckCircle2 className="h-4 w-4 text-muted mt-0.5 flex-shrink-0" />
                         <span className="text-muted-foreground">Nenhuma ação específica recomendada</span>
                       </div>
                     );
                  })()}
                </CardContent>
              </Card>
            )}

            {/* Raw Data Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dados Técnicos</CardTitle>
                <CardDescription>Informações detalhadas do insight gerado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(insightData, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default InsightDetailModal;