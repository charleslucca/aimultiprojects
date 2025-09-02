import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Settings, Trash2, RefreshCw, Zap, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  onIntegrationAdded?: () => void;
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

export const IntegrationManager = ({ projectId, clientId, onIntegrationAdded }: IntegrationManagerProps) => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [config, setConfig] = useState<any>({});
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string; }>({});
  const [showPATInstructions, setShowPATInstructions] = useState(false);
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
    if (!selectedType) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione o tipo de integração',
        variant: 'destructive',
      });
      return;
    }

    // Validate required fields based on integration type
    if (selectedType === 'jira') {
      if (!config.url || !config.username || !config.token) {
        toast({
          title: 'Campos obrigatórios',
          description: 'Preencha URL, usuário e token para integração Jira',
          variant: 'destructive',
        });
        return;
      }
      
      if (!testResult.success) {
        toast({
          title: 'Teste de conexão obrigatório',
          description: 'Execute o teste de conexão com sucesso antes de salvar',
          variant: 'destructive',
        });
        return;
      }
    }

    if (selectedType === 'azure_boards') {
      if (!config.organization || !config.token) {
        toast({
          title: 'Campos obrigatórios',
          description: 'Preencha organização e PAT para integração Azure Boards',
          variant: 'destructive',
        });
        return;
      }
      
      if (!testResult.success) {
        toast({
          title: 'Teste de conexão obrigatório',
          description: 'Execute o teste de conexão com sucesso antes de salvar',
          variant: 'destructive',
        });
        return;
      }
    }

    if (selectedType === 'github') {
      if (!config.owner || !config.repo || !config.token) {
        toast({
          title: 'Campos obrigatórios',
          description: 'Preencha owner, repositório e token para integração GitHub',
          variant: 'destructive',
        });
        return;
      }
      
      if (!testResult.success) {
        toast({
          title: 'Teste de conexão obrigatório',
          description: 'Execute o teste de conexão com sucesso antes de salvar',
          variant: 'destructive',
        });
        return;
      }
    }

    try {

      const { error } = await supabase
        .from('project_integrations')
        .insert({
          project_id: projectId,
          client_id: clientId,
          integration_type: selectedType,
          integration_subtype: selectedType === 'azure_boards' ? 'devops' : null,
          configuration: config,
          is_active: true,
          sync_enabled: true,
          metadata: { created_via: 'integration_manager' }
        });

      if (error) throw error;

      toast({
        title: 'Integração adicionada',
        description: 'A nova integração foi configurada com sucesso',
      });

      setIsAddDialogOpen(false);
      setSelectedType('');
      setConfig({});
      setTestResult({});
      loadIntegrations();
      
      // Notify parent component with delay to ensure DB transaction is complete
      if (onIntegrationAdded) {
        console.log('Integration added, notifying parent in 300ms...');
        setTimeout(() => {
          console.log('Calling onIntegrationAdded callback');
          onIntegrationAdded();
        }, 300);
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao adicionar integração',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const testJiraConnection = async () => {
    if (!config.url || !config.username || !config.token) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha URL, usuário e token antes de testar',
        variant: 'destructive',
      });
      return;
    }

    setIsTestingConnection(true);
    setTestResult({});
    
    try {
      const { data, error } = await supabase.functions.invoke('jira-connection-test', {
        body: { 
          config: {
            url: config.url,
            username: config.username,
            token: config.token,
            projectKeys: config.projectKeys ? config.projectKeys.split(',').map(k => k.trim()).filter(k => k) : []
          }
        }
      });
      
      if (error) {
        throw new Error(`Erro ao testar conexão: ${error.message}`);
      }
      
      if (data?.success) {
        setTestResult({ success: true, message: data.message });
        toast({
          title: 'Conexão bem-sucedida',
          description: 'Conexão com Jira estabelecida com sucesso',
        });
      } else {
        throw new Error(data?.message || 'Falha na conexão com Jira');
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
      toast({
        title: 'Erro na conexão',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const testGitHubConnection = async () => {
    if (!config.owner || !config.repo || !config.token) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha owner, repositório e token antes de testar',
        variant: 'destructive',
      });
      return;
    }

    setIsTestingConnection(true);
    setTestResult({});
    
    try {
      const { data, error } = await supabase.functions.invoke('github-connection-test', {
        body: { 
          token: config.token,
          owner: config.owner,
          repo: config.repo
        }
      });
      
      if (error) {
        throw new Error(`Erro ao testar conexão: ${error.message}`);
      }
      
      if (data?.success) {
        setTestResult({ success: true, message: `Conexão OK! Usuário: ${data.connection?.user?.login}` });
        toast({
          title: 'Conexão bem-sucedida',
          description: 'Conexão com GitHub estabelecida com sucesso',
        });
      } else {
        throw new Error(data?.error || 'Falha na conexão com GitHub');
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
      toast({
        title: 'Erro na conexão',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const testAzureConnection = async () => {
    if (!config.organization || !config.token) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha organização e PAT antes de testar',
        variant: 'destructive',
      });
      return;
    }

    setIsTestingConnection(true);
    setTestResult({});
    
    try {
      const { data, error } = await supabase.functions.invoke('azure-boards-sync', {
        body: { 
          action: 'test_connection', 
          config: {
            organization: config.organization,
            personalAccessToken: config.token
          }
        }
      });
      
      if (error) {
        throw new Error(`Erro ao testar conexão: ${error.message}`);
      }
      
      if (data?.success) {
        setTestResult({ success: true, message: data.message });
        toast({
          title: 'Conexão bem-sucedida',
          description: data.message,
        });
      } else {
        throw new Error('Falha na conexão com Azure DevOps');
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
      toast({
        title: 'Erro na conexão',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const toggleSync = async (integrationId: string, enabled: boolean) => {
    try {
      const integration = integrations.find(i => i.id === integrationId);
      if (!integration) return;

      const { error } = await supabase
        .from('project_integrations')
        .update({ sync_enabled: enabled })
        .eq('id', integrationId);

      if (error) throw error;

      // Trigger sync if enabling
      if (enabled) {
        if (integration.integration_type === 'azure_boards') {
          try {
            await supabase.functions.invoke('azure-boards-sync', {
              body: { 
                action: 'sync_integration', 
                integration_id: integrationId,
                config: {
                  organization: integration.configuration.organization,
                  project: integration.configuration.project,
                  personalAccessToken: integration.configuration.token
                }
              }
            });
          } catch (syncError) {
            console.error('Azure sync failed:', syncError);
          }
        }
      }

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

  const handleSyncIntegration = async (integration: Integration) => {
    try {
      if (integration.integration_type === 'azure_boards') {
        const { data, error } = await supabase.functions.invoke('azure-boards-sync', {
          body: { 
            action: 'sync_integration', 
            integration_id: integration.id,
            config: {
              organization: integration.configuration.organization,
              project: integration.configuration.project,
              personalAccessToken: integration.configuration.token
            }
          }
        });
        
        if (error) throw error;
        
        toast({
          title: 'Sincronização iniciada',
          description: 'Os dados do Azure Boards estão sendo sincronizados',
        });
      }
      
      loadIntegrations();
    } catch (error: any) {
      toast({
        title: 'Erro na sincronização',
        description: error.message,
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
                onChange={(e) => {
                  setConfig({ ...config, url: e.target.value });
                  setTestResult({});
                }}
                placeholder="https://empresa.atlassian.net"
              />
              <p className="text-xs text-muted-foreground mt-1">
                URL completa da sua instância Jira (ex: https://empresa.atlassian.net)
              </p>
            </div>
            
            <div>
              <Label htmlFor="jira-username">Usuário (Email) *</Label>
              <Input
                id="jira-username"
                value={config.username || ''}
                onChange={(e) => {
                  setConfig({ ...config, username: e.target.value });
                  setTestResult({});
                }}
                placeholder="seu-email@empresa.com"
              />
            </div>

            <div>
              <Label htmlFor="jira-project-keys">Chaves dos Projetos</Label>
              <Input
                id="jira-project-keys"
                value={config.projectKeys || ''}
                onChange={(e) => {
                  setConfig({ ...config, projectKeys: e.target.value });
                  setTestResult({});
                }}
                placeholder="PROJ1, PROJ2, PROJ3"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Chaves dos projetos para sincronizar (separados por vírgula). Deixe vazio para todos.
              </p>
            </div>

            <div>
              <Label htmlFor="jira-token">API Token *</Label>
              <Input
                id="jira-token"
                type="password"
                value={config.token || ''}
                onChange={(e) => {
                  setConfig({ ...config, token: e.target.value });
                  setTestResult({});
                }}
                placeholder="Seu token de API do Jira"
              />
              
              <Collapsible open={showPATInstructions} onOpenChange={setShowPATInstructions}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto text-xs text-muted-foreground hover:text-foreground">
                    {showPATInstructions ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                    Como obter o API Token do Jira?
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg space-y-2">
                    <p className="font-medium">Passos para criar um API Token:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Acesse <strong>Gerenciar conta Atlassian</strong></li>
                      <li>Vá para <strong>Segurança</strong> → <strong>API tokens</strong></li>
                      <li>Clique em <strong>Criar API token</strong></li>
                      <li>Dê um nome ao token (ex: "Integração Smart Hub")</li>
                      <li>Clique em <strong>Criar</strong></li>
                      <li>Copie o token gerado (você não poderá vê-lo novamente)</li>
                    </ol>
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.open('https://id.atlassian.com/manage-profile/security/api-tokens', '_blank')}
                        className="text-xs"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Criar API Token
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={testJiraConnection}
                  disabled={isTestingConnection || !config.url || !config.username || !config.token}
                  className="flex items-center gap-2"
                >
                  {isTestingConnection ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  {isTestingConnection ? 'Testando...' : 'Testar Conexão'}
                </Button>
                
                {testResult.success !== undefined && (
                  <Badge variant={testResult.success ? 'default' : 'destructive'}>
                    {testResult.success ? 'Conexão OK' : 'Falhou'}
                  </Badge>
                )}
              </div>
              
              {testResult.message && (
                <p className={`text-xs whitespace-pre-line ${testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {testResult.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="auto-sync-jira" className="font-medium">Sincronização Automática</Label>
                <p className="text-xs text-muted-foreground">
                  Sincronizar dados automaticamente a cada hora
                </p>
              </div>
              <Switch
                id="auto-sync-jira"
                checked={config.autoSync !== false}
                onCheckedChange={(checked) => setConfig({ ...config, autoSync: checked })}
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
                onChange={(e) => {
                  setConfig({ ...config, organization: e.target.value });
                  setTestResult({});
                }}
                placeholder="nome-da-organizacao"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Apenas o nome da organização (sem https://dev.azure.com/)
              </p>
            </div>
            
            <div>
              <Label htmlFor="azure-project">Projeto</Label>
              <Input
                id="azure-project"
                value={config.project || ''}
                onChange={(e) => {
                  setConfig({ ...config, project: e.target.value });
                  setTestResult({});
                }}
                placeholder="nome-do-projeto"
              />
            </div>
            
            <div>
              <Label htmlFor="azure-areas">Caminhos de Área (opcional)</Label>
              <Input
                id="azure-areas"
                value={config.areaPaths || ''}
                onChange={(e) => {
                  setConfig({ ...config, areaPaths: e.target.value });
                  setTestResult({});
                }}
                placeholder="Area1, Area2\\SubArea"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Separar múltiplas áreas por vírgula (deixe vazio para sincronizar todas)
              </p>
            </div>

            <div>
              <Label htmlFor="azure-token">Personal Access Token (PAT) *</Label>
              <Input
                id="azure-token"
                type="password"
                value={config.token || ''}
                onChange={(e) => {
                  setConfig({ ...config, token: e.target.value });
                  setTestResult({});
                }}
                placeholder="Seu PAT do Azure DevOps"
              />
              
              <Collapsible open={showPATInstructions} onOpenChange={setShowPATInstructions}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto text-xs text-muted-foreground hover:text-foreground">
                    {showPATInstructions ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                    Como obter o Personal Access Token?
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg space-y-2">
                    <p className="font-medium">Passos para criar um PAT:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Acesse Azure DevOps e clique no ícone de usuário</li>
                      <li>Selecione "Personal access tokens"</li>
                      <li>Clique em "New Token"</li>
                      <li>Configure as permissões necessárias:</li>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>Work items:</strong> Read</li>
                        <li><strong>Project and team:</strong> Read</li>
                        <li><strong>Analytics:</strong> Read (opcional)</li>
                      </ul>
                    </ol>
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.open('https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate', '_blank')}
                        className="text-xs"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Documentação oficial
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={testAzureConnection}
                  disabled={isTestingConnection || !config.organization || !config.token}
                  className="flex items-center gap-2"
                >
                  {isTestingConnection ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  {isTestingConnection ? 'Testando...' : 'Testar Conexão'}
                </Button>
                
                {testResult.success !== undefined && (
                  <Badge variant={testResult.success ? 'default' : 'destructive'}>
                    {testResult.success ? 'Conexão OK' : 'Falhou'}
                  </Badge>
                )}
              </div>
              
              {testResult.message && (
                <p className={`text-xs ${testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {testResult.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="auto-sync" className="font-medium">Sincronização Automática</Label>
                <p className="text-xs text-muted-foreground">
                  Sincronizar dados automaticamente a cada hora
                </p>
              </div>
              <Switch
                id="auto-sync"
                checked={config.autoSync !== false}
                onCheckedChange={(checked) => setConfig({ ...config, autoSync: checked })}
              />
            </div>
          </>
        );

      case 'github':
        return (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="github-owner">Owner/Organization *</Label>
                <Input
                  id="github-owner"
                  value={config.owner || ''}
                  onChange={(e) => {
                    setConfig({ ...config, owner: e.target.value });
                    setTestResult({});
                  }}
                  placeholder="nome-da-organizacao"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Nome do usuário ou organização no GitHub
                </p>
              </div>
              <div>
                <Label htmlFor="github-repo">Repositório *</Label>
                <Input
                  id="github-repo"
                  value={config.repo || ''}
                  onChange={(e) => {
                    setConfig({ ...config, repo: e.target.value });
                    setTestResult({});
                  }}
                  placeholder="nome-do-repositorio"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="github-token">Personal Access Token *</Label>
              <Input
                id="github-token"
                type="password"
                value={config.token || ''}
                onChange={(e) => {
                  setConfig({ ...config, token: e.target.value });
                  setTestResult({});
                }}
                placeholder="ghp_xxxxxxxxxxxx"
              />
              
              <Collapsible open={showPATInstructions} onOpenChange={setShowPATInstructions}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="mt-2 p-0 h-auto text-xs text-muted-foreground hover:text-foreground">
                    {showPATInstructions ? <ChevronDown className="h-3 w-3 mr-1" /> : <ChevronRight className="h-3 w-3 mr-1" />}
                    Como criar um Personal Access Token?
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 space-y-2">
                  <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg space-y-2">
                    <p className="font-medium">Passos para criar um PAT no GitHub:</p>
                    <ol className="list-decimal list-inside space-y-1 ml-2">
                      <li>Acesse <strong>Settings</strong> → <strong>Developer settings</strong></li>
                      <li>Clique em <strong>Personal access tokens</strong> → <strong>Tokens (classic)</strong></li>
                      <li>Clique em <strong>Generate new token</strong></li>
                      <li>Configure as permissões necessárias:</li>
                      <ul className="list-disc list-inside ml-4 space-y-1">
                        <li><strong>repo:</strong> Full control of private repositories</li>
                        <li><strong>read:user:</strong> Read access to user profile</li>
                        <li><strong>read:org:</strong> Read access to organization (se aplicável)</li>
                      </ul>
                    </ol>
                    <div className="flex items-center gap-2 pt-2 border-t border-border">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => window.open('https://github.com/settings/tokens', '_blank')}
                        className="text-xs"
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Criar PAT no GitHub
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={testGitHubConnection}
                  disabled={isTestingConnection || !config.owner || !config.repo || !config.token}
                  className="flex items-center gap-2"
                >
                  {isTestingConnection ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  ) : (
                    <Zap className="h-4 w-4" />
                  )}
                  {isTestingConnection ? 'Testando...' : 'Testar Conexão'}
                </Button>
                
                {testResult.success !== undefined && (
                  <Badge variant={testResult.success ? 'default' : 'destructive'}>
                    {testResult.success ? 'Conexão OK' : 'Falhou'}
                  </Badge>
                )}
              </div>
              
              {testResult.message && (
                <p className={`text-xs whitespace-pre-line ${testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {testResult.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <Label htmlFor="auto-sync-github" className="font-medium">Sincronização Automática</Label>
                <p className="text-xs text-muted-foreground">
                  Sincronizar dados automaticamente a cada hora
                </p>
              </div>
              <Switch
                id="auto-sync-github"
                checked={config.autoSync !== false}
                onCheckedChange={(checked) => setConfig({ ...config, autoSync: checked })}
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
                           {integration.configuration?.url || 
                            integration.configuration?.organization ||
                            `${integration.configuration?.owner}/${integration.configuration?.repo}` || 
                            'Configurado'}
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
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => handleSyncIntegration(integration)}
                    >
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