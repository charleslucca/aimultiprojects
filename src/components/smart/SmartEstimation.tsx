import { SmartQuestionnaire, QuestionnaireSection } from "./SmartQuestionnaire";
import { SmartFileUpload } from "./SmartFileUpload";

interface SmartEstimationProps {
  data?: any;
  results?: any;
  onSave: (data: any, results?: any) => void;
  sessionId: string;
}

const ESTIMATION_SECTIONS: QuestionnaireSection[] = [
  {
    id: 'project_context',
    title: 'Contexto do Projeto',
    description: 'Informações sobre o projeto para estimativas precisas',
    questions: [
      {
        id: 'project_type',
        type: 'radio',
        title: 'Tipo de Projeto',
        options: ['Web App', 'Mobile App', 'API/Backend', 'E-commerce', 'Dashboard/BI'],
        required: true
      },
      {
        id: 'complexity',
        type: 'radio',
        title: 'Complexidade Geral',
        options: ['Baixa', 'Média', 'Alta', 'Muito Alta'],
        required: true
      }
    ]
  }
];

export function SmartEstimation({ data, results, onSave, sessionId }: SmartEstimationProps) {
  const handleFileUpload = (sectionId: string) => (
    <SmartFileUpload
      sessionId={sessionId}
      sessionType="delivery"
      stageName={`estimation_${sectionId}`}
      accept="audio/*,video/*,.pdf,.doc,.docx"
      maxFiles={2}
      className="mt-2"
    />
  );

  return (
    <SmartQuestionnaire
      title="Smart Estimation"
      description="Estimativas inteligentes baseadas em contexto e histórico."
      sections={ESTIMATION_SECTIONS}
      data={data}
      onSave={(data) => onSave(data, results)}
      onFileUpload={handleFileUpload}
      autoSave={true}
    />
  );
}