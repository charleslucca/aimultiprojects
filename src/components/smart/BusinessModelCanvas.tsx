import { SmartQuestionnaire, QuestionnaireSection } from "./SmartQuestionnaire";
import { SmartFileUpload } from "./SmartFileUpload";

interface BusinessModelCanvasProps {
  data?: any;
  onSave: (data: any) => void;
  sessionId: string;
}

const BUSINESS_CANVAS_SECTIONS: QuestionnaireSection[] = [
  {
    id: 'value_proposition',
    title: 'Proposta de Valor',
    description: 'Defina o valor único que sua solução oferece ao mercado',
    questions: [
      {
        id: 'core_value',
        type: 'textarea',
        title: 'Qual é o valor central da sua solução?',
        description: 'Descreva em poucas palavras o principal benefício que você oferece',
        required: true,
        placeholder: 'Ex: Reduzir em 50% o tempo de gestão de projetos através de automação inteligente...'
      },
      {
        id: 'problems_solved',
        type: 'textarea',
        title: 'Que problemas específicos você resolve?',
        description: 'Liste os principais pain points dos seus clientes',
        required: true,
        placeholder: 'Ex: Falta de visibilidade em projetos, estimativas imprecisas, comunicação fragmentada...'
      },
      {
        id: 'differentiators',
        type: 'textarea',
        title: 'O que te diferencia da concorrência?',
        description: 'Seus diferenciais competitivos únicos',
        required: true,
        placeholder: 'Ex: IA integrada, interface intuitiva, métricas preditivas...'
      }
    ]
  },
  {
    id: 'customer_segments',
    title: 'Segmentos de Clientes',
    description: 'Identifique e caracterize seus clientes-alvo',
    questions: [
      {
        id: 'primary_segment',
        type: 'textarea',
        title: 'Qual é seu segmento principal de clientes?',
        description: 'Descreva detalhadamente seu público-alvo primário',
        required: true,
        placeholder: 'Ex: Empresas de tecnologia de 50-500 funcionários que desenvolvem software...'
      },
      {
        id: 'secondary_segments',
        type: 'textarea',
        title: 'Existem segmentos secundários importantes?',
        description: 'Outros grupos de clientes relevantes',
        placeholder: 'Ex: Consultorias de gestão, agências digitais, startups em crescimento...'
      },
      {
        id: 'customer_personas',
        type: 'textarea',
        title: 'Descreva as personas principais',
        description: 'Perfis dos decisores e usuários finais',
        required: true,
        placeholder: 'Ex: CTOs, Gerentes de Projetos, Scrum Masters, Product Owners...'
      }
    ]
  },
  {
    id: 'channels',
    title: 'Canais de Distribuição',
    description: 'Como você alcança e entrega valor aos clientes',
    questions: [
      {
        id: 'awareness_channels',
        type: 'checkbox',
        title: 'Como os clientes descobrem sua solução?',
        description: 'Canais de awareness e marketing',
        options: [
          'Marketing Digital (SEO, Google Ads)',
          'Redes Sociais (LinkedIn, Twitter)',
          'Content Marketing (Blog, Webinars)',
          'Eventos e Conferências',
          'Parcerias e Indicações',
          'Vendas Diretas',
          'Marketplaces (AppStore, etc.)'
        ],
        required: true
      },
      {
        id: 'sales_channels',
        type: 'checkbox',
        title: 'Como você vende sua solução?',
        description: 'Canais de vendas e conversão',
        options: [
          'Vendas Online (Self-service)',
          'Inside Sales',
          'Field Sales',
          'Parcerias de Canal',
          'Revendedores',
          'Marketplace B2B',
          'Freemium/Trial'
        ],
        required: true
      },
      {
        id: 'delivery_channels',
        type: 'radio',
        title: 'Como você entrega sua solução?',
        description: 'Modelo de entrega principal',
        options: [
          'SaaS (Software as a Service)',
          'On-premise',
          'Híbrido (Cloud + On-premise)',
          'Consultoria/Serviços',
          'Produto Físico'
        ],
        required: true
      }
    ]
  },
  {
    id: 'customer_relationships',
    title: 'Relacionamento com Clientes',
    description: 'Como você se relaciona e mantém seus clientes',
    questions: [
      {
        id: 'acquisition_strategy',
        type: 'textarea',
        title: 'Como você adquire novos clientes?',
        description: 'Estratégias de aquisição e onboarding',
        required: true,
        placeholder: 'Ex: Trial gratuito de 30 dias, demos personalizadas, POCs...'
      },
      {
        id: 'retention_strategy',
        type: 'textarea',
        title: 'Como você retém e expande clientes?',
        description: 'Estratégias de retenção e growth',
        required: true,
        placeholder: 'Ex: Customer Success, treinamentos, feature rollouts...'
      },
      {
        id: 'support_model',
        type: 'radio',
        title: 'Qual seu modelo de suporte?',
        description: 'Como você oferece suporte aos clientes',
        options: [
          'Self-service (Documentação, FAQ)',
          'Chat/Email Support',
          'Phone Support',
          'Dedicated Account Manager',
          'Premium Support (SLA garantido)'
        ],
        required: true
      }
    ]
  },
  {
    id: 'revenue_streams',
    title: 'Fontes de Receita',
    description: 'Como você monetiza sua proposta de valor',
    questions: [
      {
        id: 'pricing_model',
        type: 'radio',
        title: 'Qual seu modelo de precificação principal?',
        description: 'Como você cobra pelos seus serviços',
        options: [
          'Assinatura Mensal/Anual',
          'Por Usuário (Per Seat)',
          'Por Uso/Volume',
          'Freemium + Upgrades',
          'Licenciamento',
          'Projeto/Consultoria',
          'Revenue Share'
        ],
        required: true
      },
      {
        id: 'revenue_tiers',
        type: 'textarea',
        title: 'Descreva seus tiers de preço',
        description: 'Planos e precificação estruturada',
        required: true,
        placeholder: 'Ex: Básico ($29/mês), Pro ($99/mês), Enterprise (custom)...'
      },
      {
        id: 'additional_revenues',
        type: 'checkbox',
        title: 'Outras fontes de receita?',
        description: 'Receitas complementares ou adicionais',
        options: [
          'Treinamentos e Certificações',
          'Consultoria Especializada',
          'Implementação/Setup',
          'Integrações Customizadas',
          'Premium Support',
          'Marketplace/Comissões',
          'Data/Analytics Premium'
        ]
      }
    ]
  },
  {
    id: 'key_resources',
    title: 'Recursos-Chave',
    description: 'Os recursos mais importantes para seu modelo funcionar',
    questions: [
      {
        id: 'technology_resources',
        type: 'checkbox',
        title: 'Recursos tecnológicos essenciais',
        description: 'Tecnologias e plataformas críticas',
        options: [
          'Plataforma de Desenvolvimento',
          'Infraestrutura Cloud',
          'Banco de Dados',
          'APIs e Integrações',
          'IA/Machine Learning',
          'Ferramentas de Analytics',
          'Sistemas de Segurança'
        ],
        required: true
      },
      {
        id: 'human_resources',
        type: 'checkbox',
        title: 'Recursos humanos críticos',
        description: 'Talentos e expertises essenciais',
        options: [
          'Desenvolvedores/Engenheiros',
          'Product Managers',
          'Designers UX/UI',
          'Data Scientists',
          'Customer Success',
          'Vendas/Business Development',
          'Marketing Digital'
        ],
        required: true
      },
      {
        id: 'intellectual_property',
        type: 'textarea',
        title: 'Propriedade intelectual e ativos únicos',
        description: 'Patents, algoritmos, dados proprietários, marca, etc.',
        placeholder: 'Ex: Algoritmos de IA proprietários, base de dados histórica, marca reconhecida...'
      }
    ]
  },
  {
    id: 'key_activities',
    title: 'Atividades-Chave',
    description: 'As atividades mais importantes para entregar sua proposta de valor',
    questions: [
      {
        id: 'core_activities',
        type: 'checkbox',
        title: 'Atividades operacionais principais',
        description: 'O que você faz no dia a dia para entregar valor',
        options: [
          'Desenvolvimento de Software',
          'Pesquisa e Desenvolvimento',
          'Vendas e Marketing',
          'Customer Success/Support',
          'Análise de Dados/BI',
          'Gestão de Parcerias',
          'Operações e Infraestrutura'
        ],
        required: true
      },
      {
        id: 'innovation_activities',
        type: 'textarea',
        title: 'Como você inova e se mantém competitivo?',
        description: 'Atividades de inovação e melhoria contínua',
        required: true,
        placeholder: 'Ex: Sprints de desenvolvimento, pesquisa de mercado, A/B testing...'
      },
      {
        id: 'quality_assurance',
        type: 'textarea',
        title: 'Como você garante qualidade e confiabilidade?',
        description: 'Processos de QA, testes, monitoramento',
        placeholder: 'Ex: Testes automatizados, CI/CD, monitoramento 24/7, SLA tracking...'
      }
    ]
  },
  {
    id: 'key_partnerships',
    title: 'Parcerias-Chave',
    description: 'Parceiros estratégicos para seu sucesso',
    questions: [
      {
        id: 'technology_partners',
        type: 'textarea',
        title: 'Parcerias tecnológicas importantes',
        description: 'Integrações, APIs, fornecedores de tecnologia',
        placeholder: 'Ex: AWS/Azure, Salesforce, Microsoft, Google, Slack...'
      },
      {
        id: 'business_partners',
        type: 'textarea',
        title: 'Parcerias de negócio e distribuição',
        description: 'Canais, revendedores, integradores',
        placeholder: 'Ex: Consultorias, system integrators, revendedores regionais...'
      },
      {
        id: 'strategic_alliances',
        type: 'textarea',
        title: 'Alianças estratégicas',
        description: 'Parcerias de longo prazo, joint ventures, etc.',
        placeholder: 'Ex: Parceria com universidades, alianças com concorrentes complementares...'
      }
    ]
  },
  {
    id: 'cost_structure',
    title: 'Estrutura de Custos',
    description: 'Os principais custos para operar seu modelo de negócio',
    questions: [
      {
        id: 'cost_drivers',
        type: 'checkbox',
        title: 'Principais direcionadores de custo',
        description: 'Onde você gasta mais recursos',
        options: [
          'Pessoal (Salários e Benefícios)',
          'Infraestrutura e Tecnologia',
          'Marketing e Vendas',
          'P&D e Inovação',
          'Customer Success',
          'Parcerias e Licenças',
          'Operações e Administrativo'
        ],
        required: true
      },
      {
        id: 'cost_optimization',
        type: 'textarea',
        title: 'Como você otimiza custos?',
        description: 'Estratégias para manter eficiência operacional',
        placeholder: 'Ex: Automação, outsourcing, cloud scaling, processos lean...'
      },
      {
        id: 'investment_priorities',
        type: 'textarea',
        title: 'Onde você investe para crescer?',
        description: 'Prioridades de investimento para scaling',
        required: true,
        placeholder: 'Ex: Contratação de devs, marketing digital, expansão internacional...'
      }
    ]
  }
];

export function BusinessModelCanvas({ data, onSave, sessionId }: BusinessModelCanvasProps) {
  const handleFileUpload = (sectionId: string) => (
    <SmartFileUpload
      sessionId={sessionId}
      sessionType="discovery"
      stageName={`business_canvas_${sectionId}`}
      accept="audio/*,video/*,image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
      maxFiles={3}
      className="mt-2"
    />
  );

  return (
    <SmartQuestionnaire
      title="Business Model Canvas"
      description="Mapeie seu modelo de negócio de forma estruturada para entender como criar, entregar e capturar valor."
      sections={BUSINESS_CANVAS_SECTIONS}
      data={data}
      onSave={onSave}
      onFileUpload={handleFileUpload}
      autoSave={true}
    />
  );
}