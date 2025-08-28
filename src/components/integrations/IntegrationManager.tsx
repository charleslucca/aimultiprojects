import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Settings, Trash2, RefreshCw, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Integration {
  id: string;
  integration_type: string;
  configuration: any;
  is_active: boolean;
  sync_enabled: boolean;
  last_sync_at?: string;
}

interface IntegrationManagerProps {
  projectId: string;
  clientId?: string;
}

const INTEGRATION_TYPES = [
  { 
    value: 'jira', 
    label: 'Jira', 
    icon: '🔧',
    description: 'Sincronizar issues, sprints e métricas do Jira'
  },
  { 
    value: 'azure_boards', 
    label: 'Azure Boards', 
    icon: '☁️',
    description: 'Conectar com Azure DevOps Boards'
  },
  { 
    value: 'github', 
    label: 'GitHub', 
    icon: '🐙',
    description: 'Issues, PRs e métricas de repositórios'
  },
  { 
    value: 'trello', 
    label: 'Trello', 
    icon: '📋',
    description: 'Cards e boards do Trello'
  }
];

export const IntegrationManager = ({ projectId, clientId }: IntegrationManagerProps) => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [config, setConfig] = useState<any>({});
  const { toast } = useToast();

  useEffect(() => {
    loadIntegrations();
  }, [projectId]);

  const loadIntegrations = async () => {
    try {
      const { data, error } = await supabase
        .from('project_integrations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setIntegrations(data || []);
    } catch (error) {
      toast({
        title: 'Erro ao carregar integrações',
        description: 'Não foi possível carregar as integrações do projeto',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddIntegration = async () => {
    if (!selectedType || !config.url) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('project_integrations')
        .insert({
          project_id: projectId,
          client_id: clientId,
          integration_type: selectedType,
          configuration: config,
          is_active: true,
          sync_enabled: true
        });

      if (error) throw error;

      toast({
        title: 'Integração adicionada',
        description: 'A nova integração foi configurada com sucesso',
      });

      setIsAddDialogOpen(false);
      setSelectedType('');
      setConfig({});
      loadIntegrations();
    } catch (error) {
      toast({
        title: 'Erro ao adicionar integração',
        description: 'Não foi possível adicionar a integração',
        variant: 'destructive',
      });
    }
  };

  const toggleSync = async (integrationId: string, enabled: boolean) => {
    try {
      const { error } = await supabase
        .from('project_integrations')
        .update({ sync_enabled: enabled })
        .eq('id', integrationId);

      if (error) throw error;

      toast({
        title: enabled ? 'Sincronização ativada' : 'Sincronização pausada',
        description: enabled ? 
          'A sincronização automática foi ativada' : 
          'A sincronização automática foi pausada',
      });

      loadIntegrations();
    } catch (error) {
      toast({
        title: 'Erro ao alterar sincronização',
        description: 'Não foi possível alterar o status da sincronização',
        variant: 'destructive',
      });
    }
  };

  const deleteIntegration = async (integrationId: string) => {
    try {
      const { error } = await supabase
        .from('project_integrations')
        .delete()
        .eq('id', integrationId);

      if (error) throw error;

      toast({
        title: 'Integração removida',
        description: 'A integração foi removida com sucesso',
      });

      loadIntegrations();
    } catch (error) {
      toast({
        title: 'Erro ao remover integração',
        description: 'Não foi possível remover a integração',
        variant: 'destructive',
      });
    }
  };

  const getIntegrationTypeInfo = (type: string) => {
    return INTEGRATION_TYPES.find(t => t.value === type) || {
      value: type,
      label: type,
      icon: '🔗',
      description: 'Integração customizada'
    };
  };

  const renderConfigFields = () => {
    if (!selectedType) return null;

    switch (selectedType) {
      case 'jira':
        return (
          <>
            <div>
              <Label htmlFor="jira-url">URL do Jira *</Label>
              <Input
                id="jira-url"
                value={config.url || ''}
                onChange={(e) => setConfig({ ...config, url: e.target.value })}
                placeholder="https://empresa.atlassian.net"
              />
            </div>
            <div>
              <Label htmlFor="jira-username">Usuário</Label>
              <Input
                id="jira-username"
                value={config.username || ''}
                onChange={(e) => setConfig({ ...config, username: e.target.value })}
                placeholder="seu-email@empresa.com"
              />
            </div>
            <div>
              <Label htmlFor="jira-token">API Token</Label>
              <Input
                id="jira-token"
                type="password"
                value={config.token || ''}
                onChange={(e) => setConfig({ ...config, token: e.target.value })}
                placeholder="Seu token de API do Jira"
              />
            </div>
          </>
        );
      
      case 'azure_boards':
        return (
          <>
            <div>
              <Label htmlFor="azure-org">Organização *</Label>
              <Input
                id="azure-org"
                value={config.organization || ''}
                onChange={(e) => setConfig({ ...config, organization: e.target.value })}
                placeholder="nome-da-organizacao"
              />
            </div>
            <div>
              <Label htmlFor="azure-project">Projeto</Label>
              <Input
                id="azure-project"
                value={config.project || ''}
                onChange={(e) => setConfig({ ...config, project: e.target.value })}
                placeholder="nome-do-projeto"
              />
            </div>
            <div>
              <Label htmlFor="azure-token">Personal Access Token</Label>
              <Input
                id="azure-token"
                type="password"
                value={config.token || ''}
                onChange={(e) => setConfig({ ...config, token: e.target.value })}
                placeholder="Seu PAT do Azure DevOps"
              />
            </div>
          </>
        );

      case 'github':
        return (
          <>
            <div>
              <Label htmlFor="github-repo">Repositório *</Label>
              <Input
                id="github-repo"
                value={config.repository || ''}
                onChange={(e) => setConfig({ ...config, repository: e.target.value })}
                placeholder="usuario/repositorio"
              />
            </div>
            <div>
              <Label htmlFor="github-token">GitHub Token</Label>
              <Input
                id="github-token"
                type="password"
                value={config.token || ''}
                onChange={(e) => setConfig({ ...config, token: e.target.value })}
                placeholder="Seu GitHub Personal Access Token"
              />
            </div>
          </>
        );

      default:
        return (
          <div>
            <Label htmlFor="custom-config">Configuração (JSON)</Label>
            <textarea
              id="custom-config"
              className="w-full p-2 border rounded-md"
              rows={4}
              value={JSON.stringify(config, null, 2)}
              onChange={(e) => {
                try {
                  setConfig(JSON.parse(e.target.value));
                } catch {
                  // Ignore invalid JSON
                }
              }}
              placeholder='{"url": "...", "token": "..."}'
            />
          </div>
        );
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando integrações...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Integrações do Projeto</h3>
          <p className="text-sm text-muted-foreground">
            Conecte diferentes ferramentas para sincronizar dados automaticamente
          </p>
        </div>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Integração
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Adicionar Nova Integração</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="integration-type">Tipo de Integração *</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo..." />
                  </SelectTrigger>
                  <SelectContent>
                    {INTEGRATION_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex items-center gap-2">
                          <span>{type.icon}</span>
                          <div>
                            <div className="font-medium">{type.label}</div>
                            <div className="text-sm text-muted-foreground">{type.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {renderConfigFields()}

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddIntegration}>
                  Adicionar Integração
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {integrations.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h4 className="text-lg font-medium mb-2">Nenhuma integração configurada</h4>
            <p className="text-muted-foreground mb-4">
              Conecte ferramentas como Jira, Azure Boards ou GitHub para sincronizar dados automaticamente
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Integração
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {integrations.map((integration) => {
            const typeInfo = getIntegrationTypeInfo(integration.integration_type);
            
            return (
              <Card key={integration.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{typeInfo.icon}</span>
                      <div>
                        <CardTitle className="text-base">{typeInfo.label}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {integration.configuration?.url || integration.configuration?.repository || 'Configurado'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={integration.is_active ? "default" : "secondary"}>
                      {integration.is_active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={integration.sync_enabled}
                        onCheckedChange={(checked) => toggleSync(integration.id, checked)}
                      />
                      <span className="text-sm">Sincronização automática</span>
                    </div>
                  </div>

                  {integration.last_sync_at && (
                    <p className="text-xs text-muted-foreground">
                      Última sincronização: {new Date(integration.last_sync_at).toLocaleString('pt-BR')}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Sincronizar
                    </Button>
                    <Button size="sm" variant="outline">
                      <Settings className="h-3 w-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => deleteIntegration(integration.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};