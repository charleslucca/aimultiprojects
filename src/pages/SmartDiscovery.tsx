import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Target, Users, FileText, Settings, Plus, Sparkles, Brain, Zap } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ConversationalDiscovery from "@/components/discovery/ConversationalDiscovery";
import { DiscoveryWizard } from "@/components/discovery/DiscoveryWizard";

interface DiscoverySession {
  id: string;
  session_name: string;
  current_stage: string;
  status: string;
  business_canvas_data?: any;
  inception_data?: any;
  pbb_data?: any;
  sprint0_data?: any;
}

const METHODOLOGIES = [
  {
    id: 'business_canvas',
    name: 'Business Model Canvas',
    icon: Target,
    description: 'Definir modelo de negócio, proposta de valor e segmentos de clientes',
    color: 'bg-blue-500',
    estimatedTime: '45-60 min',
    benefits: ['Clareza sobre o modelo de negócio', 'Identificação de riscos', 'Alinhamento estratégico'],
    questions_focus: 'Proposta de valor, segmentos de clientes, canais, receitas'
  },
  {
    id: 'inception',
    name: 'Inception Workshop',
    icon: Users,
    description: 'Alinhar visão do produto, definir objetivos e entender usuários',
    color: 'bg-purple-500',
    estimatedTime: '60-90 min',
    benefits: ['Visão clara do produto', 'Objetivos alinhados', 'Personas definidas'],
    questions_focus: 'Visão do produto, objetivos, personas, jornada do usuário'
  },
  {
    id: 'pbb',
    name: 'Product Backlog Building',
    icon: FileText,
    description: 'Construir e priorizar backlog com épicos e funcionalidades',
    color: 'bg-green-500',
    estimatedTime: '90-120 min',
    benefits: ['Backlog priorizado', 'Escopo definido', 'Estimativas iniciais'],
    questions_focus: 'Épicos, funcionalidades, priorização, critérios de aceite'
  },
  {
    id: 'sprint0',
    name: 'Sprint 0',
    icon: Settings,
    description: 'Preparar ambiente de desenvolvimento e definir padrões',
    color: 'bg-orange-500',
    estimatedTime: '30-45 min',
    benefits: ['Ambiente preparado', 'Padrões definidos', 'Processo estabelecido'],
    questions_focus: 'Ferramentas, padrões de código, processos, qualidade'
  }
];

const SmartDiscovery: React.FC = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [loading, setLoading] = useState(false);
  const [showMethodologySelection, setShowMethodologySelection] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [selectedMethodology, setSelectedMethodology] = useState<string>('');
  const { toast } = useToast();

  const createNewSession = async (methodologyId: string, sessionName: string) => {
    setLoading(true);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) {
        throw new Error('Usuário não autenticado');
      }

      const methodology = METHODOLOGIES.find(m => m.id === methodologyId);
      const defaultName = sessionName || `Discovery - ${methodology?.name} - ${new Date().toLocaleDateString('pt-BR')}`;

      const { data, error } = await supabase
        .from('smart_discovery_sessions')
        .insert({
          session_name: defaultName,
          user_id: user.data.user.id,
          current_stage: methodologyId,
          status: 'in_progress',
          discovery_type: 'methodology_focused',
          session_metadata: {
            methodology: methodologyId,
            methodology_name: methodology?.name,
            created_via: 'methodology_selection'
          }
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Sessão criada!",
        description: `Discovery ${methodology?.name} iniciado com sucesso.`,
      });

      navigate(`/smart-hub/discovery/${data.id}`);
    } catch (error) {
      console.error('Erro ao criar sessão:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar a sessão. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMethodologySelect = (methodologyId: string) => {
    setSelectedMethodology(methodologyId);
    setShowMethodologySelection(true);
  };

  const handleCreateSession = () => {
    if (!selectedMethodology) return;
    createNewSession(selectedMethodology, newSessionName);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Criando sessão...</p>
        </div>
      </div>
    );
  }

  // Se tem sessionId, renderizar a interface de discovery
  if (sessionId) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/smart-hub/discovery')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Hub
              </Button>
              <div>
                <CardTitle className="text-xl">Sessão de Discovery</CardTitle>
                <CardDescription>
                  Conversação inteligente para gerar perguntas estruturadas
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <ConversationalDiscovery 
          sessionId={sessionId}
          onBack={() => navigate('/smart-hub/discovery')}
        />
      </div>
    );
  }

  // Modal de criação de sessão
  if (showMethodologySelection) {
    const methodology = METHODOLOGIES.find(m => m.id === selectedMethodology);
    const Icon = methodology?.icon || Target;

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowMethodologySelection(false)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div>
                <CardTitle className="text-xl">Criar Nova Sessão</CardTitle>
                <CardDescription>
                  Configurar discovery com {methodology?.name}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${methodology?.color} text-white`}>
                  <Icon className="h-8 w-8" />
                </div>
                <div>
                  <CardTitle>{methodology?.name}</CardTitle>
                  <CardDescription>{methodology?.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Benefícios:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {methodology?.benefits.map((benefit, index) => (
                      <li key={index}>• {benefit}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Foco das Perguntas:</h4>
                  <p className="text-sm text-muted-foreground">
                    {methodology?.questions_focus}
                  </p>
                  <Badge variant="outline" className="mt-2">
                    {methodology?.estimatedTime}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da Sessão (opcional)</label>
                <Input
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder={`Discovery - ${methodology?.name} - ${new Date().toLocaleDateString('pt-BR')}`}
                />
              </div>

              <div className="flex gap-3">
                <Button onClick={handleCreateSession} className="flex-1">
                  <Sparkles className="h-4 w-4 mr-2" />
                  Iniciar Discovery
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Hub principal - lista de metodologias
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/smart-hub')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao Hub
              </Button>
              <div>
                <CardTitle className="text-2xl">Discovery Conversacional</CardTitle>
                <CardDescription>
                  Escolha uma metodologia e deixe a IA gerar perguntas estruturadas para suas reuniões
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="text-center space-y-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Brain className="h-8 w-8 text-primary" />
            <h3 className="text-2xl font-bold">Discovery Conversacional com IA</h3>
            <Zap className="h-8 w-8 text-primary" />
          </div>
          <p className="text-lg text-muted-foreground mb-6">
            Transforme conversas em perguntas estruturadas para suas reuniões de descoberta
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-xl font-bold text-blue-600">1</span>
              </div>
              <h4 className="font-semibold">Escolha a Metodologia</h4>
              <p className="text-sm text-muted-foreground">
                Selecione Canvas, Inception, PBB ou Sprint 0
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-xl font-bold text-green-600">2</span>
              </div>
              <h4 className="font-semibold">Converse com a IA</h4>
              <p className="text-sm text-muted-foreground">
                Descreva seu projeto e objetivos naturalmente
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-xl font-bold text-purple-600">3</span>
              </div>
              <h4 className="font-semibold">Receba Perguntas</h4>
              <p className="text-sm text-muted-foreground">
                Obtenha perguntas estruturadas para suas reuniões
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {METHODOLOGIES.map((methodology) => {
          const Icon = methodology.icon;
          return (
            <Card 
              key={methodology.id}
              className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-primary/50"
              onClick={() => handleMethodologySelect(methodology.id)}
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${methodology.color} text-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <CardTitle className="text-lg">{methodology.name}</CardTitle>
                    <CardDescription>
                      {methodology.description}
                    </CardDescription>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="text-xs">
                        {methodology.estimatedTime}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-1">Foco das Perguntas:</h4>
                    <p className="text-xs text-muted-foreground">
                      {methodology.questions_focus}
                    </p>
                  </div>
                  
                  <Button variant="outline" className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Iniciar {methodology.name}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default SmartDiscovery;