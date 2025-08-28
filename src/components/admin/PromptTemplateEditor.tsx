import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Edit, Save, Copy, History, Plus, Trash2, Eye } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PromptTemplate {
  id: string;
  scope_type: string;
  template_name: string;
  prompt_category: string;
  prompt_content: string;
  version_number: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const DISCOVERY_METHODOLOGIES = [
  'Business Model Canvas',
  'Inception Workshop', 
  'Product Backlog Building',
  'Sprint 0'
];

const PROMPT_CATEGORIES = [
  'discovery',
  'sla_risk',
  'team_performance',
  'cost_analysis',
  'sprint_prediction',
  'retrospective',
  '1on1'
];

export const PromptTemplateEditor: React.FC = () => {
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingContent, setEditingContent] = useState('');
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateCategory, setNewTemplateCategory] = useState('discovery');
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_prompt_templates')
        .select('*')
        .eq('scope_type', 'global')
        .order('prompt_category', { ascending: true })
        .order('template_name', { ascending: true });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Erro ao carregar templates:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os templates.",
        variant: "destructive",
      });
    }
  };

  const saveTemplate = async () => {
    if (!selectedTemplate || !editingContent.trim()) return;

    try {
      // Criar nova versão do template
      const newVersion = selectedTemplate.version_number + 1;
      
      const { data, error } = await supabase
        .from('custom_prompt_templates')
        .insert({
          scope_type: selectedTemplate.scope_type,
          template_name: selectedTemplate.template_name,
          prompt_category: selectedTemplate.prompt_category,
          prompt_content: editingContent,
          version_number: newVersion,
          parent_version_id: selectedTemplate.id,
          is_active: true,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      // Desativar versão anterior
      await supabase
        .from('custom_prompt_templates')
        .update({ is_active: false })
        .eq('id', selectedTemplate.id);

      toast({
        title: "Template salvo!",
        description: `Nova versão ${newVersion} criada com sucesso.`,
      });

      setIsEditing(false);
      setSelectedTemplate(data);
      loadTemplates();
    } catch (error) {
      console.error('Erro ao salvar template:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o template.",
        variant: "destructive",
      });
    }
  };

  const createNewTemplate = async () => {
    if (!newTemplateName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('custom_prompt_templates')
        .insert({
          scope_type: 'global',
          template_name: newTemplateName,
          prompt_category: newTemplateCategory,
          prompt_content: `Você é um especialista em ${newTemplateName}. 

Seu objetivo é gerar perguntas estruturadas para reuniões baseadas nesta metodologia.

Contexto da sessão: {session_context}
Histórico da conversa: {conversation_history}

Formato de resposta:
\`\`\`json
{
  "questions": [
    {
      "category": "categoria",
      "question": "Pergunta específica",
      "context": "Por que esta pergunta é importante"
    }
  ],
  "next_steps": "Próximos passos sugeridos",
  "meeting_format": "Como conduzir a reunião"
}
\`\`\``,
          version_number: 1,
          is_active: true,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Template criado!",
        description: `${newTemplateName} foi criado com sucesso.`,
      });

      setNewTemplateName('');
      setSelectedTemplate(data);
      loadTemplates();
    } catch (error) {
      console.error('Erro ao criar template:', error);
      toast({
        title: "Erro",
        description: "Não foi possível criar o template.",
        variant: "destructive",
      });
    }
  };

  const duplicateTemplate = async (template: PromptTemplate) => {
    try {
      const { data, error } = await supabase
        .from('custom_prompt_templates')
        .insert({
          scope_type: template.scope_type,
          template_name: `${template.template_name} (Cópia)`,
          prompt_category: template.prompt_category,
          prompt_content: template.prompt_content,
          version_number: 1,
          is_active: true,
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Template duplicado!",
        description: "Cópia criada com sucesso.",
      });

      loadTemplates();
    } catch (error) {
      console.error('Erro ao duplicar template:', error);
      toast({
        title: "Erro",
        description: "Não foi possível duplicar o template.",
        variant: "destructive",
      });
    }
  };

  const startEditing = (template: PromptTemplate) => {
    setSelectedTemplate(template);
    setEditingContent(template.prompt_content);
    setIsEditing(true);
    setPreviewMode(false);
  };

  const discardChanges = () => {
    setIsEditing(false);
    setEditingContent('');
    setPreviewMode(false);
  };

  const renderPromptPreview = (content: string) => {
    return (
      <div className="prose prose-sm max-w-none">
        <div className="whitespace-pre-wrap font-mono text-sm bg-muted p-4 rounded-lg">
          {content}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Editor de Templates de Prompts</CardTitle>
          <CardDescription>
            Gerencie e edite os prompts utilizados pela IA para diferentes metodologias
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lista de Templates */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Templates</CardTitle>
              <div className="flex gap-2">
                <Input
                  placeholder="Nome do template"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className="w-32 text-xs"
                />
                <Select value={newTemplateCategory} onValueChange={setNewTemplateCategory}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROMPT_CATEGORIES.map(category => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={createNewTemplate} disabled={!newTemplateName.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {PROMPT_CATEGORIES.map(category => {
                const categoryTemplates = templates.filter(t => t.prompt_category === category && t.is_active);
                if (categoryTemplates.length === 0) return null;

                return (
                  <div key={category}>
                    <h4 className="font-medium text-sm text-muted-foreground mb-2 capitalize">
                      {category.replace('_', ' ')}
                    </h4>
                    {categoryTemplates.map(template => (
                      <div
                        key={template.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedTemplate?.id === template.id 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => setSelectedTemplate(template)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-sm">{template.template_name}</div>
                            <div className="text-xs text-muted-foreground">
                              v{template.version_number} • {new Date(template.updated_at).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                duplicateTemplate(template);
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Editor de Template */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {selectedTemplate ? selectedTemplate.template_name : 'Selecione um template'}
                </CardTitle>
                {selectedTemplate && (
                  <CardDescription>
                    Categoria: {selectedTemplate.prompt_category} • Versão: {selectedTemplate.version_number}
                  </CardDescription>
                )}
              </div>
              {selectedTemplate && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPreviewMode(!previewMode)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    {previewMode ? 'Editor' : 'Preview'}
                  </Button>
                  {!isEditing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEditing(selectedTemplate)}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={discardChanges}
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveTemplate}
                        disabled={!editingContent.trim()}
                      >
                        <Save className="h-4 w-4 mr-2" />
                        Salvar
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            {selectedTemplate ? (
              <div className="space-y-4">
                {previewMode ? (
                  renderPromptPreview(isEditing ? editingContent : selectedTemplate.prompt_content)
                ) : isEditing ? (
                  <Textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    placeholder="Conteúdo do prompt..."
                    className="min-h-[400px] font-mono text-sm"
                  />
                ) : (
                  renderPromptPreview(selectedTemplate.prompt_content)
                )}

                <Separator />
                
                <div className="text-sm text-muted-foreground">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="font-medium">Criado em:</span> {new Date(selectedTemplate.created_at).toLocaleString('pt-BR')}
                    </div>
                    <div>
                      <span className="font-medium">Atualizado em:</span> {new Date(selectedTemplate.updated_at).toLocaleString('pt-BR')}
                    </div>
                    <div>
                      <span className="font-medium">Versão:</span> {selectedTemplate.version_number}
                    </div>
                    <div>
                      <span className="font-medium">Status:</span> 
                      <Badge variant={selectedTemplate.is_active ? 'default' : 'secondary'} className="ml-2">
                        {selectedTemplate.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Edit className="mx-auto h-12 w-12 opacity-50 mb-4" />
                <p>Selecione um template para editar</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};