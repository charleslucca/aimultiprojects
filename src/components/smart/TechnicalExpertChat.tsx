import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Send, 
  Loader2, 
  Code, 
  Shield, 
  Zap, 
  TestTube, 
  Search,
  FileText,
  Download,
  GitBranch
} from 'lucide-react';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  analysis_type?: string;
  repository?: string;
  artifacts?: any[];
}

interface TechnicalExpertChatProps {
  chatId?: string;
  onChatCreated: (chatId: string) => void;
}

interface GitHubRepository {
  id: string;
  name: string;
  full_name: string;
  description?: string;
  language?: string;
  hierarchy?: {
    client: string;
    project: string;
  };
}

const technicalActions = [
  {
    id: 'repository_analysis',
    name: 'Análise de Repositório',
    shortName: 'Repositório',
    description: 'Documentação completa da arquitetura',
    icon: FileText,
    color: 'bg-primary text-primary-foreground'
  },
  {
    id: 'security_analysis',
    name: 'Análise de Segurança',
    shortName: 'Segurança',
    description: 'Review de vulnerabilidades',
    icon: Shield,
    color: 'bg-destructive text-destructive-foreground'
  },
  {
    id: 'performance_analysis',
    name: 'Análise de Performance',
    shortName: 'Performance',
    description: 'Identificação de bottlenecks',
    icon: Zap,
    color: 'bg-warning text-warning-foreground'
  },
  {
    id: 'quality_analysis',
    name: 'Análise de Qualidade',
    shortName: 'Qualidade',
    description: 'Code review automatizado',
    icon: Search,
    color: 'bg-accent text-accent-foreground'
  },
  {
    id: 'test_generation',
    name: 'Geração de Testes',
    shortName: 'Testes',
    description: 'Sugestões de testes automatizados',
    icon: TestTube,
    color: 'bg-success text-success-foreground'
  }
];

