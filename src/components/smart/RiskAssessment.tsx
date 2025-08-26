import { SmartQuestionnaire, QuestionnaireSection } from "./SmartQuestionnaire";
import { SmartFileUpload } from "./SmartFileUpload";

interface RiskAssessmentProps {
  data?: any;
  results?: any;
  onSave: (data: any, results?: any) => void;
  sessionId: string;
}

const RISK_SECTIONS: QuestionnaireSection[] = [
  {
    id: 'project_risks',
    title: 'Riscos do Projeto',
    description: 'Identifique e avalie riscos potenciais',
    questions: [
      {
        id: 'technical_risks',
        type: 'textarea',
        title: 'Riscos Técnicos',
        required: true,
        placeholder: 'Ex: Performance, integrações, escalabilidade...'
      }
    ]
  }
];

export function RiskAssessment({ data, results, onSave, sessionId }: RiskAssessmentProps) {
  const handleFileUpload = (sectionId: string) => (
    <SmartFileUpload
      sessionId={sessionId}
      sessionType="delivery"
      stageName={`risk_${sectionId}`}
      accept="audio/*,video/*,application/pdf"
      maxFiles={2}
      className="mt-2"
    />
  );

  return (
    <SmartQuestionnaire
      title="Risk Assessment"
      description="Avalie e mitigue riscos do projeto."
      sections={RISK_SECTIONS}
      data={data}
      onSave={(data) => onSave(data, results)}
      onFileUpload={handleFileUpload}
      autoSave={true}
    />
  );
}