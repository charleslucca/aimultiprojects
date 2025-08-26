import { SmartQuestionnaire, QuestionnaireSection } from "./SmartQuestionnaire";
import { SmartFileUpload } from "./SmartFileUpload";

interface InceptionWorkshopProps {
  data?: any;
  onSave: (data: any) => void;
  sessionId: string;
}

const INCEPTION_SECTIONS: QuestionnaireSection[] = [
  {
    id: 'vision_alignment',
    title: 'Alinhamento de Visão',
    description: 'Defina uma visão clara e compartilhada do produto',
    questions: [
      {
        id: 'product_vision',
        type: 'textarea',
        title: 'Qual é a visão do produto?',
        description: 'Uma declaração inspiradora do futuro que o produto irá criar',
        required: true,
        placeholder: 'Ex: Ser a plataforma de gestão de projetos mais intuitiva do mercado, permitindo que equipes entreguem 50% mais rápido...'
      },
      {
        id: 'success_criteria',
        type: 'textarea',
        title: 'Como saberemos que tivemos sucesso?',
        description: 'Critérios mensuráveis de sucesso em 6-12 meses',
        required: true,
        placeholder: 'Ex: 10.000 usuários ativos, NPS > 50, churn < 5%, $1M ARR...'
      },
      {
        id: 'mission_statement',
        type: 'textarea',
        title: 'Qual é a missão do produto?',
        description: 'O propósito fundamental e razão de existir',
        required: true,
        placeholder: 'Ex: Democratizar o acesso a ferramentas de gestão inteligente para equipes de todos os tamanhos...'
      }
    ]
  },
  {
    id: 'objectives_goals',
    title: 'Objetivos e Metas',
    description: 'Estabeleça objetivos específicos e mensuráveis',
    questions: [
      {
        id: 'business_objectives',
        type: 'textarea',
        title: 'Quais são os objetivos de negócio?',
        description: 'Objetivos estratégicos que o produto deve atingir',
        required: true,
        placeholder: 'Ex: Aumentar receita em 200%, reduzir CAC em 30%, expandir para novos mercados...'
      },
      {
        id: 'user_objectives',
        type: 'textarea',
        title: 'Quais são os objetivos dos usuários?',
        description: 'O que os usuários querem alcançar usando o produto',
        required: true,
        placeholder: 'Ex: Reduzir tempo em reuniões, ter visibilidade total dos projetos, melhorar colaboração...'
      },
      {
        id: 'okrs_kpis',
        type: 'textarea',
        title: 'Quais são os OKRs/KPIs principais?',
        description: 'Métricas específicas para acompanhar o progresso',
        required: true,
        placeholder: 'Ex: MAU crescer 20%/mês, Retention D30 > 40%, Time to Value < 24h...'
      },
      {
        id: 'timeline_milestones',
        type: 'textarea',
        title: 'Principais marcos e cronograma',
        description: 'Timeline com entregas importantes',
        required: true,
        placeholder: 'Ex: MVP em 3 meses, Beta em 6 meses, Launch em 9 meses...'
      }
    ]
  },
  {
    id: 'personas_users',
    title: 'Personas e Usuários',
    description: 'Defina quem são seus usuários e suas necessidades',
    questions: [
      {
        id: 'primary_persona',
        type: 'textarea',
        title: 'Persona Principal - Quem é?',
        description: 'Descrição detalhada da persona mais importante',
        required: true,
        placeholder: 'Ex: Maria, 35 anos, Gerente de Projetos, trabalha em startup tech, usa Slack/Jira, frustrada com ferramentas complexas...'
      },
      {
        id: 'primary_persona_needs',
        type: 'textarea',
        title: 'Persona Principal - Necessidades e Dores',
        description: 'Pain points, jobs-to-be-done, contexto de uso',
        required: true,
        placeholder: 'Ex: Precisa de visibilidade em tempo real, quer reduzir overhead de gestão, sofre com ferramentas desconectadas...'
      },
      {
        id: 'secondary_personas',
        type: 'textarea',
        title: 'Personas Secundárias',
        description: 'Outros usuários importantes do produto',
        placeholder: 'Ex: João (Desenvolvedor), Ana (Product Owner), Carlos (CTO)...'
      },
      {
        id: 'user_journey',
        type: 'textarea',
        title: 'Jornada do Usuário Principal',
        description: 'Como a persona principal descobre, experimenta e adota o produto',
        required: true,
        placeholder: 'Ex: 1) Procura solução no Google, 2) Testa trial gratuito, 3) Configura primeira workspace, 4) Convida equipe...'
      },
      {
        id: 'user_scenarios',
        type: 'textarea',
        title: 'Cenários de Uso Críticos',
        description: 'Situações específicas onde o produto é essencial',
        required: true,
        placeholder: 'Ex: Planning de sprint, Daily standup, Review de projetos, Onboarding de novos membros...'
      }
    ]
  },
  {
    id: 'features_scope',
    title: 'Features e Escopo',
    description: 'Defina o que será construído e o que está fora do escopo',
    questions: [
      {
        id: 'core_features',
        type: 'textarea',
        title: 'Features Essenciais (Must Have)',
        description: 'Funcionalidades críticas para o produto funcionar',
        required: true,
        placeholder: 'Ex: Criação de projetos, Gestão de tarefas, Dashboard de status, Notificações, Login/Auth...'
      },
      {
        id: 'nice_to_have_features',
        type: 'textarea',
        title: 'Features Desejáveis (Nice to Have)',
        description: 'Funcionalidades importantes mas não críticas para V1',
        placeholder: 'Ex: Integrações avançadas, Relatórios customizados, Mobile app, API pública...'
      },
      {
        id: 'future_features',
        type: 'textarea',
        title: 'Features Futuras (Roadmap)',
        description: 'Funcionalidades para versões posteriores',
        placeholder: 'Ex: IA preditiva, Automações avançadas, Multi-tenant, Marketplace de plugins...'
      },
      {
        id: 'out_of_scope',
        type: 'textarea',
        title: 'O que NÃO será feito',
        description: 'Claramente defina o que está fora do escopo',
        required: true,
        placeholder: 'Ex: CRM completo, Contabilidade/Financeiro, HR/RH, E-commerce, Sistema de pagamentos...'
      },
      {
        id: 'technical_requirements',
        type: 'textarea',
        title: 'Requisitos Técnicos Importantes',
        description: 'Constraints e requisitos não-funcionais',
        placeholder: 'Ex: Suporte a 10k usuários simultâneos, 99.9% uptime, GDPR compliance, Mobile responsive...'
      }
    ]
  },
  {
    id: 'risks_assumptions',
    title: 'Riscos e Premissas',
    description: 'Identifique riscos principais e valide premissas críticas',
    questions: [
      {
        id: 'business_risks',
        type: 'textarea',
        title: 'Principais Riscos de Negócio',
        description: 'Riscos que podem impactar o sucesso do produto',
        required: true,
        placeholder: 'Ex: Concorrentes grandes entrarem no mercado, mudança regulatória, recessão econômica...'
      },
      {
        id: 'technical_risks',
        type: 'textarea',
        title: 'Principais Riscos Técnicos',
        description: 'Riscos relacionados à implementação e tecnologia',
        required: true,
        placeholder: 'Ex: Escalabilidade da arquitetura, Integração com APIs externas, Performance em mobile...'
      },
      {
        id: 'market_assumptions',
        type: 'textarea',
        title: 'Premissas sobre o Mercado',
        description: 'Suposições que precisam ser validadas sobre mercado/usuários',
        required: true,
        placeholder: 'Ex: Usuários vão pagar $50/mês, Mercado vai crescer 20%/ano, Competitor X não vai baixar preços...'
      },
      {
        id: 'product_assumptions',
        type: 'textarea',
        title: 'Premissas sobre o Produto',
        description: 'Suposições sobre comportamento e adoção do produto',
        required: true,
        placeholder: 'Ex: Onboarding em < 5 min, Usuários vão usar mobile, Feature X vai ser mais importante...'
      },
      {
        id: 'validation_plan',
        type: 'textarea',
        title: 'Como validar as premissas?',
        description: 'Plano para testar e validar as principais suposições',
        required: true,
        placeholder: 'Ex: Entrevistas com 50 usuários, A/B test de pricing, MVPs de features críticas, Landing page test...'
      }
    ]
  },
  {
    id: 'constraints_dependencies',
    title: 'Restrições e Dependências',
    description: 'Identifique limitações e dependências externas',
    questions: [
      {
        id: 'budget_constraints',
        type: 'textarea',
        title: 'Restrições de Orçamento e Recursos',
        description: 'Limitações financeiras e de equipe',
        required: true,
        placeholder: 'Ex: Orçamento máximo $500k, equipe de 5 devs, prazo de 6 meses...'
      },
      {
        id: 'technical_constraints',
        type: 'textarea',
        title: 'Restrições Técnicas',
        description: 'Limitações de tecnologia, infraestrutura ou compliance',
        placeholder: 'Ex: Deve usar stack atual (.NET), Hosted no Azure, LGPD compliance obrigatório...'
      },
      {
        id: 'external_dependencies',
        type: 'textarea',
        title: 'Dependências Externas',
        description: 'Fatores externos que podem impactar o projeto',
        required: true,
        placeholder: 'Ex: APIs de terceiros, aprovações regulatórias, decisões de outros produtos...'
      },
      {
        id: 'stakeholder_constraints',
        type: 'textarea',
        title: 'Restrições de Stakeholders',
        description: 'Limitações impostas por stakeholders e decisores',
        placeholder: 'Ex: Diretor quer launch antes do Q4, Legal exige auditoria de segurança...'
      }
    ]
  }
];

export function InceptionWorkshop({ data, onSave, sessionId }: InceptionWorkshopProps) {
  const handleFileUpload = (sectionId: string) => (
    <SmartFileUpload
      sessionId={sessionId}
      sessionType="discovery"
      stageName={`inception_${sectionId}`}
      accept="audio/*,video/*,image/*,.pdf,.doc,.docx,.txt"
      maxFiles={3}
      className="mt-2"
    />
  );

  return (
    <SmartQuestionnaire
      title="Inception Workshop"
      description="Alinhe visão, objetivos e escopo do produto com todos os stakeholders de forma estruturada."
      sections={INCEPTION_SECTIONS}
      data={data}
      onSave={onSave}
      onFileUpload={handleFileUpload}
      autoSave={true}
    />
  );
}