import { SmartQuestionnaire, QuestionnaireSection } from "./SmartQuestionnaire";
import { SmartFileUpload } from "./SmartFileUpload";

interface ProductBacklogBuildingProps {
  data?: any;
  onSave: (data: any) => void;
  sessionId: string;
}

const PBB_SECTIONS: QuestionnaireSection[] = [
  {
    id: 'personas_deep_dive',
    title: 'Personas - Aprofundamento',
    description: 'Refine e detalhe as personas identificadas na Inception',
    questions: [
      {
        id: 'persona_1_profile',
        type: 'textarea',
        title: 'Persona 1 - Perfil Completo',
        description: 'Nome, idade, cargo, empresa, contexto de trabalho, ferramentas que usa',
        required: true,
        placeholder: 'Ex: Maria Silva, 32 anos, Product Manager na TechCorp (500 funcionários), trabalha remoto, usa Jira/Slack/Figma...'
      },
      {
        id: 'persona_1_frustrations',
        type: 'textarea',
        title: 'Persona 1 - Frustrações e Pain Points',
        description: 'Principais dores no trabalho relacionadas ao seu produto',
        required: true,
        placeholder: 'Ex: Perde muito tempo em reuniões de status, dificulta visibilidade do progresso, ferramentas desintegradas...'
      },
      {
        id: 'persona_1_goals',
        type: 'textarea',
        title: 'Persona 1 - Objetivos e Motivações',
        description: 'O que ela quer alcançar profissionalmente',
        required: true,
        placeholder: 'Ex: Entregar projetos no prazo, ter transparência com stakeholders, reduzir overhead de gestão...'
      },
      {
        id: 'persona_2_profile',
        type: 'textarea',
        title: 'Persona 2 - Perfil Completo',
        description: 'Segunda persona mais importante',
        placeholder: 'Ex: João Santos, 28 anos, Senior Developer, prefere ferramentas técnicas, valoriza autonomia...'
      },
      {
        id: 'persona_2_frustrations',
        type: 'textarea',
        title: 'Persona 2 - Frustrações e Pain Points',
        description: 'Dores específicas desta persona',
        placeholder: 'Ex: Muitas interrupções, contexto perdido entre ferramentas, estimativas impostas de cima...'
      },
      {
        id: 'persona_2_goals',
        type: 'textarea',
        title: 'Persona 2 - Objetivos e Motivações',
        description: 'Objetivos profissionais desta persona',
        placeholder: 'Ex: Escrever código de qualidade, ter autonomia técnica, crescer na carreira...'
      }
    ]
  },
  {
    id: 'user_stories_core',
    title: 'User Stories - Funcionalidades Core',
    description: 'Escreva user stories para as funcionalidades essenciais',
    questions: [
      {
        id: 'authentication_stories',
        type: 'textarea',
        title: 'Stories - Autenticação e Onboarding',
        description: 'Como usuários fazem login, se cadastram e fazem onboarding',
        required: true,
        placeholder: 'Ex: Como usuário, quero fazer login com Google para acessar rapidamente...\nComo novo usuário, quero um tour guiado para aprender a usar...'
      },
      {
        id: 'project_management_stories',
        type: 'textarea',
        title: 'Stories - Gestão de Projetos',
        description: 'Criação, configuração e gestão de projetos',
        required: true,
        placeholder: 'Ex: Como PM, quero criar um novo projeto para organizar o trabalho da equipe...\nComo PM, quero convidar membros para ter a equipe completa...'
      },
      {
        id: 'task_management_stories',
        type: 'textarea',
        title: 'Stories - Gestão de Tarefas',
        description: 'Criação, atribuição e acompanhamento de tarefas',
        required: true,
        placeholder: 'Ex: Como PM, quero criar tarefas com descrições claras para organizar o trabalho...\nComo dev, quero atualizar status para comunicar progresso...'
      },
      {
        id: 'collaboration_stories',
        type: 'textarea',
        title: 'Stories - Colaboração e Comunicação',
        description: 'Como equipes colaboram e se comunicam',
        required: true,
        placeholder: 'Ex: Como membro da equipe, quero comentar em tarefas para tirar dúvidas...\nComo PM, quero receber notificações para ficar sempre informado...'
      },
      {
        id: 'reporting_stories',
        type: 'textarea',
        title: 'Stories - Dashboards e Relatórios',
        description: 'Visibilidade e acompanhamento do progresso',
        required: true,
        placeholder: 'Ex: Como PM, quero ver dashboard do projeto para acompanhar o progresso...\nComo stakeholder, quero relatórios semanais para apresentar status...'
      }
    ]
  },
  {
    id: 'user_stories_advanced',
    title: 'User Stories - Funcionalidades Avançadas',
    description: 'Stories para funcionalidades mais sofisticadas',
    questions: [
      {
        id: 'integrations_stories',
        type: 'textarea',
        title: 'Stories - Integrações',
        description: 'Conexões com ferramentas externas',
        placeholder: 'Ex: Como usuário, quero conectar com Slack para receber notificações...\nComo dev, quero integração com GitHub para sincronizar commits...'
      },
      {
        id: 'automation_stories',
        type: 'textarea',
        title: 'Stories - Automações',
        description: 'Automatizações que economizam tempo',
        placeholder: 'Ex: Como PM, quero automação de status para reduzir trabalho manual...\nComo usuário, quero templates de projeto para começar rapidamente...'
      },
      {
        id: 'analytics_stories',
        type: 'textarea',
        title: 'Stories - Analytics e Insights',
        description: 'Métricas e análises avançadas',
        placeholder: 'Ex: Como PM, quero métricas de velocity para melhorar estimativas...\nComo gestor, quero análise de burnout para cuidar da equipe...'
      },
      {
        id: 'mobile_stories',
        type: 'textarea',
        title: 'Stories - Mobile e Mobilidade',
        description: 'Experiência móvel e uso em movimento',
        placeholder: 'Ex: Como usuário móvel, quero ver notificações para ficar sempre conectado...\nComo PM, quero aprovar tarefas no celular para ser mais ágil...'
      }
    ]
  },
  {
    id: 'acceptance_criteria',
    title: 'Critérios de Aceitação',
    description: 'Defina critérios claros para validar as funcionalidades',
    questions: [
      {
        id: 'login_acceptance_criteria',
        type: 'textarea',
        title: 'Critérios - Login e Autenticação',
        description: 'Quando considerar login/auth como "pronto"',
        required: true,
        placeholder: 'Ex: Dado que tenho conta Google, Quando clico em "Login com Google", Então acesso minha workspace em < 3 segundos...'
      },
      {
        id: 'project_creation_criteria',
        type: 'textarea',
        title: 'Critérios - Criação de Projetos',
        description: 'Quando considerar criação de projeto como "pronta"',
        required: true,
        placeholder: 'Ex: Dado que sou PM logado, Quando crio projeto com nome válido, Então projeto aparece na lista e posso convidar membros...'
      },
      {
        id: 'task_management_criteria',
        type: 'textarea',
        title: 'Critérios - Gestão de Tarefas',
        description: 'Validação para funcionalidades de tarefas',
        required: true,
        placeholder: 'Ex: Dado que tenho tarefa atribuída, Quando atualizo status, Então PM recebe notificação em < 1 minuto...'
      },
      {
        id: 'performance_criteria',
        type: 'textarea',
        title: 'Critérios - Performance e UX',
        description: 'Padrões de performance e usabilidade',
        required: true,
        placeholder: 'Ex: Páginas carregam em < 2s, Mobile responsivo em dispositivos iOS/Android, Suporte a 1000 usuários simultâneos...'
      }
    ]
  },
  {
    id: 'epic_prioritization',
    title: 'Épicos e Priorização',
    description: 'Organize stories em épicos e defina prioridades',
    questions: [
      {
        id: 'epic_1_core',
        type: 'textarea',
        title: 'Épico 1: Core do Produto (Alta Prioridade)',
        description: 'Funcionalidades essenciais para MVP',
        required: true,
        placeholder: 'Ex: Auth + Onboarding, Criação de Projetos, Gestão Básica de Tarefas, Dashboard Simples...'
      },
      {
        id: 'epic_2_collaboration',
        type: 'textarea',
        title: 'Épico 2: Colaboração (Média Prioridade)',
        description: 'Funcionalidades de trabalho em equipe',
        required: true,
        placeholder: 'Ex: Comentários, Notificações, Convites, Permissões Básicas...'
      },
      {
        id: 'epic_3_advanced',
        type: 'textarea',
        title: 'Épico 3: Features Avançadas (Baixa Prioridade)',
        description: 'Funcionalidades sofisticadas para versões futuras',
        placeholder: 'Ex: Integrações, Automações, Analytics Avançados, Mobile App...'
      },
      {
        id: 'prioritization_criteria',
        type: 'textarea',
        title: 'Critérios de Priorização',
        description: 'Como você decide o que fazer primeiro',
        required: true,
        placeholder: 'Ex: Valor para usuário (1-5), Esforço técnico (1-5), Dependências, Feedback de clientes, Objetivos de negócio...'
      },
      {
        id: 'mvp_scope',
        type: 'textarea',
        title: 'Escopo do MVP',
        description: 'O que exatamente vai entrar no Mínimo Produto Viável',
        required: true,
        placeholder: 'Ex: Login Google, Criar 1 projeto, Criar/editar tarefas, Atribuir membros, Status básicos, Dashboard simples...'
      }
    ]
  },
  {
    id: 'technical_stories',
    title: 'Technical Stories e NFRs',
    description: 'Requisitos técnicos e não-funcionais',
    questions: [
      {
        id: 'architecture_stories',
        type: 'textarea',
        title: 'Technical Stories - Arquitetura',
        description: 'Stories técnicas para infraestrutura e arquitetura',
        required: true,
        placeholder: 'Ex: Como dev, preciso configurar CI/CD para deploy automático...\nComo sistema, preciso de banco escalável para suportar crescimento...'
      },
      {
        id: 'security_stories',
        type: 'textarea',
        title: 'Technical Stories - Segurança',
        description: 'Stories relacionadas à segurança e compliance',
        required: true,
        placeholder: 'Ex: Como sistema, preciso de autenticação OAuth2 para segurança...\nComo empresa, preciso LGPD compliance para operar no Brasil...'
      },
      {
        id: 'performance_stories',
        type: 'textarea',
        title: 'Technical Stories - Performance',
        description: 'Stories para performance e escalabilidade',
        required: true,
        placeholder: 'Ex: Como usuário, quero que páginas carreguem em < 2s...\nComo sistema, preciso suportar 10k usuários simultâneos...'
      },
      {
        id: 'monitoring_stories',
        type: 'textarea',
        title: 'Technical Stories - Monitoramento',
        description: 'Stories para observabilidade e debugging',
        placeholder: 'Ex: Como dev, preciso de logs estruturados para debugar problemas...\nComo ops, preciso métricas de saúde para monitorar sistema...'
      }
    ]
  }
];

export function ProductBacklogBuilding({ data, onSave, sessionId }: ProductBacklogBuildingProps) {
  const handleFileUpload = (sectionId: string) => (
    <SmartFileUpload
      sessionId={sessionId}
      sessionType="discovery"
      stageName={`pbb_${sectionId}`}
      accept="audio/*,video/*,image/*,.pdf,.doc,.docx,.txt"
      maxFiles={3}
      className="mt-2"
    />
  );

  return (
    <SmartQuestionnaire
      title="Product Backlog Building (PBB)"
      description="Construa um backlog estruturado conectando personas a user stories e critérios de aceitação."
      sections={PBB_SECTIONS}
      data={data}
      onSave={onSave}
      onFileUpload={handleFileUpload}
      autoSave={true}
    />
  );
}