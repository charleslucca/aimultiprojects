import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail, User, DollarSign } from 'lucide-react';

interface InviteMemberModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMemberInvited: () => void;
}

interface MemberFormData {
  name: string;
  role: string;
  seniority: string;
  cost_type: string;
  cost: string;
  allocation: string;
  start_date: string;
  end_date: string;
}

export const InviteMemberModal = ({ open, onOpenChange, onMemberInvited }: InviteMemberModalProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<MemberFormData>({
    name: '',
    role: '',
    seniority: '',
    cost_type: 'monthly',
    cost: '',
    allocation: '100',
    start_date: '',
    end_date: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const memberData = {
        name: formData.name,
        role: formData.role,
        seniority: formData.seniority,
        cost_type: formData.cost_type,
        cost: parseFloat(formData.cost),
        allocation: parseInt(formData.allocation),
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        project_id: null // Will be assigned to projects later
      };

      const { error } = await supabase
        .from('team_members')
        .insert([memberData]);

      if (error) throw error;

      toast({
        title: "Membro adicionado com sucesso!",
        description: "O novo membro foi adicionado à sua equipe.",
      });

      // Reset form
      setFormData({
        name: '',
        role: '',
        seniority: '',
        cost_type: 'monthly',
        cost: '',
        allocation: '100',
        start_date: '',
        end_date: ''
      });

      onMemberInvited();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar membro",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: keyof MemberFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Adicionar Membro da Equipe</DialogTitle>
          <DialogDescription>
            Adicione um novo membro à sua equipe com as informações básicas.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="Ex: João Silva"
                  value={formData.name}
                  onChange={(e) => updateFormData('name', e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Função</Label>
              <Select value={formData.role} onValueChange={(value) => updateFormData('role', value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="developer">Desenvolvedor</SelectItem>
                  <SelectItem value="designer">Designer</SelectItem>
                  <SelectItem value="manager">Gerente de Projeto</SelectItem>
                  <SelectItem value="analyst">Analista</SelectItem>
                  <SelectItem value="qa">QA Tester</SelectItem>
                  <SelectItem value="devops">DevOps</SelectItem>
                  <SelectItem value="consultant">Consultor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="seniority">Senioridade</Label>
              <Select value={formData.seniority} onValueChange={(value) => updateFormData('seniority', value)} required>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="junior">Junior</SelectItem>
                  <SelectItem value="pleno">Pleno</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="lead">Tech Lead</SelectItem>
                  <SelectItem value="principal">Principal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="allocation">Alocação (%)</Label>
              <Input
                id="allocation"
                type="number"
                min="1"
                max="100"
                placeholder="100"
                value={formData.allocation}
                onChange={(e) => updateFormData('allocation', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cost_type">Tipo de Custo</Label>
              <Select value={formData.cost_type} onValueChange={(value) => updateFormData('cost_type', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hourly">Por Hora</SelectItem>
                  <SelectItem value="daily">Diária</SelectItem>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="project">Por Projeto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Custo (R$)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="cost"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={formData.cost}
                  onChange={(e) => updateFormData('cost', e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Data de Início</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => updateFormData('start_date', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">Data de Término</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => updateFormData('end_date', e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !formData.name || !formData.role || !formData.cost}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Adicionar Membro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};