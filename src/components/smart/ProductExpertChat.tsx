import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SmartFileUpload } from "./SmartFileUpload";
import {
  Send,
  Bot,
  User,
  FileText,
  Download,
  Sparkles,
  Loader2,
  Paperclip
} from "lucide-react";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  attachments?: any[];
  artifacts?: any;
}

interface ProductExpertChatProps {
  chatId?: string;
  onChatCreated?: (chatId: string) => void;
}

export function ProductExpertChat({ chatId, onChatCreated }: ProductExpertChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(chatId);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom with proper timing
  const scrollToBottom = (smooth = true) => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      });
    }, 100);
  };

  useEffect(() => {
    if (currentChatId) {
      loadChatHistory();
    } else {
      // Show welcome message for new chat
      setMessages([{
        role: 'assistant',
        content: `👋 Olá! Sou seu especialista em produtos e projetos digitais.

**Como posso ajudar você hoje?**

🔹 **Anexe documentos** (áudios, vídeos, PDFs, docs) que eu analisarei automaticamente
🔹 **Faça perguntas** sobre seu projeto ou produto
🔹 **Gere artefatos** como Business Model Canvas, Product Backlog e Escopo de Entrega

📎 Use o botão de anexar arquivos ou simplesmente comece nossa conversa!`,
        timestamp: new Date().toISOString()
      }]);
    }
  }, [currentChatId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChatHistory = async () => {
    if (!currentChatId || !user) return;

    try {
      const { data, error } = await supabase
        .from('smart_hub_chats')
        .select('*')
        .eq('id', currentChatId)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data?.messages && Array.isArray(data.messages)) {
        setMessages(data.messages as unknown as ChatMessage[]);
      }
      if (data?.attachments && Array.isArray(data.attachments)) {
        setAttachments(data.attachments as unknown as any[]);
      }
    } catch (error) {
      console.error('Error loading chat:', error);
      toast({
        title: "Erro ao carregar conversa",
        description: "Não foi possível carregar o histórico.",
        variant: "destructive"
      });
    }
  };

  const createNewChat = async () => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('smart_hub_chats')
        .insert({
          user_id: user.id,
          chat_name: 'Nova Conversa - Produto Expert',
          messages: [],
          attachments: []
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentChatId(data.id);
      onChatCreated?.(data.id);
      return data.id;
    } catch (error) {
      console.error('Error creating chat:', error);
      throw error;
    }
  };

  const loadProcessedAttachments = async (chatId: string) => {
    if (!user) return [];

    try {
      const { data, error } = await supabase
        .from('smart_hub_uploads')
        .select('*')
        .eq('user_id', user.id)
        .eq('session_id', chatId)
        .eq('processing_status', 'completed');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading processed attachments:', error);
      return [];
    }
  };

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && attachments.length === 0) || isProcessing) return;

    try {
      setIsProcessing(true);

      // Create chat if doesn't exist
      let chatIdToUse = currentChatId;
      if (!chatIdToUse) {
        chatIdToUse = await createNewChat();
        if (!chatIdToUse) throw new Error('Failed to create chat');
      }

      // Load processed attachments from database with their content
      const processedAttachments = await loadProcessedAttachments(chatIdToUse);
      
      // Combine local attachments with processed ones
      const allAttachments = [
        ...attachments,
        ...processedAttachments.map(file => ({
          name: file.file_name,
          type: file.file_type,
          size: file.file_size,
          file_name: file.file_name,
          transcription: file.transcription,
          ai_analysis: file.ai_analysis,
          processing_status: file.processing_status
        }))
      ];

      // Add user message to UI immediately
      const userMessage: ChatMessage = {
        role: 'user',
        content: inputMessage,
        timestamp: new Date().toISOString(),
        attachments: attachments.length > 0 ? attachments : undefined
      };

      setMessages(prev => [...prev, userMessage]);
      setInputMessage("");

      // Call AI expert with complete attachment data
      const { data, error } = await supabase.functions.invoke('product-expert-chat', {
        body: {
          chatId: chatIdToUse,
          message: inputMessage,
          attachments: allAttachments
        }
      });

      if (error) throw error;

      // Add AI response
      const aiMessage: ChatMessage = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date().toISOString(),
        artifacts: data.artifacts
      };

      setMessages(prev => [...prev, aiMessage]);

      // Clear attachments after sending
      setAttachments([]);
      setShowUpload(false);

      toast({
        title: "Resposta gerada",
        description: `Usando modelo: ${data.model_used}`,
      });

    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Determine user-friendly error message based on error type
      let errorMessage = 'Ocorreu um erro inesperado. Tente novamente.';
      
      if (error.message?.includes('timeout') || error.message?.includes('408')) {
        errorMessage = 'O processamento está demorando mais que o esperado. Tente com arquivos menores ou aguarde alguns minutos.';
      } else if (error.message?.includes('503') || error.message?.includes('Service')) {
        errorMessage = 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.';
      } else if (error.message?.includes('Network') || error.message?.includes('fetch')) {
        errorMessage = 'Problema de conexão. Verifique sua internet e tente novamente.';
      } else if (error.message?.includes('500')) {
        errorMessage = 'Erro interno do servidor. Os desenvolvedores foram notificados.';
      } else if (error.message?.includes('temporary_overload')) {
        errorMessage = 'Serviço temporariamente sobrecarregado. Aguarde alguns instantes.';
      }

      // Add error message to chat
      const errorAiMessage: ChatMessage = {
        role: 'assistant',
        content: `❌ **Erro**: ${errorMessage}

💡 **Sugestões:**
- Tente novamente em alguns instantes
- Se o problema persistir, recarregue a página
- Verifique se os arquivos não são muito grandes (máx. 10MB)

Seus arquivos foram salvos automaticamente.`,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorAiMessage]);

      toast({
        title: "Erro ao processar mensagem",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const exportArtifact = (artifact: any) => {
    if (!artifact) return;

    const content = JSON.stringify(artifact.content, null, 2);
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${artifact.artifact_type}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Artefato exportado",
      description: "Download iniciado com sucesso.",
    });
  };

  const renderMessage = (message: ChatMessage, index: number) => {
    const isUser = message.role === 'user';
    
    return (
      <div key={index} className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-primary' : 'bg-accent'
        }`}>
          {isUser ? (
            <User className="h-4 w-4 text-primary-foreground" />
          ) : (
            <Bot className="h-4 w-4 text-accent-foreground" />
          )}
        </div>
        
        <div className={`flex-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
          <div className={`rounded-lg p-3 ${
            isUser 
              ? 'bg-primary text-primary-foreground ml-auto' 
              : 'bg-muted'
          }`}>
            <div className="whitespace-pre-wrap text-sm">{message.content}</div>
            
            {message.attachments && message.attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {message.attachments.map((att, i) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    <Paperclip className="h-3 w-3 mr-1" />
                    {att.file_name}
                  </Badge>
                ))}
              </div>
            )}

            {message.artifacts && (
              <div className="mt-3 p-2 border rounded bg-background/50">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium">
                      {message.artifacts.artifact_type === 'business_model_canvas' ? 'Business Model Canvas' :
                       message.artifacts.artifact_type === 'product_backlog' ? 'Product Backlog' :
                       message.artifacts.artifact_type === 'delivery_scope' ? 'Escopo de Entrega' :
                       'Artefato Gerado'}
                    </span>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => exportArtifact(message.artifacts)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Artefato estruturado gerado automaticamente
                </p>
              </div>
            )}
          </div>
          
          <span className="text-xs text-muted-foreground mt-1">
            {new Date(message.timestamp).toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-120px)]">
      {/* Header */}
      <CardHeader className="flex-shrink-0 pb-4">
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          Especialista em Produtos Digitais
          <Badge variant="secondary" className="ml-auto">IA Expert</Badge>
        </CardTitle>
      </CardHeader>

      {/* Messages */}
      <CardContent className="flex-1 flex flex-col min-h-0">
        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4 pb-4">
            {messages.map(renderMessage)}
            {isProcessing && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center">
                  <Bot className="h-4 w-4 text-accent-foreground" />
                </div>
                <div className="flex-1">
                  <div className="bg-muted rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">
                        Analisando e gerando resposta...
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div ref={messagesEndRef} />
        </ScrollArea>

        {/* File Upload Area */}
        {showUpload && currentChatId && (
          <div className="border-t pt-4 mb-4">
            <SmartFileUpload
              sessionId={currentChatId}
              sessionType="chat"
              stageName="hub"
              onUploadComplete={(files) => {
                setAttachments(prev => [...prev, ...files]);
                toast({
                  title: "Arquivos anexados",
                  description: `${files.length} arquivo(s) processado(s) com sucesso.`
                });
              }}
              maxFiles={10}
              className="mb-4"
            />
          </div>
        )}

        {/* Input Area */}
        <div className="flex-shrink-0 space-y-2">
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {attachments.map((att, i) => (
                <Badge key={i} variant="outline">
                  <FileText className="h-3 w-3 mr-1" />
                  {att.file_name}
                </Badge>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (!showUpload && !currentChatId) {
                  // Create chat automatically when user wants to upload
                  try {
                    await createNewChat();
                  } catch (error) {
                    toast({
                      title: "Erro",
                      description: "Não foi possível preparar o upload. Tente novamente.",
                      variant: "destructive"
                    });
                    return;
                  }
                }
                setShowUpload(!showUpload);
              }}
              className="flex-shrink-0"
            >
              <Paperclip className="h-4 w-4" />
            </Button>
            
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem ou descreva seu projeto..."
              className="min-h-[80px] resize-none"
              disabled={isProcessing}
            />
            
            <Button
              onClick={handleSendMessage}
              disabled={(!inputMessage.trim() && attachments.length === 0) || isProcessing}
              className="flex-shrink-0 h-auto"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </div>
  );
}