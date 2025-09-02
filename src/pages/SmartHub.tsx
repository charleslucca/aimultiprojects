import { Card } from "@/components/ui/card";
import { ProductExpertChat } from "@/components/smart/ProductExpertChat";
import { useState } from "react";

export default function SmartHub() {
  const [currentChatId, setCurrentChatId] = useState<string | undefined>();

  const handleChatCreated = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  return (
    <div className="container mx-auto px-4 py-6 h-screen flex flex-col">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold tracking-tight gradient-text mb-2">
          Smart Hub
        </h1>
        <p className="text-lg text-muted-foreground">
          Especialista IA em Produtos e Projetos Digitais
        </p>
      </div>

      <Card className="flex-1 flex flex-col">
        <ProductExpertChat 
          chatId={currentChatId}
          onChatCreated={handleChatCreated}
        />
      </Card>
    </div>
  );
}