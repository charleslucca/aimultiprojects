import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Plus, Mail, Trash2, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AuthorizedEmail {
  id: string;
  email: string;
  notes?: string;
  added_at: string;
  is_active: boolean;
}

export const AuthorizedEmailsManager = () => {
  const [authorizedEmails, setAuthorizedEmails] = useState<AuthorizedEmail[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingEmails, setLoadingEmails] = useState(true);
  const { toast } = useToast();
  const { isAuthorized } = useAuth();

  // Load authorized emails on component mount
  useEffect(() => {
    if (isAuthorized) {
      loadAuthorizedEmails();
    }
  }, [isAuthorized]);

  const loadAuthorizedEmails = async () => {
    try {
      setLoadingEmails(true);
      const { data, error } = await supabase
        .from('authorized_emails')
        .select('*')
        .order('added_at', { ascending: false });

      if (error) throw error;
      setAuthorizedEmails(data || []);
    } catch (error) {
      console.error('Error loading authorized emails:', error);
      toast({
        title: "Erro ao carregar emails",
        description: "Não foi possível carregar a lista de emails autorizados.",
        variant: "destructive",
      });
    } finally {
      setLoadingEmails(false);
    }
  };

  const addAuthorizedEmail = async () => {
    if (!newEmail.trim()) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('authorized_emails')
        .insert([
          {
            email: newEmail.toLowerCase().trim(),
            notes: newNotes.trim() || null,
          }
        ]);

      if (error) throw error;

      toast({
        title: "Email adicionado",
        description: `${newEmail} foi adicionado à lista de emails autorizados.`,
      });

      setNewEmail('');
      setNewNotes('');
      loadAuthorizedEmails();
    } catch (error: any) {
      console.error('Error adding email:', error);
      
      if (error.code === '23505') { // Duplicate key error
        toast({
          title: "Email já existe",
          description: "Este email já está na lista de emails autorizados.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao adicionar email",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleEmailStatus = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('authorized_emails')
        .update({ is_active: !currentStatus })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: currentStatus ? "Email desativado" : "Email ativado",
        description: `O email foi ${currentStatus ? 'desativado' : 'ativado'} com sucesso.`,
      });

      loadAuthorizedEmails();
    } catch (error: any) {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const deleteEmail = async (id: string, email: string) => {
    if (!confirm(`Tem certeza que deseja remover o email "${email}" da lista?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('authorized_emails')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Email removido",
        description: `${email} foi removido da lista de emails autorizados.`,
      });

      loadAuthorizedEmails();
    } catch (error: any) {
      toast({
        title: "Erro ao remover email",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!isAuthorized) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Acesso Restrito</CardTitle>
          <CardDescription>
            Apenas usuários autorizados podem gerenciar emails.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            Gerenciar Emails Autorizados
          </CardTitle>
          <CardDescription>
            Controle quais emails podem criar contas e acessar o sistema.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div>
              <Label htmlFor="newEmail">Novo Email</Label>
              <Input
                id="newEmail"
                type="email"
                placeholder="usuario@empresa.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="newNotes">Observações (opcional)</Label>
              <Textarea
                id="newNotes"
                placeholder="Ex: Desenvolvedor, Gerente de Projetos..."
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={2}
              />
            </div>
            
            <Button 
              onClick={addAuthorizedEmail}
              disabled={loading || !newEmail.trim()}
              className="w-fit"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Email
            </Button>
          </div>

          <Separator />

          <div>
            <h4 className="font-semibold mb-3">
              Emails Autorizados ({authorizedEmails.length})
            </h4>
            
            {loadingEmails ? (
              <div className="text-center py-4 text-muted-foreground">
                Carregando emails...
              </div>
            ) : authorizedEmails.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Nenhum email autorizado encontrado.
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {authorizedEmails.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-card/50"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{item.email}</span>
                        <Badge
                          variant={item.is_active ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {item.is_active ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Ativo
                            </>
                          ) : (
                            'Inativo'
                          )}
                        </Badge>
                      </div>
                      {item.notes && (
                        <p className="text-sm text-muted-foreground truncate">
                          {item.notes}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Adicionado em: {new Date(item.added_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleEmailStatus(item.id, item.is_active)}
                        title={item.is_active ? 'Desativar' : 'Ativar'}
                      >
                        {item.is_active ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEmail(item.id, item.email)}
                        className="text-destructive hover:text-destructive"
                        title="Remover email"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};