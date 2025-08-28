import * as XLSX from 'xlsx';

interface DiscoverySession {
  id: string;
  session_name: string;
  current_stage: string;
  status: string;
  business_canvas_data?: any;
  inception_data?: any;
  pbb_data?: any;
  sprint0_data?: any;
  generated_backlog?: any;
  stage_status?: any;
  finalized_at?: string;
  final_document?: any;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  extractedData?: any;
}

export class DiscoveryExporter {
  static generateExcelReport(session: DiscoverySession, messages: ChatMessage[]) {
    const workbook = XLSX.utils.book_new();

    // Aba 1: Resumo Executivo
    const summaryData = this.createSummarySheet(session);
    XLSX.utils.book_append_sheet(workbook, summaryData, 'Resumo Executivo');

    // Aba 2: Business Model Canvas
    if (session.business_canvas_data) {
      const bmcData = this.createBMCSheet(session.business_canvas_data);
      XLSX.utils.book_append_sheet(workbook, bmcData, 'Business Model Canvas');
    }

    // Aba 3: Inception Workshop
    if (session.inception_data) {
      const inceptionData = this.createInceptionSheet(session.inception_data);
      XLSX.utils.book_append_sheet(workbook, inceptionData, 'Inception Workshop');
    }

    // Aba 4: Product Backlog Building
    if (session.pbb_data) {
      const pbbData = this.createPBBSheet(session.pbb_data);
      XLSX.utils.book_append_sheet(workbook, pbbData, 'Product Backlog');
    }

    // Aba 5: Sprint 0
    if (session.sprint0_data) {
      const sprint0Data = this.createSprint0Sheet(session.sprint0_data);
      XLSX.utils.book_append_sheet(workbook, sprint0Data, 'Sprint 0');
    }

    // Aba 6: Conversa Completa
    const conversationData = this.createConversationSheet(messages);
    XLSX.utils.book_append_sheet(workbook, conversationData, 'Conversa Completa');

    // Aba 7: Backlog Gerado
    if (session.generated_backlog) {
      const backlogData = this.createBacklogSheet(session.generated_backlog);
      XLSX.utils.book_append_sheet(workbook, backlogData, 'Backlog Gerado');
    }

    return workbook;
  }

  static downloadExcel(session: DiscoverySession, messages: ChatMessage[]) {
    const workbook = this.generateExcelReport(session, messages);
    
    const fileName = `discovery-${session.session_name.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.xlsx`;
    
    XLSX.writeFile(workbook, fileName);
  }

  private static createSummarySheet(session: DiscoverySession) {
    const data = [
      ['DISCOVERY COMPLETO - RESUMO EXECUTIVO'],
      [''],
      ['Projeto:', session.session_name],
      ['Status:', session.status],
      ['Etapa Atual:', session.current_stage.replace('_', ' ').toUpperCase()],
      ['Data Geração:', new Date().toLocaleDateString('pt-BR')],
      ['Finalizado em:', session.finalized_at ? new Date(session.finalized_at).toLocaleDateString('pt-BR') : 'Em andamento'],
      [''],
      ['STATUS DAS ETAPAS:'],
      ['Business Model Canvas:', session.business_canvas_data ? '✅ Concluído' : '⏳ Pendente'],
      ['Inception Workshop:', session.inception_data ? '✅ Concluído' : '⏳ Pendente'],
      ['Product Backlog Building:', session.pbb_data ? '✅ Concluído' : '⏳ Pendente'],
      ['Sprint 0:', session.sprint0_data ? '✅ Concluído' : '⏳ Pendente'],
      [''],
      ['ANÁLISE DE COMPLETUDE:'],
      ['Total de Perguntas Geradas:', this.getTotalQuestions(session)],
      ['Épicos Identificados:', this.getEpicsCount(session)],
      ['Histórias de Usuário:', this.getUserStoriesCount(session)],
      ['Itens de Backlog:', session.generated_backlog?.length || 0],
    ];

    return XLSX.utils.aoa_to_sheet(data);
  }

  private static createBMCSheet(bmcData: any) {
    const data = [
      ['BUSINESS MODEL CANVAS'],
      [''],
      ['PERGUNTAS PARA REUNIÃO:']
    ];

    if (bmcData.questions) {
      bmcData.questions.forEach((q: any, index: number) => {
        data.push([
          `${index + 1}. [${q.category?.toUpperCase() || 'GERAL'}]`,
          q.question,
          q.context || 'N/A'
        ]);
      });
    }

    data.push([''], ['PRÓXIMOS PASSOS:'], [bmcData.next_steps || 'N/A']);
    data.push([''], ['FORMATO DA REUNIÃO:'], [bmcData.meeting_format || 'N/A']);

    return XLSX.utils.aoa_to_sheet(data);
  }

  private static createInceptionSheet(inceptionData: any) {
    const data = [
      ['INCEPTION WORKSHOP'],
      [''],
      ['PERGUNTAS PARA REUNIÃO:']
    ];

    if (inceptionData.questions) {
      inceptionData.questions.forEach((q: any, index: number) => {
        data.push([
          `${index + 1}. [${q.category?.toUpperCase() || 'GERAL'}]`,
          q.question,
          q.context || 'N/A'
        ]);
      });
    }

    if (inceptionData.personas) {
      data.push([''], ['PERSONAS IDENTIFICADAS:']);
      inceptionData.personas.forEach((persona: any, index: number) => {
        data.push([`${index + 1}. ${persona.name || persona.title}`, persona.description]);
      });
    }

    data.push([''], ['PRÓXIMOS PASSOS:'], [inceptionData.next_steps || 'N/A']);

    return XLSX.utils.aoa_to_sheet(data);
  }