export function TechnicalExpertChat({ chatId, onChatCreated }: TechnicalExpertChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [selectedRepository, setSelectedRepository] = useState<string>('');
  const [selectedAction, setSelectedAction] = useState<string>('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const currentRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (chatId) {
      loadChatHistory();
    } else {
      setMessages([{
        role: 'assistant',
        content: `Olá! Sou o **Especialista Técnico** do Smart Hub. 

Posso ajudar você com:
• 📊 **Análise de Repositório** - Documentação da arquitetura
• 🔒 **Análise de Segurança** - Review de vulnerabilidades  
• ⚡ **Análise de Performance** - Identificação de bottlenecks
• 🔍 **Análise de Qualidade** - Code review automatizado
• 🧪 **Geração de Testes** - Sugestões de testes

Primeiro, selecione um repositório GitHub e uma ação, ou faça uma pergunta técnica diretamente.`,
        timestamp: new Date()
      }]);
    }
    
    loadRepositories();
  }, [chatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const loadChatHistory = async () => {
    try {
      const { data: chatData, error: chatError } = await supabase
        .from('smart_hub_chats')
        .select('messages')
        .eq('id', chatId)
        .single();

      if (chatError) throw chatError;

      if (chatData?.messages && Array.isArray(chatData.messages)) {
        const parsedMessages = chatData.messages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(parsedMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const loadRepositories = async () => {
    try {
      // Load GitHub repositories - simplified approach for now
      const { data: repos, error } = await supabase
        .from('github_repositories')
        .select('id, name, full_name, description, language, integration_id')
        .limit(50);

      if (error) throw error;

      if (repos) {
        // For now, set repositories without hierarchy - will be improved later
        const transformedRepos = repos.map(repo => ({
          id: repo.id,
          name: repo.name,
          full_name: repo.full_name,
          description: repo.description,
          language: repo.language,
          hierarchy: {
            client: 'Cliente',
            project: 'Projeto'
          }
        }));
        
        setRepositories(transformedRepos as any);
      }
    } catch (error) {
      console.error('Error loading repositories:', error);
      toast({
        title: "Erro ao carregar repositórios",
        description: "Não foi possível carregar os repositórios. Verifique a conexão com GitHub.",
        variant: "destructive"
      });
    }
  };

  const createNewChat = async () => {
    try {
      const { data, error } = await supabase
        .from('smart_hub_chats')
        .insert([
          {
            chat_name: 'Especialista Técnico',
            messages: [],
            user_id: (await supabase.auth.getUser()).data.user?.id
          }
        ])
        .select()
        .single();

      if (error) throw error;

      onChatCreated(data.id);
      return data.id;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  };

  const handleActionClick = (actionId: string) => {
    if (!selectedRepository) {
      toast({
        title: "Selecione um repositório",
        description: "Por favor, selecione um repositório antes de executar uma ação.",
        variant: "destructive"
      });
      return;
    }

    const action = technicalActions.find(a => a.id === actionId);
    const repository = repositories.find(r => r.id === selectedRepository);
    
    if (action && repository) {
      const actionMessage = `${action.name}: ${repository.name}`;
      setInputMessage(actionMessage);
      setSelectedAction(actionId);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isProcessing) return;

    // Cancel any existing request
    if (currentRequestRef.current) {
      currentRequestRef.current.abort();
    }
    
    const abortController = new AbortController();
    currentRequestRef.current = abortController;

    setIsProcessing(true);

    try {
      let currentChatId = chatId;
      if (!currentChatId) {
        currentChatId = await createNewChat();
      }

      const userMessage: ChatMessage = {
        role: 'user',
        content: inputMessage,
        timestamp: new Date(),
        analysis_type: selectedAction,
        repository: selectedRepository
      };

      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setInputMessage('');

      const requestBody = {
        chatId: currentChatId,
        message: inputMessage,
        analysisType: selectedAction,
        repositoryId: selectedRepository
      };

      console.log('Sending technical analysis request:', requestBody);

      const { data, error } = await supabase.functions.invoke('analyze-repository', {
        body: requestBody
      });

      if (abortController.signal.aborted) return;

      if (error) {
        console.error('Technical analysis error:', error);
        throw error;
      }

      console.log('Technical analysis response:', data);

      if (data?.response) {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          artifacts: data.artifacts || []
        };

        setMessages(prev => [...prev, assistantMessage]);

        toast({
          title: "Análise concluída",
          description: "Análise técnica gerada com sucesso!"
        });
      }

      // Clear selections after successful analysis
      setSelectedAction('');
      
    } catch (error: any) {
      if (error.name === 'AbortError' || abortController.signal.aborted) {
        console.log('Request aborted');
        return;
      }

      console.error('Error in technical analysis:', error);
      
      const errorMessage = error?.message || 'Erro desconhecido na análise técnica';
      
      toast({
        title: "Erro na análise técnica",
        description: errorMessage,
        variant: "destructive"
      });

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Desculpe, ocorreu um erro: ${errorMessage}`,
        timestamp: new Date()
      }]);
    } finally {
      setIsProcessing(false);
      currentRequestRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const exportAnalysis = (content: string, type: string) => {
    const filename = `${type}_analysis_${new Date().toISOString().split('T')[0]}.md`;
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold">Especialista Técnico</h2>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-6 pt-0">
        {/* Repository and Action Selectors */}
        <div className="mb-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Repositório GitHub</label>
              <Select value={selectedRepository} onValueChange={setSelectedRepository}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um repositório" />
                </SelectTrigger>
                <SelectContent>
                  {repositories.map((repo) => (
                    <SelectItem key={repo.id} value={repo.id}>
                      <div className="flex flex-col items-start gap-1 py-1">
                        <div className="flex items-center gap-2">
                          <GitBranch className="w-4 h-4" />
                          <span className="font-medium">{repo.name}</span>
                          {repo.language && (
                            <Badge variant="secondary" className="text-xs">
                              {repo.language}
                            </Badge>
                          )}
                        </div>
                        {repo.hierarchy && (
                          <div className="text-xs text-muted-foreground ml-6">
                            {repo.hierarchy.client} → {repo.hierarchy.project}
                          </div>
                        )}
                        {repo.description && (
                          <div className="text-xs text-muted-foreground ml-6 truncate max-w-[300px]">
                            {repo.description}
                          </div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Ações Rápidas</label>
              <div className="grid grid-cols-2 gap-1">
                {technicalActions.slice(0, 4).map((action) => {
                  const IconComponent = action.icon;
                  return (
                    <Button
                      key={action.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleActionClick(action.id)}
                      disabled={!selectedRepository}
                      className="justify-start text-xs h-8"
                    >
                      <IconComponent className="w-3 h-3 mr-1" />
                      {(action as any).shortName}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>

          <Separator />
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 mb-4">
          <div className="space-y-4 pr-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] p-4 rounded-lg ${
                    message.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">
                    {message.content}
                  </div>
                  
                  {message.artifacts && message.artifacts.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/20">
                      <div className="flex flex-wrap gap-2">
                        {message.artifacts.map((artifact: any, idx: number) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            onClick={() => exportAnalysis(artifact.content, artifact.type)}
                            className="text-xs"
                          >
                            <Download className="w-3 h-3 mr-1" />
                            {artifact.name}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-muted p-4 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processando análise técnica...
                  </div>
                </div>
              </div>
            )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua pergunta técnica ou use as ações rápidas acima..."
              className="min-h-[60px] resize-none"
              disabled={isProcessing}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isProcessing}
              size="lg"
              className="px-6"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </>
  );
}