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

interface AzureConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  selectedIntegration?: any;
  projectId?: string;
}

const AzureConfigModal: React.FC<AzureConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  selectedIntegration,
  projectId
}) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; user?: any } | null>(null);
  
  const [formData, setFormData] = useState({
    organization: '',
    project_name: '',
    personal_access_token: '',
    area_paths: '',
    is_active: true,
  });

  useEffect(() => {
    if (selectedIntegration) {
      setFormData({
        organization: selectedIntegration.configuration?.organization || '',
        project_name: selectedIntegration.configuration?.project_name || '',
        personal_access_token: '', // Never pre-fill PAT for security
        area_paths: selectedIntegration.configuration?.area_paths?.join(', ') || '',
        is_active: selectedIntegration.is_active ?? true,
      });
    } else {
      setFormData({
        organization: '',
        project_name: '',
        personal_access_token: '',
        area_paths: '',
        is_active: true,
      });
    }
    setTestResult(null);
  }, [selectedIntegration, isOpen]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setTestResult(null); // Clear test results when form changes
  };

  const testConnection = async () => {
    if (!formData.organization || !formData.personal_access_token) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha organização e Personal Access Token.",
        variant: "destructive",
      });
      return;
    }

    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke('azure-boards-sync', {
        body: {
          action: 'test_connection',
          organization: formData.organization,
          project: formData.project_name,
          personal_access_token: formData.personal_access_token,
        }
      });

      if (error) throw error;

      setTestResult(data);
      
      if (data.success) {
        toast({
          title: "Conexão bem-sucedida!",
          description: `Conectado ao Azure DevOps da organização ${formData.organization}`,
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
      const areaPathsArray = formData.area_paths
        .split(',')
        .map(path => path.trim())
        .filter(path => path.length > 0);

      const configData = {
        project_id: projectId,
        integration_type: 'azure_boards',
        integration_subtype: 'devops',
        is_active: formData.is_active,
        configuration: {
          organization: formData.organization,
          project_name: formData.project_name,
          personal_access_token: formData.personal_access_token, // In production, this should be encrypted
          area_paths: areaPathsArray,
        },
      };

      let result;
      if (selectedIntegration) {
        result = await supabase
          .from('project_integrations')
          .update(configData)
          .eq('id', selectedIntegration.id);
      } else {
        result = await supabase
          .from('project_integrations')
          .insert([configData]);
      }

      if (result.error) throw result.error;

      toast({
        title: selectedIntegration ? "Integração atualizada" : "Integração criada",
        description: "Azure Boards configurado com sucesso!",
      });

      onSave();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar integração",
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
            {selectedIntegration ? 'Editar' : 'Nova'} Integração Azure Boards
          </DialogTitle>
          <DialogDescription>
            Configure a conexão com Azure DevOps para sincronização automática de work items.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Connection Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="organization">Organização *</Label>
              <Input
                id="organization"
                placeholder="suaorganizacao"
                value={formData.organization}
                onChange={(e) => handleInputChange('organization', e.target.value)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Apenas o nome da organização (sem https://dev.azure.com/)
              </p>
            </div>

            <div>
              <Label htmlFor="project_name">Projeto</Label>
              <Input
                id="project_name"
                placeholder="Nome do projeto (opcional para todos os projetos)"
                value={formData.project_name}
                onChange={(e) => handleInputChange('project_name', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="area_paths">Caminhos de Área (opcional)</Label>
              <Textarea
                id="area_paths"
                placeholder="Area\\Path1, Area\\Path2"
                value={formData.area_paths}
                onChange={(e) => handleInputChange('area_paths', e.target.value)}
                rows={3}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Separe múltiplos caminhos por vírgula. Deixe vazio para todas as áreas.
              </p>
            </div>

            <div>
              <Label htmlFor="personal_access_token">Personal Access Token (PAT) *</Label>
              <Input
                id="personal_access_token"
                type="password"
                placeholder="Seu PAT do Azure DevOps"
                value={formData.personal_access_token}
                onChange={(e) => handleInputChange('personal_access_token', e.target.value)}
              />
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
            </div>
          )}

          {/* Sync Settings */}
          <div className="flex items-center justify-between">
            <div>
              <Label>Integração Ativa</Label>
              <p className="text-sm text-muted-foreground">
                Ativa sincronização de work items
              </p>
            </div>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => handleInputChange('is_active', checked)}
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
                selectedIntegration ? 'Atualizar' : 'Criar Integração'
              )}
            </Button>
          </div>

          {/* Help Text */}
          <div className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
            <p className="font-medium mb-2">Como obter um Personal Access Token (PAT):</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Acesse Azure DevOps e clique no ícone de usuário</li>
              <li>Clique em "Personal access tokens"</li>
              <li>Clique em "New Token"</li>
              <li>Configure as permissões necessárias (Work Items: Read & Write)</li>
              <li>Cole o token gerado no campo acima</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AzureConfigModal;