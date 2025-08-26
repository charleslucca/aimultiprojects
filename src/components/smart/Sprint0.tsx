import { SmartQuestionnaire, QuestionnaireSection } from "./SmartQuestionnaire";
import { SmartFileUpload } from "./SmartFileUpload";

interface Sprint0Props {
  data?: any;
  onSave: (data: any) => void;
  sessionId: string;
}

const SPRINT0_SECTIONS: QuestionnaireSection[] = [
  {
    id: 'backlog_refinement',
    title: 'Refinamento do Backlog',
    description: 'Refine e estime as user stories para a primeira sprint',
    questions: [
      {
        id: 'story_estimation',
        type: 'textarea',
        title: 'Estimativas das User Stories',
        description: 'Estime complexidade usando story points ou horas',
        required: true,
        placeholder: 'Ex: Login Google (3 pontos), Criar projeto (5 pontos), Dashboard básico (8 pontos)...'
      },
      {
        id: 'sprint_capacity',
        type: 'number',
        title: 'Capacidade da Sprint (Story Points)',
        description: 'Quantos story points a equipe consegue entregar',
        required: true,
        placeholder: '20'
      }
    ]
  }
];

export function Sprint0({ data, onSave, sessionId }: Sprint0Props) {
  const handleFileUpload = (sectionId: string) => (
    <SmartFileUpload
      sessionId={sessionId}
      sessionType="discovery"
      stageName={`sprint0_${sectionId}`}
      accept="audio/*,video/*,image/*,.pdf,.doc,.docx,.txt"
      maxFiles={3}
      className="mt-2"
    />
  );

  return (
    <SmartQuestionnaire
      title="Sprint 0"
      description="Prepare e estime o backlog para iniciar o desenvolvimento."
      sections={SPRINT0_SECTIONS}
      data={data}
      onSave={onSave}
      onFileUpload={handleFileUpload}
      autoSave={true}
    />
  );
}