import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Lightbulb,
  Rocket,
  BarChart3,
  Plus,
  Clock,
  CheckCircle,
  PlayCircle,
  FileText,
  Users,
  Target
} from "lucide-react";

interface Session {
  id: string;
  session_name: string;
  status: string;
  current_stage?: string;
  delivery_type?: string;
  created_at: string;
  updated_at: string;
}

export default function SmartHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [discoverySessions, setDiscoverySessions] = useState<Session[]>([]);
  const [deliverySessions, setDeliverySessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load discovery sessions
      const { data: discoveryData } = await supabase
        .from('smart_discovery_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      // Load delivery sessions
      const { data: deliveryData } = await supabase
        .from('smart_delivery_sessions')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(5);

      setDiscoverySessions(discoveryData || []);
      setDeliverySessions(deliveryData || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, currentStage?: string) => {
    const variants = {
      'in_progress': 'default',
      'completed': 'secondary',
      'paused': 'secondary',
      'active': 'default'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status === 'in_progress' && currentStage ? 
          `Em andamento: ${currentStage}` : 
          status === 'active' ? 'Ativo' : 
          status === 'completed' ? 'Concluído' : 
          'Pausado'
        }
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando Smart Hub...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight gradient-text mb-4">
          Smart Hub
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Ferramentas inteligentes para Discovery e Delivery de projetos com IA integrada
        </p>
      </div>

      {/* Main Features Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Discovery Inteligente */}
        <Card className="glass-card shadow-alpine hover:shadow-lg transition-all cursor-pointer group" 
              onClick={() => navigate('/smart-hub/discovery')}>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Lightbulb className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-xl group-hover:text-primary transition-colors">
                  Discovery Inteligente
                </CardTitle>
                <CardDescription>
                  Business Canvas → Inception → PBB → Sprint 0
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Descubra features críticas através de metodologias integradas com IA para gerar backlog inicial.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <Target className="h-4 w-4 text-accent" />
                <span>Business Model Canvas</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Users className="h-4 w-4 text-accent" />
                <span>Inception Workshop</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <FileText className="h-4 w-4 text-accent" />
                <span>Product Backlog Building</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <PlayCircle className="h-4 w-4 text-accent" />
                <span>Sprint 0 Planning</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delivery Inteligente */}
        <Card className="glass-card shadow-alpine hover:shadow-lg transition-all cursor-pointer group"
              onClick={() => navigate('/smart-hub/delivery')}>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-accent/10">
                <Rocket className="h-6 w-6 text-accent" />
              </div>
              <div>
                <CardTitle className="text-xl group-hover:text-accent transition-colors">
                  Delivery Inteligente
                </CardTitle>
                <CardDescription>
                  Estimativas, Capacidade e Riscos
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Otimize entregas com estimativas inteligentes, planejamento de capacidade e análise de riscos.
            </p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs">
                <Clock className="h-4 w-4 text-primary" />
                <span>Smart Estimation</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Users className="h-4 w-4 text-primary" />
                <span>Capacity Planning</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <BarChart3 className="h-4 w-4 text-primary" />
                <span>Risk Assessment</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Analytics Inteligente */}
        <Card className="glass-card shadow-alpine hover:shadow-lg transition-all cursor-pointer group">
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-success/10">
                <BarChart3 className="h-6 w-6 text-success" />
              </div>
              <div>
                <CardTitle className="text-xl group-hover:text-success transition-colors">
                  Analytics Inteligente
                </CardTitle>
                <CardDescription>
                  Insights e Relatórios (Em breve)
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Dashboards inteligentes com insights automáticos sobre performance e tendências.
            </p>
            <Badge variant="outline">Em Desenvolvimento</Badge>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Discovery Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Sessões de Discovery
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/smart-hub/discovery')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Sessão
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {discoverySessions.length > 0 ? (
              <div className="space-y-3">
                {discoverySessions.map((session) => (
                  <div key={session.id} 
                       className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                       onClick={() => navigate(`/smart-hub/discovery/${session.id}`)}>
                    <div className="flex-1">
                      <p className="font-medium">{session.session_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(session.updated_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    {getStatusBadge(session.status, session.current_stage)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma sessão de discovery</p>
                <Button 
                  variant="outline" 
                  className="mt-3"
                  onClick={() => navigate('/smart-hub/discovery')}
                >
                  Criar primeira sessão
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Delivery Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Sessões de Delivery
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => navigate('/smart-hub/delivery')}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Sessão
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {deliverySessions.length > 0 ? (
              <div className="space-y-3">
                {deliverySessions.map((session) => (
                  <div key={session.id} 
                       className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                       onClick={() => navigate(`/smart-hub/delivery/${session.id}`)}>
                    <div className="flex-1">
                      <p className="font-medium">{session.session_name}</p>
                      <p className="text-sm text-muted-foreground">
                        Tipo: {session.delivery_type} • {new Date(session.updated_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    {getStatusBadge(session.status)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Rocket className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Nenhuma sessão de delivery</p>
                <Button 
                  variant="outline" 
                  className="mt-3"
                  onClick={() => navigate('/smart-hub/delivery')}
                >
                  Criar primeira sessão
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}