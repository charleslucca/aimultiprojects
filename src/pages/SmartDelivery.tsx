import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Plus,
  Clock,
  Users,
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Target
} from "lucide-react";

// Module Components
import { SmartEstimation } from "@/components/smart/SmartEstimation";
import { CapacityPlanning } from "@/components/smart/CapacityPlanning";
import { RiskAssessment } from "@/components/smart/RiskAssessment";

interface DeliverySession {
  id: string;
  session_name: string;
  delivery_type: string;
  status: string;
  session_data: any;
  results: any;
  project_id?: string;
  created_at: string;
}

const DELIVERY_MODULES = [
  {
    id: 'estimation',
    name: 'Smart Estimation',
    icon: Clock,
    description: 'Estimativas inteligentes baseadas em histórico e contexto',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200'
  },
  {
    id: 'capacity_planning',
    name: 'Capacity Planning',
    icon: Users,
    description: 'Planejamento de capacidade da equipe e recursos',
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200'
  },
  {
    id: 'risk_assessment',
    name: 'Risk Assessment',
    icon: BarChart3,
    description: 'Análise de riscos e identificação de gargalos',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200'
  }
];

export default function SmartDelivery() {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  // Remove auth dependencies for now
  const user = null;
  const { toast } = useToast();

  const [sessions, setSessions] = useState<DeliverySession[]>([]);
  const [currentSession, setCurrentSession] = useState<DeliverySession | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedModule, setSelectedModule] = useState<string>('');

  useEffect(() => {
    if (sessionId) {
      loadSession();
    } else {
      loadSessions();
    }
  }, [sessionId]);

  const loadSessions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('smart_delivery_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setSessions(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar sessões",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSession = async () => {
    if (!sessionId || !user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('smart_delivery_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setCurrentSession(data);
      setSelectedModule(data.delivery_type);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar sessão",
        description: error.message,
        variant: "destructive",
      });
      navigate('/smart-hub/delivery');
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async (moduleType: string) => {
    if (!user) return;

    try {
      setLoading(true);
      
      const moduleName = DELIVERY_MODULES.find(m => m.id === moduleType)?.name || moduleType;
      const sessionName = `${moduleName} - ${new Date().toLocaleDateString('pt-BR')}`;
      
      const { data, error } = await supabase
        .from('smart_delivery_sessions')
        .insert({
          user_id: user.id,
          session_name: sessionName,
          delivery_type: moduleType,
          status: 'active',
          session_data: {}
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sessão criada",
        description: `Nova sessão de ${moduleName} iniciada`,
      });

      navigate(`/smart-hub/delivery/${data.id}`);
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

  const updateSessionData = async (sessionData: any, results?: any) => {
    if (!currentSession || !user) return;

    try {
      const updateData: any = {
        session_data: sessionData
      };
      
      if (results) {
        updateData.results = results;
      }

      const { error } = await supabase
        .from('smart_delivery_sessions')
        .update(updateData)
        .eq('id', currentSession.id);

      if (error) throw error;

      setCurrentSession(prev => prev ? {
        ...prev,
        session_data: sessionData,
        ...(results && { results })
      } : null);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getModuleComponent = () => {
    if (!currentSession) return null;

    switch (selectedModule) {
      case 'estimation':
        return (
          <SmartEstimation
            data={currentSession.session_data}
            results={currentSession.results}
            onSave={(data, results) => updateSessionData(data, results)}
            sessionId={currentSession.id}
          />
        );
      case 'capacity_planning':
        return (
          <CapacityPlanning
            data={currentSession.session_data}
            results={currentSession.results}
            onSave={(data, results) => updateSessionData(data, results)}
            sessionId={currentSession.id}
          />
        );
      case 'risk_assessment':
        return (
          <RiskAssessment
            data={currentSession.session_data}
            results={currentSession.results}
            onSave={(data, results) => updateSessionData(data, results)}
            sessionId={currentSession.id}
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
          <p className="text-muted-foreground">Carregando Delivery...</p>
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
              <h1 className="text-3xl font-bold tracking-tight">Delivery Inteligente</h1>
              <p className="text-muted-foreground">
                Ferramentas para otimizar estimativas, capacidade e riscos
              </p>
            </div>
          </div>
        </div>

        {/* Delivery Modules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DELIVERY_MODULES.map((module) => {
            const Icon = module.icon;
            return (
              <Card key={module.id} className={`hover:shadow-lg transition-all cursor-pointer group ${module.borderColor} border`}>
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`p-3 rounded-lg ${module.bgColor}`}>
                      <Icon className={`h-6 w-6 ${module.color}`} />
                    </div>
                    <div>
                      <CardTitle className={`group-hover:${module.color} transition-colors`}>
                        {module.name}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {module.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={() => createNewSession(module.id)}
                    className="w-full"
                    disabled={loading}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Sessão
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sessões Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {sessions.slice(0, 5).map((session) => {
                  const module = DELIVERY_MODULES.find(m => m.id === session.delivery_type);
                  const Icon = module?.icon || Target;
                  
                  return (
                    <div key={session.id} 
                         className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                         onClick={() => navigate(`/smart-hub/delivery/${session.id}`)}>
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${module?.color || 'text-primary'}`} />
                        <div>
                          <p className="font-medium">{session.session_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {module?.name} • {new Date(session.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <Badge variant={session.status === 'active' ? 'default' : 'secondary'}>
                        {session.status === 'active' ? 'Ativo' : 'Finalizado'}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {sessions.length === 0 && (
          <Card className="text-center p-8">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma sessão encontrada</h3>
            <p className="text-muted-foreground mb-4">
              Escolha um dos módulos acima para começar a otimizar suas entregas.
            </p>
          </Card>
        )}
      </div>
    );
  }

  // Show specific session
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/smart-hub/delivery')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{currentSession?.session_name}</h1>
            <p className="text-muted-foreground">
              {DELIVERY_MODULES.find(m => m.id === selectedModule)?.name}
            </p>
          </div>
        </div>
        <Badge variant={currentSession?.status === 'active' ? 'default' : 'secondary'}>
          {currentSession?.status === 'active' ? 'Ativo' : 'Finalizado'}
        </Badge>
      </div>

      {/* Module Content */}
      <div className="space-y-6">
        {getModuleComponent()}
      </div>
    </div>
  );
}