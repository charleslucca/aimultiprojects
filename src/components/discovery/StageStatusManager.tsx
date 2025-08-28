import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Clock, AlertTriangle, Target, Users, List, Rocket } from 'lucide-react';

interface StageStatus {
  business_canvas: 'pending' | 'in_progress' | 'completed';
  inception: 'pending' | 'in_progress' | 'completed';
  pbb: 'pending' | 'in_progress' | 'completed';
  sprint0: 'pending' | 'in_progress' | 'completed';
}

interface StageData {
  business_canvas_data?: any;
  inception_data?: any;
  pbb_data?: any;
  sprint0_data?: any;
}

interface StageStatusManagerProps {
  stageStatus: StageStatus;
  stageData: StageData;
  currentStage: string;
  onStageComplete: (stage: string) => void;
  onStageSelect: (stage: string) => void;
}

const StageStatusManager: React.FC<StageStatusManagerProps> = ({
  stageStatus,
  stageData,
  currentStage,
  onStageComplete,
  onStageSelect
}) => {
  const stages = [
    {
      key: 'business_canvas',
      title: 'Business Model Canvas',
      icon: Target,
      description: 'Modelo de negócio e proposta de valor',
      color: 'hsl(var(--chart-1))'
    },
    {
      key: 'inception',
      title: 'Inception Workshop',
      icon: Users,
      description: 'Visão do produto e personas',
      color: 'hsl(var(--chart-2))'
    },
    {
      key: 'pbb',
      title: 'Product Backlog Building',
      icon: List,
      description: 'Épicos e funcionalidades prioritárias',
      color: 'hsl(var(--chart-3))'
    },
    {
      key: 'sprint0',
      title: 'Sprint 0',
      icon: Rocket,
      description: 'Configuração técnica e processos',
      color: 'hsl(var(--chart-4))'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <Check className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Concluída</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Em Andamento</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  const getCompletenessPercentage = (stage: string) => {
    const data = stageData[`${stage}_data` as keyof StageData];
    if (!data || !data.questions) return 0;
    
    const questionsCount = Array.isArray(data.questions) ? data.questions.length : 0;
    if (questionsCount >= 5) return 100;
    if (questionsCount >= 3) return 75;
    if (questionsCount >= 1) return 50;
    return 25;
  };

  const getDependencyWarnings = (stage: string) => {
    const warnings = [];
    
    if (stage === 'pbb') {
      if (stageStatus.business_canvas === 'pending') {
        warnings.push('BMC pendente - PBB será menos assertivo');
      }
      if (stageStatus.inception === 'pending') {
        warnings.push('Inception pendente - Personas indefinidas');
      }
    }
    
    if (stage === 'sprint0') {
      if (stageStatus.business_canvas === 'pending') {
        warnings.push('BMC pendente - Contexto técnico limitado');
      }
      if (stageStatus.inception === 'pending') {
        warnings.push('Inception pendente - Requisitos indefinidos');
      }
      if (stageStatus.pbb === 'pending') {
        warnings.push('PBB pendente - Arquitetura sem contexto');
      }
    }
    
    return warnings;
  };

  const overallProgress = Object.values(stageStatus).filter(s => s === 'completed').length * 25;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Status das Etapas do Discovery</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{overallProgress}% concluído</span>
            <Progress value={overallProgress} className="w-20" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stages.map((stage) => {
            const status = stageStatus[stage.key as keyof StageStatus];
            const completeness = getCompletenessPercentage(stage.key);
            const warnings = getDependencyWarnings(stage.key);
            const isActive = currentStage === stage.key;
            const IconComponent = stage.icon;
            
            return (
              <Card 
                key={stage.key}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  isActive ? 'ring-2 ring-primary shadow-md' : ''
                }`}
                onClick={() => onStageSelect(stage.key)}
              >
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent 
                          className="h-5 w-5" 
                          style={{ color: stage.color }}
                        />
                        <div className="flex flex-col">
                          <h4 className="font-medium text-sm">{stage.title}</h4>
                          <p className="text-xs text-muted-foreground">{stage.description}</p>
                        </div>
                      </div>
                      {getStatusIcon(status)}
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between">
                      {getStatusBadge(status)}
                      {isActive && (
                        <Badge variant="outline" className="text-xs">Atual</Badge>
                      )}
                    </div>

                    {/* Progress */}
                    {status !== 'pending' && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span>Completude</span>
                          <span>{completeness}%</span>
                        </div>
                        <Progress value={completeness} className="h-2" />
                      </div>
                    )}

                    {/* Warnings */}
                    {warnings.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-yellow-600">
                          <AlertTriangle className="h-3 w-3" />
                          <span>Dependências</span>
                        </div>
                        {warnings.map((warning, idx) => (
                          <p key={idx} className="text-xs text-yellow-600">
                            • {warning}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {status === 'in_progress' && completeness >= 75 && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStageComplete(stage.key);
                          }}
                          className="text-xs"
                        >
                          Finalizar Etapa
                        </Button>
                      )}
                      {!isActive && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            onStageSelect(stage.key);
                          }}
                          className="text-xs"
                        >
                          {status === 'pending' ? 'Iniciar' : 'Continuar'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default StageStatusManager;