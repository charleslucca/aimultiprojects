import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Save, Plus, X, DollarSign, Calendar, Briefcase } from "lucide-react";

interface UserProjectParticipationModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: any[];
}

type ProjectRole = 'developer' | 'tech_lead' | 'scrum_master' | 'product_owner' | 'designer' | 'qa_engineer' | 'devops_engineer' | 'architect' | 'agile_coach' | 'business_analyst';
type ContractType = 'clt' | 'pj' | 'freelancer' | 'consultant';

interface Participation {
  id?: string;
  jira_project_key: string;
  jira_project_name?: string;
  role: ProjectRole;
  allocation_percentage: number;
  contract_type: ContractType;
  monthly_salary?: number;
  hourly_rate?: number;
  start_date?: string;
  end_date?: string;
  is_active: boolean;
}

const PROJECT_ROLES = [
  { value: 'developer', label: 'Developer' },
  { value: 'tech_lead', label: 'Tech Lead' },
  { value: 'scrum_master', label: 'Scrum Master' },
  { value: 'product_owner', label: 'Product Owner' },
  { value: 'designer', label: 'Designer' },
  { value: 'qa_engineer', label: 'QA Engineer' },
  { value: 'devops_engineer', label: 'DevOps Engineer' },
  { value: 'architect', label: 'Architect' },
  { value: 'agile_coach', label: 'Agile Coach' },
  { value: 'business_analyst', label: 'Business Analyst' }
];

const CONTRACT_TYPES = [
  { value: 'clt', label: 'CLT' },
  { value: 'pj', label: 'PJ' },
  { value: 'freelancer', label: 'Freelancer' },
  { value: 'consultant', label: 'Consultor' }
];

