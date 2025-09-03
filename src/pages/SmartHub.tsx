import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProductExpertChat } from "@/components/smart/ProductExpertChat";
import { TechnicalExpertChat } from "@/components/smart/TechnicalExpertChat";
import { useState } from "react";
import { Brain, Code, FileText } from "lucide-react";

type SpecialistType = 'product' | 'technical' | 'documentation';

const specialists = [
  {
    id: 'product' as SpecialistType,
    name: 'Especialista em Produtos',
    description: 'Business Canvas, Backlogs, Personas',
    icon: Brain,
    color: 'bg-primary text-primary-foreground'
  },
  {
    id: 'technical' as SpecialistType,
    name: 'Especialista Técnico',
    description: 'Arquitetura, Código, Análises',
    icon: Code,
    color: 'bg-accent text-accent-foreground'
  },
  {
    id: 'documentation' as SpecialistType,
    name: 'Especialista em Documentação',
    description: 'READMEs, APIs, Diagramas',
    icon: FileText,
    color: 'bg-secondary text-secondary-foreground'
  }
];

export default function SmartHub() {
  const [currentChatId, setCurrentChatId] = useState<string | undefined>();
  const [selectedSpecialist, setSelectedSpecialist] = useState<SpecialistType>('product');

  const handleChatCreated = (chatId: string) => {
    setCurrentChatId(chatId);
  };

  const handleSpecialistChange = (specialist: SpecialistType) => {
    setSelectedSpecialist(specialist);
    setCurrentChatId(undefined); // Reset chat when changing specialist
  };

  const renderChat = () => {
    switch (selectedSpecialist) {
      case 'product':
        return (
          <ProductExpertChat 
            chatId={currentChatId}
            onChatCreated={handleChatCreated}
          />
        );
      case 'technical':
        return (
          <TechnicalExpertChat 
            chatId={currentChatId}
            onChatCreated={handleChatCreated}
          />
        );
      case 'documentation':
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Especialista em Documentação - Em breve
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 h-screen flex flex-col">
      <div className="text-center mb-6">
        <h1 className="text-4xl font-bold tracking-tight gradient-text mb-2">
          Smart Hub
        </h1>
        <p className="text-lg text-muted-foreground">
          Central de Especialistas IA
        </p>
      </div>

      {/* Specialist Selector */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {specialists.map((specialist) => {
            const IconComponent = specialist.icon;
            const isSelected = selectedSpecialist === specialist.id;
            
            return (
              <div
                key={specialist.id}
                onClick={() => handleSpecialistChange(specialist.id)}
                className={`
                  p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                  ${isSelected 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }
                `}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className={`p-2 rounded-md ${specialist.color}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-sm">{specialist.name}</h3>
                  {isSelected && <Badge variant="default" className="ml-auto">Ativo</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{specialist.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      <Card className="flex-1 flex flex-col">
        {renderChat()}
      </Card>
    </div>
  );
}