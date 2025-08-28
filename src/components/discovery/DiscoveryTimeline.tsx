import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Clock, AlertTriangle, Target, Users, List, Rocket, ArrowRight } from 'lucide-react';

interface TimelineProps {
  currentStage: string;
  stageStatus: any;
  stageData: any;
  onStageSelect: (stage: string) => void;
}

const DiscoveryTimeline: React.FC<TimelineProps> = ({
  currentStage,
  stageStatus,
  stageData,
  onStageSelect
}) => {
  const stages = [
    {
      key: 'business_canvas',
      title: 'Business Model Canvas',
      icon: Target,
      description: 'Modelo de negócio e proposta de valor',
      color: 'hsl(var(--chart-1))',
      estimatedTime: '2-3 horas'
    },
    {
      key: 'inception',
      title: 'Inception Workshop', 
      icon: Users,
      description: 'Visão do produto e personas',
      color: 'hsl(var(--chart-2))',
      estimatedTime: '4-6 horas'
    },
    {
      key: 'pbb',
      title: 'Product Backlog Building',
      icon: List,
      description: 'Épicos e funcionalidades prioritárias',
      color: 'hsl(var(--chart-3))',
      estimatedTime: '3-4 horas'
    },
    {
      key: 'sprint0',
      title: 'Sprint 0',
      icon: Rocket,
      description: 'Configuração técnica e processos',
      color: 'hsl(var(--chart-4))',
      estimatedTime: '2-3 horas'
    }
  ];

  const getStageProgress = (stage: string) => {
    const data = stageData[`${stage}_data`];
    if (!data || !data.questions) return 0;
    
    const questionsCount = Array.isArray(data.questions) ? data.questions.length : 0;
    if (questionsCount >= 5) return 100;
    if (questionsCount >= 3) return 75;
    if (questionsCount >= 1) return 50;
    return 25;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'in_progress': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-400 bg-gray-100';
    }
  };

  const isStageAccessible = (stageIndex: number) => {
    if (stageIndex === 0) return true;
    
    // Para PBB, idealmente ter BMC e Inception
    if (stageIndex === 2) {
      return stageStatus.business_canvas !== 'pending' || stageStatus.inception !== 'pending';
    }
    
    // Para Sprint 0, idealmente ter as anteriores
    if (stageIndex === 3) {
      return stageStatus.business_canvas !== 'pending' || 
             stageStatus.inception !== 'pending' || 
             stageStatus.pbb !== 'pending';
    }
    
    return true;
  };

  const getDependencyWarning = (stageIndex: number) => {
    if (stageIndex === 2 && stageStatus.business_canvas === 'pending' && stageStatus.inception === 'pending') {
      return 'BMC e Inception ajudariam muito no PBB';
    }
    if (stageIndex === 3 && stageStatus.business_canvas === 'pending') {
      return 'BMC ajudaria na configuração técnica';
    }
    return null;
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold mb-2">Timeline do Discovery</h3>
            <p className="text-sm text-muted-foreground">
              Acompanhe o progresso através das etapas do discovery
            </p>
          </div>

          <div className="relative">
            {/* Timeline Line */}
            <div className="absolute left-8 top-12 bottom-12 w-0.5 bg-border"></div>
            
            <div className="space-y-8">
              {stages.map((stage, index) => {
                const status = stageStatus[stage.key] || 'pending';
                const progress = getStageProgress(stage.key);
                const isActive = currentStage === stage.key;
                const isAccessible = isStageAccessible(index);
                const warning = getDependencyWarning(index);
                const IconComponent = stage.icon;

                return (
                  <div key={stage.key} className="relative flex items-start space-x-4">
                    {/* Timeline Node */}
                    <div className={`
                      relative z-10 flex items-center justify-center w-16 h-16 rounded-full border-4 transition-all
                      ${isActive 
                        ? 'border-primary bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/20' 
                        : status === 'completed'
                        ? 'border-green-500 bg-green-500 text-white'
                        : status === 'in_progress'
                        ? 'border-yellow-500 bg-yellow-500 text-white'
                        : 'border-gray-300 bg-white text-gray-400'
                      }
                    `}>
                      {status === 'completed' ? (
                        <Check className="h-6 w-6" />
                      ) : (
                        <IconComponent className="h-6 w-6" />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-8">
                      <div 
                        className={`
                          p-4 rounded-lg border transition-all cursor-pointer
                          ${isActive ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/50 hover:shadow-sm'}
                          ${!isAccessible ? 'opacity-75' : ''}
                        `}
                        onClick={() => isAccessible && onStageSelect(stage.key)}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h4 className="font-semibold text-sm">{stage.title}</h4>
                              <Badge variant={status === 'completed' ? 'default' : status === 'in_progress' ? 'secondary' : 'outline'} className="text-xs">
                                {status === 'completed' ? 'Concluída' : status === 'in_progress' ? 'Em Andamento' : 'Pendente'}
                              </Badge>
                              {isActive && (
                                <Badge variant="outline" className="text-xs bg-primary/10">
                                  Atual
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{stage.description}</p>
                            <p className="text-xs text-muted-foreground">⏱️ Tempo estimado: {stage.estimatedTime}</p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        {status !== 'pending' && (
                          <div className="mb-3">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-medium">Progresso</span>
                              <span className="text-xs text-muted-foreground">{progress}%</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                          </div>
                        )}

                        {/* Warning */}
                        {warning && (
                          <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-700 mb-2">
                            <AlertTriangle className="h-3 w-3" />
                            <span>{warning}</span>
                          </div>
                        )}

                        {/* Quick Stats */}
                        {status !== 'pending' && stageData[`${stage.key}_data`] && (
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>📝 {stageData[`${stage.key}_data`]?.questions?.length || 0} perguntas</span>
                            {stage.key === 'pbb' && stageData.pbb_data?.Epicos && (
                              <span>🎯 {stageData.pbb_data.Epicos.length} épicos</span>
                            )}
                            {stage.key === 'sprint0' && stageData.sprint0_data?.Epicos && (
                              <span>🚀 {stageData.sprint0_data.Epicos.length} configurações</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Next Arrow */}
                    {index < stages.length - 1 && (
                      <div className="absolute -bottom-4 left-12 z-10">
                        <ArrowRight className="h-4 w-4 text-border" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Overall Progress */}
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-medium">Progresso Geral</span>
              <span className="text-sm text-muted-foreground">
                {Object.values(stageStatus).filter(s => s === 'completed').length} de {stages.length} etapas
              </span>
            </div>
            <Progress 
              value={Object.values(stageStatus).filter(s => s === 'completed').length * 25} 
              className="h-3"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DiscoveryTimeline;