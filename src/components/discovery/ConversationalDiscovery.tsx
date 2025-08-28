import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  MessageSquare,
  Send,
  Bot,
  User,
  Brain,
  FileText,
  Download,
  Plus,
  Lightbulb,
  Target,
  Users,
  PlayCircle
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

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
}

export default function ConversationalDiscovery() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionName, setSessionName] = useState('');
  const [currentSession, setCurrentSession] = useState<DiscoverySession | null>(null);
  const [showNewSession, setShowNewSession] = useState(!currentSession);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const createNewSession = async () => {
    if (!sessionName.trim() || !user) {
      toast({
        title: "Erro",
        description: "Por favor, forneça um nome para a sessão",
        variant: "destructive"
      });
      return;
    }

    try {
      const { data: sessionData, error } = await supabase
        .from('smart_discovery_sessions')
        .insert({
          session_name: sessionName,
          discovery_name: sessionName,
          user_id: user.id,
          current_stage: 'business_canvas',
          status: 'in_progress',
          discovery_type: 'conversational'
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentSession(sessionData);
      setShowNewSession(false);
      
      // Add welcome message
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `Olá! Sou seu assistente de IA para Discovery Conversacional. Vamos descobrir juntos as funcionalidades críticas do seu projeto "${sessionName}".

Vou te guiar através de 4 etapas:
🎯 **Business Model Canvas** - Modelo de negócio
👥 **Inception Workshop** - Visão e objetivos  
📋 **Product Backlog Building** - Funcionalidades
🚀 **Sprint 0** - Planejamento inicial

Vamos começar! Me conte sobre o seu projeto: qual o objetivo principal e para quem é destinado?`,
        timestamp: new Date()
      };
      
      setMessages([welcomeMessage]);
      
      toast({
        title: "Sessão criada",
        description: "Sua sessão de discovery conversacional foi iniciada!",
      });

    } catch (error: any) {
      console.error('Error creating session:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar sessão: " + error.message,
        variant: "destructive"
      });
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || !currentSession || isProcessing) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('discovery-ai-chat', {
        body: {
          sessionId: currentSession.id,
          message: inputMessage,
          currentStage: currentSession.current_stage,
          conversationHistory: messages
        }
      });

      if (error) throw error;

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        metadata: data.stageData
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update session if stage changed
      if (data.stageChanged) {
        setCurrentSession(prev => prev ? {
          ...prev,
          current_stage: data.newStage,
          business_canvas_data: data.businessCanvas || prev.business_canvas_data,
          inception_data: data.inceptionData || prev.inception_data,
          pbb_data: data.pbbData || prev.pbb_data,
          sprint0_data: data.sprint0Data || prev.sprint0_data,
          generated_backlog: data.backlog || prev.generated_backlog
        } : null);
      }

    } catch (error: any) {
      console.error('Error sending message:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar mensagem: " + error.message,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'business_canvas':
        return <Target className="h-4 w-4" />;
      case 'inception':
        return <Users className="h-4 w-4" />;
      case 'pbb':
        return <FileText className="h-4 w-4" />;
      case 'sprint0':
        return <PlayCircle className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const getStageName = (stage: string) => {
    switch (stage) {
      case 'business_canvas':
        return 'Business Model Canvas';
      case 'inception':
        return 'Inception Workshop';
      case 'pbb':
        return 'Product Backlog Building';
      case 'sprint0':
        return 'Sprint 0';
      default:
        return 'Discovery';
    }
  };

  if (showNewSession) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <MessageSquare className="h-6 w-6" />
              Discovery Conversacional com IA
            </CardTitle>
            <CardDescription>
              Descubra funcionalidades críticas através de conversas inteligentes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Nome da Sessão de Discovery
              </label>
              <Input
                placeholder="Ex: App de Delivery - Discovery"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && createNewSession()}
              />
            </div>

            <div className="space-y-3">
              <h4 className="font-medium">O que você vai descobrir:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <Target className="h-4 w-4 text-primary" />
                  <span>Modelo de Negócio</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Visão e Objetivos</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-primary" />
                  <span>Backlog Inicial</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <PlayCircle className="h-4 w-4 text-primary" />
                  <span>Sprint 0</span>
                </div>
              </div>
            </div>

            <Button onClick={createNewSession} className="w-full" disabled={!sessionName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Iniciar Discovery Conversacional
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      {/* Session Header */}
      <Card className="mb-4">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                {currentSession?.session_name}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                {getStageIcon(currentSession?.current_stage || '')}
                Etapa atual: {getStageName(currentSession?.current_stage || '')}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">
                {messages.length - 1} mensagens
              </Badge>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Chat Messages */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 flex flex-col p-0">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                      message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                    </div>
                    <div className={`rounded-lg p-3 ${
                      message.role === 'user' 
                        ? 'bg-primary text-primary-foreground ml-4' 
                        : 'bg-muted mr-4'
                    }`}>
                      <div className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </div>
                      <div className={`text-xs mt-2 opacity-70`}>
                        {message.timestamp.toLocaleTimeString('pt-BR')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {isProcessing && (
                <div className="flex gap-3 justify-start">
                  <div className="flex gap-3 max-w-[80%]">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Brain className="h-4 w-4 animate-pulse" />
                    </div>
                    <div className="rounded-lg p-3 bg-muted mr-4">
                      <div className="flex items-center gap-2 text-sm">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></div>
                        IA processando...
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                rows={2}
                className="resize-none"
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isProcessing}
                size="sm"
                className="self-end"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}