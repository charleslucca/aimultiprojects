import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CheckCircle, XCircle, RefreshCw } from 'lucide-react';

interface JiraConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedConfig?: any;
}

const JiraConfigModal: React.FC<JiraConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedConfig
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; user?: any } | null>(null);
  
  const [formData, setFormData] = useState({
    jira_url: '',
    username: '',
    api_token: '',
    project_keys: '',
    sync_enabled: true,
  });

  useEffect(() => {
    if (selectedConfig) {
      setFormData({
        jira_url: selectedConfig.jira_url || '',
        username: selectedConfig.username || '',
        api_token: '', // Never pre-fill API token for security
        project_keys: selectedConfig.project_keys?.join(', ') || '',
        sync_enabled: selectedConfig.sync_enabled ?? true,
      });
    } else {
      setFormData({
        jira_url: '',
        username: '',
        api_token: '',
        project_keys: '',
        sync_enabled: true,
      });
    }
    setTestResult(null);
  }, [selectedConfig, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTestResult(null); // Clear test results when form changes
  };

  const testConnection = async () => {
    if (!formData.jira_url || !formData.username || !formData.api_token) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha URL do Jira, usuário e token API.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('jira-sync', {
        body: {
          action: 'test_connection',
          jira_url: formData.jira_url.replace(/\/$/, ''), // Remove trailing slash
          username: formData.username,
          api_token: formData.api_token,
        }
      });

      if (error) throw error;

      setTestResult(data);
      
      if (data.success) {
        toast({
          title: "Conexão bem-sucedida!",
          description: `Conectado como ${data.user?.displayName || formData.username}`,
        });
      } else {
        toast({
          title: "Falha na conexão",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Erro desconhecido na conexão';
      setTestResult({ success: false, message: errorMessage });
      toast({
        title: "Erro no teste de conexão",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async () => {
    if (!testResult?.success) {
      toast({
        title: "Teste de conexão obrigatório",
        description: "Execute o teste de conexão antes de salvar.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const projectKeysArray = formData.project_keys
        .split(',')
        .map(key => key.trim())
        .filter(key => key.length > 0);

      const configData = {
        jira_url: formData.jira_url.replace(/\/$/, ''),
        username: formData.username,
        api_token_encrypted: formData.api_token, // In production, this should be encrypted
        project_keys: projectKeysArray,
        sync_enabled: formData.sync_enabled,
      };

      let result;
      if (selectedConfig) {
        result = await supabase
          .from('jira_configurations')
          .update(configData)
          .eq('id', selectedConfig.id);
      } else {
        result = await supabase
          .from('jira_configurations')
          .insert([configData]);
      }

      if (result.error) throw result.error;

      toast({
        title: selectedConfig ? "Configuração atualizada" : "Configuração criada",
        description: "Jira configurado com sucesso!",
      });

      onSave();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar configuração",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {selectedConfig ? 'Editar' : 'Nova'} Configuração Jira
          </DialogTitle>
          <DialogDescription>
            Configure a conexão com sua instância do Jira para sincronização automática de dados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Connection Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="jira_url">URL do Jira *</Label>
              <Input
                id="jira_url"
                placeholder="https://suaempresa.atlassian.net"
                value={formData.jira_url}
                onChange={(e) => handleInputChange('jira_url', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="username">Usuário (Email) *</Label>
                <Input
                  id="username"
                  type="email"
                  placeholder="seu@email.com"
                  value={formData.username}
                  onChange={(e) => handleInputChange('username', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="api_token">Token API *</Label>
                <Input
                  id="api_token"
                  type="password"
                  placeholder="Seu token API do Jira"
                  value={formData.api_token}
                  onChange={(e) => handleInputChange('api_token', e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="project_keys">Chaves dos Projetos</Label>
              <Input
                id="project_keys"
                placeholder="PROJ1, PROJ2, PROJ3 (deixe vazio para todos os projetos)"
                value={formData.project_keys}
                onChange={(e) => handleInputChange('project_keys', e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Separe múltiplas chaves por vírgula. Deixe vazio para sincronizar todos os projetos.
              </p>
            </div>
          </div>

          {/* Test Connection */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              <div>
                <p className="font-medium">Teste de Conexão</p>
                <p className="text-sm text-muted-foreground">
                  Verifique se as credenciais estão corretas
                </p>
              </div>
              {testResult && (
                <Badge variant={testResult.success ? "default" : "destructive"}>
                  {testResult.success ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  {testResult.success ? 'Sucesso' : 'Falha'}
                </Badge>
              )}
            </div>
            <Button
              variant="outline"
              onClick={testConnection}
              disabled={isTesting}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isTesting ? 'animate-spin' : ''}`} />
              {isTesting ? 'Testando...' : 'Testar'}
            </Button>
          </div>

          {testResult && (
            <div className={`p-4 rounded-lg ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className="text-sm font-medium">
                {testResult.success ? 'Conexão estabelecida!' : 'Falha na conexão'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {testResult.message}
              </p>
              {testResult.user && (
                <div className="mt-2 text-sm">
                  <p><strong>Usuário:</strong> {testResult.user.displayName}</p>
                  <p><strong>Email:</strong> {testResult.user.emailAddress}</p>
                </div>
              )}
            </div>
          )}

          {/* Sync Settings */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Sincronização Automática</Label>
              <p className="text-sm text-muted-foreground">
                Ativa sincronização periódica e webhooks
              </p>
            </div>
            <Switch
              checked={formData.sync_enabled}
              onCheckedChange={(checked) => handleInputChange('sync_enabled', checked)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={isLoading || !testResult?.success}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                selectedConfig ? 'Atualizar' : 'Criar Configuração'
              )}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
            <p className="font-medium mb-2">Como obter um Token API do Jira:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Acesse sua conta Atlassian</li>
              <li>Vá para Configurações {'>'} Segurança</li>
              <li>Clique em "Criar e gerenciar tokens de API"</li>
              <li>Clique em "Criar token de API"</li>
              <li>Cole o token gerado no campo acima</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default JiraConfigModal;