const UserProjectParticipationModal: React.FC<UserProjectParticipationModalProps> = ({
  isOpen,
  onClose,
  projects
}) => {
  const { toast } = useToast();
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Participation>({
    jira_project_key: '',
    role: 'developer' as ProjectRole,
    allocation_percentage: 100,
    contract_type: 'clt' as ContractType,
    is_active: true
  });

  useEffect(() => {
    if (isOpen) {
      loadParticipations();
    }
  }, [isOpen]);

  const loadParticipations = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('user_project_participations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setParticipations(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar participações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveParticipation = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const projectInfo = projects.find(p => p.jira_key === editForm.jira_project_key);
      const participationData = {
        ...editForm,
        user_id: user.id,
        jira_project_name: projectInfo?.name || editForm.jira_project_key
      };

      if (editingIndex !== null && participations[editingIndex]?.id) {
        // Update existing
        const { error } = await supabase
          .from('user_project_participations')
          .update(participationData)
          .eq('id', participations[editingIndex].id);

        if (error) throw error;
      } else {
        // Create new
        const { error } = await supabase
          .from('user_project_participations')
          .insert(participationData);

        if (error) throw error;
      }

      toast({
        title: "Participação salva",
        description: "Suas informações foram atualizadas com sucesso.",
      });

      setEditingIndex(null);
      setEditForm({
        jira_project_key: '',
        role: 'developer' as ProjectRole,
        allocation_percentage: 100,
        contract_type: 'clt' as ContractType,
        is_active: true
      });
      loadParticipations();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar participação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteParticipation = async (id: string) => {
    try {
      const { error } = await supabase
        .from('user_project_participations')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Participação removida",
        description: "A participação foi removida com sucesso.",
      });

      loadParticipations();
    } catch (error: any) {
      toast({
        title: "Erro ao remover participação",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditForm({ ...participations[index] });
  };

  const startNewParticipation = () => {
    setEditingIndex(-1);
    setEditForm({
      jira_project_key: '',
      role: 'developer' as ProjectRole,
      allocation_percentage: 100,
      contract_type: 'clt' as ContractType,
      is_active: true
    });
  };

  const cancelEditing = () => {
    setEditingIndex(null);
    setEditForm({
      jira_project_key: '',
      role: 'developer' as ProjectRole,
      allocation_percentage: 100,
      contract_type: 'clt' as ContractType,
      is_active: true
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Minhas Participações nos Projetos
          </DialogTitle>
          <DialogDescription>
            Configure seu papel, alocação e informações contratuais para cada projeto Jira.
            Essas informações são usadas para cálculos econômicos e análises de produtividade.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Participation Button */}
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Participações Ativas</h3>
            <Button onClick={startNewParticipation} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Participação
            </Button>
          </div>

          {/* Editing Form */}
          {editingIndex !== null && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="text-sm">
                  {editingIndex === -1 ? 'Nova Participação' : 'Editar Participação'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="project">Projeto</Label>
                    <Select 
                      value={editForm.jira_project_key} 
                      onValueChange={(value) => setEditForm({ ...editForm, jira_project_key: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um projeto" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.jira_key} value={project.jira_key}>
                            {project.jira_key} - {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="role">Papel no Projeto</Label>
                    <Select 
                      value={editForm.role} 
                      onValueChange={(value) => setEditForm({ ...editForm, role: value as ProjectRole })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_ROLES.map((role) => (
                          <SelectItem key={role.value} value={role.value}>
                            {role.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="allocation">Alocação (%)</Label>
                    <Input
                      id="allocation"
                      type="number"
                      min="1"
                      max="100"
                      value={editForm.allocation_percentage}
                      onChange={(e) => setEditForm({ ...editForm, allocation_percentage: Number(e.target.value) })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="contract">Tipo de Contrato</Label>
                    <Select 
                      value={editForm.contract_type} 
                      onValueChange={(value) => setEditForm({ ...editForm, contract_type: value as ContractType })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CONTRACT_TYPES.map((contract) => (
                          <SelectItem key={contract.value} value={contract.value}>
                            {contract.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="salary">Salário Mensal (R$)</Label>
                    <Input
                      id="salary"
                      type="number"
                      step="0.01"
                      value={editForm.monthly_salary || ''}
                      onChange={(e) => setEditForm({ ...editForm, monthly_salary: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="hourly">Valor Hora (R$)</Label>
                    <Input
                      id="hourly"
                      type="number"
                      step="0.01"
                      value={editForm.hourly_rate || ''}
                      onChange={(e) => setEditForm({ ...editForm, hourly_rate: e.target.value ? Number(e.target.value) : undefined })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Data de Início</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={editForm.start_date || ''}
                      onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="end-date">Data de Fim</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={editForm.end_date || ''}
                      onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={cancelEditing}>
                    <X className="h-4 w-4 mr-2" />
                    Cancelar
                  </Button>
                  <Button onClick={saveParticipation}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Participations List */}
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center py-8">Carregando participações...</div>
            ) : participations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma participação configurada ainda.</p>
                <p className="text-sm">Clique em "Nova Participação" para começar.</p>
              </div>
            ) : (
              participations.map((participation, index) => (
                <Card key={participation.id || index} className={!participation.is_active ? 'opacity-60' : ''}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{participation.jira_project_key}</Badge>
                          <Badge variant="secondary">
                            {PROJECT_ROLES.find(r => r.value === participation.role)?.label}
                          </Badge>
                          <Badge variant={participation.is_active ? "default" : "secondary"}>
                            {participation.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            Alocação: {participation.allocation_percentage}%
                          </div>
                          <div className="flex items-center gap-1">
                            <Briefcase className="h-3 w-3" />
                            {CONTRACT_TYPES.find(c => c.value === participation.contract_type)?.label}
                          </div>
                          {participation.monthly_salary && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              Salário: R$ {participation.monthly_salary.toLocaleString('pt-BR')}
                            </div>
                          )}
                          {participation.hourly_rate && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3" />
                              Hora: R$ {participation.hourly_rate.toLocaleString('pt-BR')}
                            </div>
                          )}
                          {participation.start_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Início: {new Date(participation.start_date).toLocaleDateString('pt-BR')}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => startEditing(index)}
                        >
                          Editar
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => participation.id && deleteParticipation(participation.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          Remover
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UserProjectParticipationModal;