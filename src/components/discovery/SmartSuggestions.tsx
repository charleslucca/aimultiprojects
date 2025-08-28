import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, ArrowRight, AlertTriangle, CheckCircle2, Target, Users, List, Rocket } from 'lucide-react';

interface SmartSuggestionsProps {
  currentStage: string;
  stageStatus: any;
  stageData: any;
  onSuggestionClick: (action: string, data?: any) => void;
}

const SmartSuggestions: React.FC<SmartSuggestionsProps> = ({
  currentStage,
  stageStatus,
  stageData,
  onSuggestionClick
}) => {
  const generateSuggestions = () => {
    const suggestions = [];

    // Análise contextual baseada no estágio atual e dados
    switch (currentStage) {
      case 'business_canvas':
        if (!stageData.business_canvas_data?.questions) {
          suggestions.push({
            type: 'action',
            priority: 'high',
            icon: Target,
            title: 'Comece definindo o modelo de negócio',
            description: 'Vamos descobrir qual problema seu produto resolve e para quem.',
            action: 'ask_business_context',
            actionText: 'Começar BMC',
            color: 'hsl(var(--chart-1))'
          });
        } else if (stageData.business_canvas_data.questions.length < 5) {
          suggestions.push({
            type: 'improvement',
            priority: 'medium',
            icon: Target,
            title: 'Aprimore seu Business Model Canvas',
            description: 'Adicione mais detalhes sobre parceiros e canais de distribuição.',
            action: 'improve_bmc',
            actionText: 'Continuar BMC',
            color: 'hsl(var(--chart-1))'
          });
        }
        break;

      case 'inception':
        if (stageStatus.business_canvas === 'completed') {
          suggestions.push({
            type: 'insight',
            priority: 'high',
            icon: CheckCircle2,
            title: 'Ótimo! BMC completo ajudará muito',
            description: 'Com o modelo de negócio definido, podemos criar personas mais precisas.',
            action: 'use_bmc_for_personas',
            actionText: 'Gerar Personas',
            color: 'hsl(var(--chart-2))'
          });
        } else {
          suggestions.push({
            type: 'warning',
            priority: 'medium',
            icon: AlertTriangle,
            title: 'BMC em paralelo seria útil',
            description: 'Definir o modelo de negócio ajudaria a identificar usuários-chave.',
            action: 'suggest_bmc_parallel',
            actionText: 'Ver BMC',
            color: 'hsl(var(--destructive))'
          });
        }
        break;

      case 'pbb':
        const hasPrerequisites = stageStatus.business_canvas !== 'pending' || stageStatus.inception !== 'pending';
        
        if (hasPrerequisites) {
          suggestions.push({
            type: 'insight',
            priority: 'high',
            icon: CheckCircle2,
            title: 'Dados anteriores disponíveis!',
            description: 'Posso usar informações do BMC/Inception para priorizar funcionalidades.',
            action: 'use_context_for_pbb',
            actionText: 'Gerar Backlog Inteligente',
            color: 'hsl(var(--chart-3))'
          });
        } else {
          suggestions.push({
            type: 'warning',
            priority: 'high',
            icon: AlertTriangle,
            title: 'PBB será menos assertivo sem contexto',
            description: 'BMC e Inception ajudariam muito na priorização de funcionalidades.',
            action: 'suggest_prerequisites',
            actionText: 'Ver Dependências',
            color: 'hsl(var(--destructive))'
          });
        }
        break;

      case 'sprint0':
        const completedStages = Object.values(stageStatus).filter(s => s === 'completed').length;
        
        if (completedStages >= 2) {
          suggestions.push({
            type: 'insight',
            priority: 'high',
            icon: Rocket,
            title: 'Sprint 0 será super detalhado!',
            description: 'Com o contexto das etapas anteriores, posso sugerir arquitetura específica.',
            action: 'generate_detailed_sprint0',
            actionText: 'Configuração Inteligente',
            color: 'hsl(var(--chart-4))'
          });
        } else {
          suggestions.push({
            type: 'improvement',
            priority: 'medium',
            icon: AlertTriangle,
            title: 'Configuração técnica limitada',
            description: 'Mais contexto de negócio ajudaria a definir arquitetura ideal.',
            action: 'basic_sprint0',
            actionText: 'Continuar Mesmo Assim',
            color: 'hsl(var(--chart-4))'
          });
        }
        break;
    }

    // Sugestões gerais baseadas no status geral
    const completedCount = Object.values(stageStatus).filter(s => s === 'completed').length;
    
    if (completedCount >= 3) {
      suggestions.push({
        type: 'action',
        priority: 'high',
        icon: CheckCircle2,
        title: 'Pronto para finalizar!',
        description: 'Com 3+ etapas concluídas, você pode gerar o documento final consolidado.',
        action: 'suggest_finalize',
        actionText: 'Finalizar Discovery',
        color: 'hsl(var(--primary))'
      });
    }

    // Sugestão de próxima etapa lógica
    if (stageStatus.business_canvas === 'completed' && stageStatus.inception === 'pending') {
      suggestions.push({
        type: 'suggestion',
        priority: 'medium',
        icon: ArrowRight,
        title: 'Próxima etapa sugerida: Inception',
        description: 'Com o BMC pronto, defina visão e personas do produto.',
        action: 'switch_to_inception',
        actionText: 'Ir para Inception',
        color: 'hsl(var(--chart-2))'
      });
    }

    return suggestions.slice(0, 4); // Máximo 4 sugestões
  };

  const suggestions = generateSuggestions();

  if (suggestions.length === 0) {
    return null;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      default: return 'border-l-blue-500';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'warning': return AlertTriangle;
      case 'insight': return CheckCircle2;
      case 'action': return Target;
      default: return Lightbulb;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Sugestões Inteligentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {suggestions.map((suggestion, index) => {
            const TypeIcon = getTypeIcon(suggestion.type);
            const MainIcon = suggestion.icon;
            
            return (
              <div
                key={index}
                className={`p-4 rounded-lg border-l-4 bg-white hover:shadow-sm transition-all cursor-pointer ${getPriorityColor(suggestion.priority)}`}
                onClick={() => onSuggestionClick(suggestion.action, suggestion)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <MainIcon 
                        className="h-4 w-4" 
                        style={{ color: suggestion.color }}
                      />
                      <h4 className="font-medium text-sm">{suggestion.title}</h4>
                      <Badge 
                        variant={suggestion.priority === 'high' ? 'destructive' : suggestion.priority === 'medium' ? 'secondary' : 'outline'}
                        className="text-xs"
                      >
                        {suggestion.priority === 'high' ? 'Alta' : suggestion.priority === 'medium' ? 'Média' : 'Baixa'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {suggestion.description}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSuggestionClick(suggestion.action, suggestion);
                      }}
                    >
                      {suggestion.actionText}
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </div>
                  <div className="ml-3">
                    <TypeIcon className={`h-4 w-4 ${
                      suggestion.type === 'warning' ? 'text-yellow-500' :
                      suggestion.type === 'insight' ? 'text-green-500' :
                      suggestion.type === 'action' ? 'text-blue-500' :
                      'text-purple-500'
                    }`} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default SmartSuggestions;