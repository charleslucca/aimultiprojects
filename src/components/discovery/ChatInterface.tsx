import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Send, Bot, User, FileText, Download, Copy } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  extractedData?: any;
}

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isProcessing: boolean;
  sessionData?: any;
  currentStage: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isProcessing,
  sessionData,
  currentStage
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Auto-scroll para a última mensagem
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputMessage.trim() || isProcessing) return;
    
    onSendMessage(inputMessage.trim());
    setInputMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Texto copiado para a área de transferência.",
    });
  };

  const exportQuestions = (extractedData: any) => {
    if (!extractedData?.questions) return;

    const questionsList = extractedData.questions
      .map((q: any, index: number) => `${index + 1}. [${q.category?.toUpperCase() || 'GERAL'}] ${q.question}\n   Contexto: ${q.context || 'N/A'}`)
      .join('\n\n');

    const exportText = `PERGUNTAS PARA REUNIÃO - ${currentStage.toUpperCase()}
${'-'.repeat(50)}

${questionsList}

${extractedData.next_steps ? `PRÓXIMOS PASSOS:
${extractedData.next_steps}

` : ''}${extractedData.meeting_format ? `FORMATO DA REUNIÃO:
${extractedData.meeting_format}` : ''}

Gerado em: ${new Date().toLocaleString('pt-BR')}`;

    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `perguntas-${currentStage}-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "Perguntas exportadas!",
      description: "Arquivo baixado com sucesso.",
    });
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderQuestions = (extractedData: any) => {
    if (!extractedData?.questions) return null;

    return (
      <Card className="mt-3 border-green-200 bg-green-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-green-800">
              <FileText className="inline w-4 h-4 mr-2" />
              Perguntas Geradas para Reunião
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(JSON.stringify(extractedData, null, 2))}
                className="h-7 text-green-700 hover:text-green-800"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => exportQuestions(extractedData)}
                className="h-7 text-green-700 hover:text-green-800"
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            {extractedData.questions.map((question: any, index: number) => (
              <div key={index} className="border-l-2 border-green-300 pl-3">
                <div className="flex items-start gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">
                    {question.category?.replace('_', ' ').toUpperCase() || 'GERAL'}
                  </Badge>
                </div>
                <p className="font-medium text-sm text-green-900 mb-1">
                  {question.question}
                </p>
                {question.context && (
                  <p className="text-xs text-green-700 opacity-80">
                    {question.context}
                  </p>
                )}
              </div>
            ))}
          </div>

          {(extractedData.next_steps || extractedData.meeting_format) && (
            <>
              <Separator className="my-3" />
              <div className="text-xs space-y-2">
                {extractedData.next_steps && (
                  <div>
                    <span className="font-medium text-green-800">Próximos passos: </span>
                    <span className="text-green-700">{extractedData.next_steps}</span>
                  </div>
                )}
                {extractedData.meeting_format && (
                  <div>
                    <span className="font-medium text-green-800">Formato da reunião: </span>
                    <span className="text-green-700">{extractedData.meeting_format}</span>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Conversa com IA</CardTitle>
        {sessionData && (
          <div className="text-sm text-muted-foreground">
            {sessionData.session_name} • {currentStage.replace('_', ' ').toUpperCase()}
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea className="flex-1 px-6" ref={scrollAreaRef}>
          <div className="space-y-4 pb-4">
            {messages.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bot className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Olá! Vou te ajudar com o discovery do seu projeto.</p>
                <p className="text-sm mt-2">
                  Comece me contando sobre o projeto que você quer desenvolver.
                </p>
              </div>
            )}
            
            {messages.map((message, index) => (
              <div key={index} className="space-y-3">
                <div className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-3 max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`
                      flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                      ${message.role === 'user' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                      }
                    `}>
                      {message.role === 'user' ? (
                        <User className="h-4 w-4" />
                      ) : (
                        <Bot className="h-4 w-4" />
                      )}
                    </div>
                    
                    <div className={`
                      rounded-lg px-4 py-3 
                      ${message.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                      }
                    `}>
                      <div className="whitespace-pre-wrap text-sm">
                        {message.content}
                      </div>
                      <div className={`
                        text-xs mt-2 opacity-70
                        ${message.role === 'user' ? 'text-primary-foreground' : 'text-muted-foreground'}
                      `}>
                        {formatTimestamp(message.timestamp)}
                      </div>
                    </div>
                  </div>
                </div>
                
                {message.extractedData && renderQuestions(message.extractedData)}
              </div>
            ))}
            
            {isProcessing && (
              <div className="flex gap-3 justify-start">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted rounded-lg px-4 py-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    Analisando e gerando perguntas...
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Digite sua mensagem..."
              disabled={isProcessing}
              className="min-h-[44px] max-h-32"
              rows={1}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isProcessing}
              size="lg"
              className="px-4"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};