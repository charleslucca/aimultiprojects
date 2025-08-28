import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, ArrowRight, FileText, Users, Target, Settings } from 'lucide-react';

interface DiscoveryWizardProps {
  currentStage: string;
  sessionData: any;
  onStageSelect?: (stage: string) => void;
  showStageSelection?: boolean;
}

const STAGES = [
  {
    id: 'business_canvas',
    name: 'Business Model Canvas',
    icon: Target,
    description: 'Definir modelo de negócio e proposta de valor',
    color: 'bg-blue-500',
    estimatedTime: '45-60 min'
  },
  {
    id: 'inception',
    name: 'Inception Workshop',
    icon: Users,
    description: 'Alinhar visão do produto e objetivos',
    color: 'bg-purple-500',
    estimatedTime: '60-90 min'
  },
  {
    id: 'pbb',
    name: 'Product Backlog Building',
    icon: FileText,
    description: 'Construir e priorizar backlog do produto',
    color: 'bg-green-500',
    estimatedTime: '90-120 min'
  },
  {
    id: 'sprint0',
    name: 'Sprint 0',
    icon: Settings,
    description: 'Preparar ambiente e processo de desenvolvimento',
    color: 'bg-orange-500',
    estimatedTime: '30-45 min'
  }
];

export const DiscoveryWizard: React.FC<DiscoveryWizardProps> = ({
  currentStage,
  sessionData,
  onStageSelect,
  showStageSelection = false
}) => {
  const getCurrentStageIndex = () => {
    return STAGES.findIndex(stage => stage.id === currentStage);
  };

  const getStageStatus = (stageId: string) => {
    const stageIndex = STAGES.findIndex(stage => stage.id === stageId);
    const currentIndex = getCurrentStageIndex();
    
    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'current';
    return 'pending';
  };

  const getStageData = (stageId: string) => {
    const dataMapping: Record<string, any> = {
      'business_canvas': sessionData?.business_canvas_data,
      'inception': sessionData?.inception_data,
      'pbb': sessionData?.pbb_data,
      'sprint0': sessionData?.sprint0_data
    };
    return dataMapping[stageId];
  };

  const calculateProgress = () => {
    const completedStages = STAGES.filter(stage => getStageStatus(stage.id) === 'completed').length;
    const currentStageIndex = getCurrentStageIndex();
    const hasCurrentStageData = getStageData(currentStage);
    
    // Se o stage atual tem dados, conta como meio completo
    const currentStageProgress = hasCurrentStageData ? 0.5 : 0;
    
    return ((completedStages + currentStageProgress) / STAGES.length) * 100;
  };

  if (showStageSelection) {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Escolha sua Metodologia de Discovery</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Selecione a metodologia que melhor se adapta ao seu projeto. Cada uma gerará perguntas específicas 
            para reuniões estruturadas de descoberta.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {STAGES.map((stage) => {
            const Icon = stage.icon;
            return (
              <Card 
                key={stage.id} 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/50"
                onClick={() => onStageSelect?.(stage.id)}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg ${stage.color} text-white`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <CardTitle className="text-lg">{stage.name}</CardTitle>
                      <CardDescription className="text-sm">
                        {stage.description}
                      </CardDescription>
                      <Badge variant="secondary" className="text-xs">
                        {stage.estimatedTime}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <Button variant="outline" className="w-full">
                    Iniciar {stage.name}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Progresso do Discovery</CardTitle>
            <CardDescription>
              {sessionData?.session_name || 'Sessão de Discovery'}
            </CardDescription>
          </div>
          <Badge variant="outline">
            {Math.round(calculateProgress())}% Completo
          </Badge>
        </div>
        <Progress value={calculateProgress()} className="mt-4" />
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {STAGES.map((stage, index) => {
            const Icon = stage.icon;
            const status = getStageStatus(stage.id);
            const stageData = getStageData(stage.id);
            const isLast = index === STAGES.length - 1;

            return (
              <div key={stage.id} className="relative">
                <div className="flex items-start gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`
                      p-2 rounded-full border-2 flex items-center justify-center
                      ${status === 'completed' ? 'bg-green-500 border-green-500 text-white' : 
                        status === 'current' ? 'bg-primary border-primary text-white' : 
                        'bg-background border-muted-foreground/30 text-muted-foreground'}
                    `}>
                      {status === 'completed' ? (
                        <CheckCircle className="h-4 w-4" />
                      ) : status === 'current' ? (
                        <Icon className="h-4 w-4" />
                      ) : (
                        <Circle className="h-4 w-4" />
                      )}
                    </div>
                    {!isLast && (
                      <div className={`
                        w-0.5 h-8 mt-2
                        ${status === 'completed' ? 'bg-green-500' : 'bg-muted-foreground/20'}
                      `} />
                    )}
                  </div>
                  
                  <div className="flex-1 pb-8">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className={`font-medium ${
                        status === 'current' ? 'text-primary' : ''
                      }`}>
                        {stage.name}
                      </h4>
                      {status === 'current' && (
                        <Badge variant="default" className="text-xs">
                          Em Andamento
                        </Badge>
                      )}
                      {stageData && (
                        <Badge variant="secondary" className="text-xs">
                          Dados Coletados
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {stage.description}
                    </p>
                    {status === 'current' && stageData?.questions && (
                      <div className="text-xs text-green-600 font-medium">
                        {stageData.questions.length} perguntas geradas para reunião
                      </div>
                    )}
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