  private static createPBBSheet(pbbData: any) {
    const data = [
      ['PRODUCT BACKLOG BUILDING'],
      [''],
      ['ÉPICOS E FUNCIONALIDADES:']
    ];

    if (pbbData.Epicos || pbbData.epicos) {
      const epics = pbbData.Epicos || pbbData.epicos || [];
      epics.forEach((epic: any, index: number) => {
        data.push([`ÉPICO ${index + 1}:`, epic.Nome || epic.name || epic.title]);
        
        if (epic.Features || epic.features) {
          const features = epic.Features || epic.features || [];
          features.forEach((feature: any, fIndex: number) => {
            data.push([`  Feature ${fIndex + 1}:`, feature.Nome || feature.name || feature.title]);
            
            if (feature.Historias || feature.stories) {
              const stories = feature.Historias || feature.stories || [];
              stories.forEach((story: any, sIndex: number) => {
                data.push([`    História ${sIndex + 1}:`, story.descricao || story.description || story.title]);
              });
            }
          });
        }
        data.push(['']);
      });
    }

    if (pbbData.questions) {
      data.push(['PERGUNTAS PARA REUNIÃO:']);
      pbbData.questions.forEach((q: any, index: number) => {
        data.push([
          `${index + 1}. [${q.category?.toUpperCase() || 'GERAL'}]`,
          q.question,
          q.context || 'N/A'
        ]);
      });
    }

    return XLSX.utils.aoa_to_sheet(data);
  }

  private static createSprint0Sheet(sprint0Data: any) {
    const data = [
      ['SPRINT 0 - CONFIGURAÇÃO TÉCNICA'],
      [''],
    ];

    if (sprint0Data.Epicos || sprint0Data.epicos) {
      data.push(['ÉPICOS TÉCNICOS:']);
      const epics = sprint0Data.Epicos || sprint0Data.epicos || [];
      epics.forEach((epic: any, index: number) => {
        data.push([`${index + 1}. ${epic.Nome || epic.name}:`]);
        
        if (epic.Features || epic.features) {
          const features = epic.Features || epic.features || [];
          features.forEach((feature: any, fIndex: number) => {
            data.push([`  • ${feature.Nome || feature.name}`]);
            
            if (feature.Historias || feature.stories) {
              const stories = feature.Historias || feature.stories || [];
              stories.forEach((story: any) => {
                data.push([`    - ${story.descricao || story.description || story.title}`]);
              });
            }
          });
        }
        data.push(['']);
      });
    }

    // Categorias específicas do Sprint 0
    const categories = ['Configuração do Ambiente', 'Definição de Ferramentas', 'Padrões de Código', 'Processos'];
    categories.forEach(category => {
      if (sprint0Data[category]) {
        data.push([category.toUpperCase() + ':']);
        sprint0Data[category].forEach((item: string, index: number) => {
          data.push([`${index + 1}. ${item}`]);
        });
        data.push(['']);
      }
    });

    return XLSX.utils.aoa_to_sheet(data);
  }

  private static createConversationSheet(messages: ChatMessage[]) {
    const data = [
      ['CONVERSA COMPLETA'],
      [''],
      ['Timestamp', 'Usuário', 'Mensagem']
    ];

    messages.forEach((message) => {
      data.push([
        new Date(message.timestamp).toLocaleString('pt-BR'),
        message.role === 'user' ? 'Usuário' : 'Assistente IA',
        message.content.replace(/```json[\s\S]*?```/g, '[Dados estruturados removidos para legibilidade]')
      ]);
    });

    return XLSX.utils.aoa_to_sheet(data);
  }

  private static createBacklogSheet(backlog: any[]) {
    const data = [
      ['BACKLOG GERADO'],
      [''],
      ['Prioridade', 'Título', 'Descrição', 'Épico', 'Estimativa']
    ];

    backlog.forEach((item, index) => {
      data.push([
        index + 1,
        item.title || item.nome || 'Item sem título',
        item.description || item.descricao || 'Sem descrição',
        item.epic || item.epico || 'Não definido',
        item.estimation || item.estimativa || 'Não estimado'
      ]);
    });

    return XLSX.utils.aoa_to_sheet(data);
  }

  private static getTotalQuestions(session: DiscoverySession): number {
    let total = 0;
    
    [session.business_canvas_data, session.inception_data, session.pbb_data, session.sprint0_data]
      .forEach(data => {
        if (data?.questions) {
          total += Array.isArray(data.questions) ? data.questions.length : 0;
        }
      });
    
    return total;
  }

  private static getEpicsCount(session: DiscoverySession): number {
    let total = 0;
    
    [session.pbb_data, session.sprint0_data].forEach(data => {
      if (data?.Epicos || data?.epicos) {
        const epics = data.Epicos || data.epicos || [];
        total += Array.isArray(epics) ? epics.length : 0;
      }
    });
    
    return total;
  }

  private static getUserStoriesCount(session: DiscoverySession): number {
    let total = 0;
    
    [session.pbb_data, session.sprint0_data].forEach(data => {
      const epics = data?.Epicos || data?.epicos || [];
      if (Array.isArray(epics)) {
        epics.forEach((epic: any) => {
          const features = epic.Features || epic.features || [];
          if (Array.isArray(features)) {
            features.forEach((feature: any) => {
              const stories = feature.Historias || feature.stories || [];
              if (Array.isArray(stories)) {
                total += stories.length;
              }
            });
          }
        });
      }
    });
    
    return total;
  }
}