import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Save, 
  RotateCcw, 
  Brain, 
  AlertTriangle, 
  Users, 
  DollarSign, 
  Target,
  Loader2
} from 'lucide-react';

interface PromptTemplateManagerProps {
  projectId: string;
}

interface PromptTemplates {
  sla_risk: string;
  team_performance: string;
  cost_analysis: string;
  sprint_prediction: string;
}

const PromptTemplateManager: React.FC<PromptTemplateManagerProps> = ({ projectId }) => {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<PromptTemplates>({
    sla_risk: '',
    team_performance: '',
    cost_analysis: '',
    sprint_prediction: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('sla_risk');

  const defaultTemplates: PromptTemplates = {
    sla_risk: "Analyze this Jira issue for SLA breach risk. Focus on workload distribution, team member performance, and delivery risks. Provide JSON with: risk_score (0-1), risk_factors (array), recommendations (array), workload_analysis, team_impact.",
    team_performance: "Analyze team performance focusing on burnout indicators, workload distribution, completion rates by member. Identify critical workload recommendations. Provide JSON with: performance_score, team_members (array with individual performance), workload_recommendations (array), critical_alerts (array).",
    cost_analysis: "Analyze project costs focusing on budget overruns, undefined estimations, missing story points. Provide JSON with: cost_score, budget_issues (array), estimation_problems (array), financial_recommendations (array).",
    sprint_prediction: "Predict sprint completion focusing on workflow bottlenecks, unassigned issues, excessive WIP. Provide JSON with: completion_probability, workflow_issues (array), sla_risks (array), recommendations (array)."
  };

  const promptCategories = [
    {
      key: 'sla_risk',
      title: 'Análise de Risco SLA',
      description: 'Identifica riscos de quebra de SLA e gargalos no workflow',
      icon: AlertTriangle,
      color: 'text-orange-500'
    },
    {
      key: 'team_performance',
      title: 'Performance da Equipe',
      description: 'Analisa burnout, sobrecarga e performance individual',
      icon: Users,
      color: 'text-blue-500'
    },
    {
      key: 'cost_analysis',
      title: 'Análise de Custos',
      description: 'Detecta problemas financeiros e estimativas ausentes',
      icon: DollarSign,
      color: 'text-green-500'
    },
    {
      key: 'sprint_prediction',
      title: 'Previsão de Sprint',
      description: 'Prediz conclusão de sprint e identifica impedimentos',
      icon: Target,
      color: 'text-purple-500'
    }
  ];

  useEffect(() => {
    loadTemplates();
  }, [projectId]);

  const loadTemplates = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('project_intelligence_profiles')
        .select('prompt_templates')
        .eq('project_id', projectId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (profile?.prompt_templates) {
        setTemplates({ ...defaultTemplates, ...(profile.prompt_templates as any) });
      } else {
        setTemplates(defaultTemplates);
      }
    } catch (error: any) {
      console.error('Error loading templates:', error);
      toast({
        title: "Erro ao carregar templates",
        description: error.message,
        variant: "destructive"
      });
      setTemplates(defaultTemplates);
    } finally {
      setLoading(false);
    }
  };

  const saveTemplates = async () => {
    setSaving(true);
    try {
      // First, try to update existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('project_intelligence_profiles')
        .select('id')
        .eq('project_id', projectId)
        .single();

      if (existingProfile) {
        // Update existing
        const { error } = await supabase
          .from('project_intelligence_profiles')
          .update({
            prompt_templates: templates as any,
            updated_at: new Date().toISOString()
          })
          .eq('project_id', projectId);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from('project_intelligence_profiles')
          .insert({
            project_id: projectId,
            prompt_templates: templates as any,
            methodology: 'scrum',
            average_hourly_rate: 100,
            story_points_to_hours: 8
          });

        if (error) throw error;
      }

      toast({
        title: "Templates salvos",
        description: "Os templates de prompt foram atualizados com sucesso"
      });
    } catch (error: any) {
      console.error('Error saving templates:', error);
      toast({
        title: "Erro ao salvar templates",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefault = (key: keyof PromptTemplates) => {
    setTemplates(prev => ({
      ...prev,
      [key]: defaultTemplates[key]
    }));
  };

  const updateTemplate = (key: keyof PromptTemplates, value: string) => {
    setTemplates(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Gerenciar Templates de Prompt
          </CardTitle>
          <CardDescription>
            Personalize os prompts da IA para gerar insights mais assertivos para este projeto.
            Templates customizados permitem focar em aspectos específicos do seu contexto de negócio.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          {promptCategories.map((category) => {
            const IconComponent = category.icon;
            return (
              <TabsTrigger key={category.key} value={category.key} className="flex items-center gap-2">
                <IconComponent className={`h-4 w-4 ${category.color}`} />
                <span className="hidden sm:inline">{category.title}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {promptCategories.map((category) => (
          <TabsContent key={category.key} value={category.key}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <category.icon className={`h-6 w-6 ${category.color}`} />
                    <div>
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                      <CardDescription>{category.description}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {templates[category.key as keyof PromptTemplates] === defaultTemplates[category.key as keyof PromptTemplates] 
                        ? 'Padrão' : 'Customizado'}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetToDefault(category.key as keyof PromptTemplates)}
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Resetar
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor={`template-${category.key}`}>Template do Prompt</Label>
                  <Textarea
                    id={`template-${category.key}`}
                    value={templates[category.key as keyof PromptTemplates]}
                    onChange={(e) => updateTemplate(category.key as keyof PromptTemplates, e.target.value)}
                    rows={8}
                    className="mt-2 font-mono text-sm"
                    placeholder="Digite o prompt customizado..."
                  />
                </div>
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">💡 Dicas para Templates Eficazes:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Seja específico sobre o que você quer que a IA identifique</li>
                    <li>• Inclua contexto sobre sua metodologia e prioridades</li>
                    <li>• Especifique claramente o formato JSON de resposta esperado</li>
                    <li>• Use linguagem que reflita os termos do seu negócio</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={saveTemplates} disabled={saving}>
          {saving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Salvar Templates
        </Button>
      </div>
    </div>
  );
};

export default PromptTemplateManager;