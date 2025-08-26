import { SmartQuestionnaire, QuestionnaireSection } from "./SmartQuestionnaire";
import { SmartFileUpload } from "./SmartFileUpload";

interface CapacityPlanningProps {
  data?: any;
  results?: any;
  onSave: (data: any, results?: any) => void;
  sessionId: string;
}

const CAPACITY_SECTIONS: QuestionnaireSection[] = [
  {
    id: 'team_capacity',
    title: 'Capacidade da Equipe',
    description: 'Avalie a capacidade atual da equipe',
    questions: [
      {
        id: 'team_size',
        type: 'number',
        title: 'Tamanho da Equipe',
        required: true
      }
    ]
  }
];

export function CapacityPlanning({ data, results, onSave, sessionId }: CapacityPlanningProps) {
  const handleFileUpload = (sectionId: string) => (
    <SmartFileUpload
      sessionId={sessionId}
      sessionType="delivery"
      stageName={`capacity_${sectionId}`}
      accept="audio/*,video/*,application/pdf"
      maxFiles={2}
      className="mt-2"
    />
  );

  return (
    <SmartQuestionnaire
      title="Capacity Planning"
      description="Planeje a capacidade da equipe e recursos."
      sections={CAPACITY_SECTIONS}
      data={data}
      onSave={(data) => onSave(data, results)}
      onFileUpload={handleFileUpload}
      autoSave={true}
    />
  );
}