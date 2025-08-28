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

// Import ConversationalDiscovery for chat-based discovery
import ConversationalDiscovery from "@/components/discovery/ConversationalDiscovery";

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

  const [loading, setLoading] = useState(false);


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
          discovery_name: sessionName,
          current_stage: 'business_canvas',
          status: 'in_progress',
          discovery_type: 'conversational'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sessão criada",
        description: "Nova sessão de Discovery Conversacional iniciada",
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

  // Show specific session using ConversationalDiscovery
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => navigate('/smart-hub/discovery')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Discovery Inteligente</h1>
            <p className="text-muted-foreground">
              Modo Conversacional com IA
            </p>
          </div>
        </div>
      </div>

      {/* Conversational Discovery Component */}
      <ConversationalDiscovery sessionId={sessionId} />
    </div>
  );
}