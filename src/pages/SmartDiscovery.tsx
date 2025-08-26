import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  CheckCircle,
  Circle,
  Target,
  Users,
  FileText,
  PlayCircle,
  Download,
  Upload
} from "lucide-react";

// Stage Components
import { BusinessModelCanvas } from "@/components/smart/BusinessModelCanvas";
import { InceptionWorkshop } from "@/components/smart/InceptionWorkshop";
import { ProductBacklogBuilding } from "@/components/smart/ProductBacklogBuilding";
import { Sprint0 } from "@/components/smart/Sprint0";

interface DiscoverySession {
  id: string;
  session_name: string;
  current_stage: string;
  status: string;
  business_canvas_data: any;
  inception_data: any;
  pbb_data: any;
  sprint0_data: any;
  generated_backlog: any;
  export_history: any;
  project_id?: string;
}

const STAGES = [
  { 
    id: 'business_canvas', 
    name: 'Business Model Canvas', 
    icon: Target,
    description: 'Definir modelo de negócio e proposta de valor' 
  },
  { 
    id: 'inception', 
    name: 'Inception Workshop', 
    icon: Users,
    description: 'Alinhar visão, objetivos e personas' 
  },
  { 
    id: 'pbb', 
    name: 'Product Backlog Building', 
    icon: FileText,
    description: 'Construir backlog inicial com personas e features' 
  },
  { 
    id: 'sprint0', 
    name: 'Sprint 0', 
    icon: PlayCircle,
    description: 'Priorizar e refinar para primeira sprint' 
  }
];

export default function SmartDiscovery() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const [session, setSession] = useState<DiscoverySession | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    }
  }, [sessionId]);

  useEffect(() => {
    if (session) {
      const stageIndex = STAGES.findIndex(s => s.id === session.current_stage);
      setCurrentStageIndex(stageIndex >= 0 ? stageIndex : 0);
    }
  }, [session]);

  const loadSession = async () => {
    if (!sessionId || !user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('smart_discovery_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setSession(data);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar sessão",
        description: error.message,
        variant: "destructive",
      });
      navigate('/smart-hub');
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const sessionName = `Discovery ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
      
      const { data, error } = await supabase
        .from('smart_discovery_sessions')
        .insert({
          user_id: user.id,
          session_name: sessionName,
          current_stage: 'business_canvas',
          status: 'in_progress'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sessão criada",
        description: "Nova sessão de Discovery Inteligente iniciada",
      });

      navigate(`/smart-hub/discovery/${data.id}`);
    } catch (error: any) {
      toast({
        title: "Erro ao criar sessão",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSessionData = async (stageData: any, stageName: string) => {
    if (!session || !user) return;

    try {
      const updateField = `${stageName}_data`;
      
      const { error } = await supabase
        .from('smart_discovery_sessions')
        .update({
          [updateField]: stageData,
          current_stage: stageName
        })
        .eq('id', session.id);

      if (error) throw error;

      setSession(prev => prev ? {
        ...prev,
        [updateField]: stageData,
        current_stage: stageName
      } : null);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const nextStage = () => {
    if (currentStageIndex < STAGES.length - 1) {
      const nextStage = STAGES[currentStageIndex + 1];
      setCurrentStageIndex(currentStageIndex + 1);
      
      if (session) {
        updateSessionData(session[`${nextStage.id}_data` as keyof DiscoverySession] || {}, nextStage.id);
      }
    }
  };

  const prevStage = () => {
    if (currentStageIndex > 0) {
      const prevStage = STAGES[currentStageIndex - 1];
      setCurrentStageIndex(currentStageIndex - 1);
      
      if (session) {
        updateSessionData(session[`${prevStage.id}_data` as keyof DiscoverySession] || {}, prevStage.id);
      }
    }
  };

  const getStageComponent = () => {
    if (!session) return null;

    const currentStage = STAGES[currentStageIndex];
    const stageData = session[`${currentStage.id}_data` as keyof DiscoverySession] as any;

    switch (currentStage.id) {
      case 'business_canvas':
        return (
          <BusinessModelCanvas
            data={stageData}
            onSave={(data) => updateSessionData(data, 'business_canvas')}
            sessionId={session.id}
          />
        );
      case 'inception':
        return (
          <InceptionWorkshop
            data={stageData}
            onSave={(data) => updateSessionData(data, 'inception')}
            sessionId={session.id}
          />
        );
      case 'pbb':
        return (
          <ProductBacklogBuilding
            data={stageData}
            onSave={(data) => updateSessionData(data, 'pbb')}
            sessionId={session.id}
          />
        );
      case 'sprint0':
        return (
          <Sprint0
            data={stageData}
            onSave={(data) => updateSessionData(data, 'sprint0')}
            sessionId={session.id}
          />
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando Discovery...</p>
        </div>
      </div>
    );
  }

  // Show sessions list if no specific session
  if (!sessionId) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/smart-hub')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Hub
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Discovery Inteligente</h1>
              <p className="text-muted-foreground">
                Metodologias integradas para descobrir features críticas
              </p>
            </div>
          </div>
          <Button onClick={createNewSession} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Sessão
          </Button>
        </div>

        {/* Methodology Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {STAGES.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <Card key={stage.id} className="relative">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{index + 1}</Badge>
                        <CardTitle className="text-sm">{stage.name}</CardTitle>
                      </div>
                      <CardDescription className="text-xs mt-1">
                        {stage.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            );
          })}
        </div>

        <Card className="text-center p-8">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Pronto para começar?</h3>
          <p className="text-muted-foreground mb-4">
            Inicie uma nova sessão de Discovery Inteligente para descobrir as features mais críticas do seu projeto.
          </p>
          <Button onClick={createNewSession} disabled={loading}>
            <Plus className="h-4 w-4 mr-2" />
            Iniciar Discovery
          </Button>
        </Card>
      </div>
    );
  }

  // Show specific session
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/smart-hub/discovery')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{session?.session_name}</h1>
            <p className="text-muted-foreground">Discovery Inteligente</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Progress */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Progresso da Sessão</h3>
              <span className="text-sm text-muted-foreground">
                {currentStageIndex + 1} de {STAGES.length}
              </span>
            </div>
            
            <Progress value={((currentStageIndex + 1) / STAGES.length) * 100} className="h-2" />
            
            <div className="grid grid-cols-4 gap-2">
              {STAGES.map((stage, index) => {
                const Icon = stage.icon;
                const isActive = index === currentStageIndex;
                const isCompleted = index < currentStageIndex;
                
                return (
                  <div key={stage.id} 
                       className={`flex items-center gap-2 p-2 rounded-lg text-xs ${
                         isActive ? 'bg-primary/10 border border-primary/20' :
                         isCompleted ? 'bg-success/10' : 'bg-muted/30'
                       }`}>
                    {isCompleted ? (
                      <CheckCircle className="h-4 w-4 text-success" />
                    ) : (
                      <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    )}
                    <span className={isActive ? 'font-medium' : ''}>{stage.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Stage Content */}
      <div className="space-y-6">
        {getStageComponent()}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button 
          variant="outline" 
          onClick={prevStage}
          disabled={currentStageIndex === 0}
        >
          Etapa Anterior
        </Button>
        
        <div className="text-sm text-muted-foreground">
          {STAGES[currentStageIndex]?.name}
        </div>
        
        {currentStageIndex < STAGES.length - 1 ? (
          <Button onClick={nextStage}>
            Próxima Etapa
          </Button>
        ) : (
          <Button variant="default">
            <Download className="h-4 w-4 mr-2" />
            Finalizar e Exportar
          </Button>
        )}
      </div>
    </div>
  );
}