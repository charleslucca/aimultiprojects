import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { InviteMemberModal } from '@/components/modals/InviteMemberModal';
import { 
  Plus, 
  Search, 
  Mail,
  Calendar,
  User,
  Shield,
  Users,
  Activity,
  Loader2,
  UserPlus,
  TrendingUp
} from 'lucide-react';

interface TeamMember {
  id: string;
  project_id: string;
  name: string;
  role: string;
  seniority: string;
  cost_type: string;
  cost: number;
  allocation: number;
  start_date: string;
  end_date: string;
  project_count?: number;
  task_count?: number;
}

const Team = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<TeamMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchTeamMembers();
    }
  }, [user]);

  useEffect(() => {
    filterMembers();
  }, [teamMembers, searchTerm]);

  const fetchTeamMembers = async () => {
    try {
      setIsLoading(true);
      
      // Get all team members
      const { data: members, error: membersError } = await supabase
        .from('team_members')
        .select('*')
        .order('start_date', { ascending: false });

      if (membersError) {
        throw membersError;
      }

      // Get project counts for each member (mock data for now)
      const membersWithStats = (members || []).map((member) => ({
        ...member,
        project_count: Math.floor(Math.random() * 5) + 1, // Mock: 1-5 projects
        task_count: Math.floor(Math.random() * 20) + 5, // Mock: 5-25 tasks
      }));

      setTeamMembers(membersWithStats);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar equipe",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterMembers = () => {
    let filtered = teamMembers;

    if (searchTerm) {
      filtered = filtered.filter(member =>
        member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.seniority?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredMembers(filtered);
  };

  const getRoleColor = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'bg-destructive text-destructive-foreground';
      case 'manager':
        return 'bg-warning text-warning-foreground';
      case 'member':
        return 'bg-primary text-primary-foreground';
      case 'viewer':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-secondary text-secondary-foreground';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return Shield;
      case 'manager':
        return Users;
      default:
        return User;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Data não informada';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getInitials = (name: string) => {
    if (!name) return 'TM';
    const names = name.split(' ');
    return names.length >= 2 
      ? `${names[0][0]}${names[names.length-1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Equipe</h1>
          <p className="text-muted-foreground">
            Gerencie os membros da sua organização
          </p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90 shadow-alpine"
          onClick={() => setShowInviteModal(true)}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Convidar Membro
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Membros</p>
                <p className="text-2xl font-bold">{teamMembers.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary-light">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Administradores</p>
                <p className="text-2xl font-bold">
                  {teamMembers.filter(m => m.role === 'admin').length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/10">
                <Shield className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Gerentes</p>
                <p className="text-2xl font-bold">
                  {teamMembers.filter(m => m.role === 'manager').length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <Users className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Membros Ativos</p>
                <p className="text-2xl font-bold">
                  {teamMembers.filter(m => (m.project_count || 0) > 0).length}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <Activity className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar membros..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Team Members Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="glass-card animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-muted rounded-full"></div>
                    <div className="space-y-2">
                      <div className="h-4 bg-muted rounded w-24"></div>
                      <div className="h-3 bg-muted rounded w-16"></div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredMembers.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum membro encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm
                ? 'Tente ajustar os filtros para encontrar membros.'
                : 'Sua equipe ainda está vazia. Convide o primeiro membro!'}
            </p>
            <Button className="bg-gradient-primary hover:opacity-90">
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar Primeiro Membro
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMembers.map((member) => {
            const RoleIcon = getRoleIcon(member.role);
            return (
              <Card key={member.id} className="glass-card hover:shadow-alpine transition-all duration-300">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    {/* Member Header */}
                    <div className="flex items-start space-x-3">
                      <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground font-medium">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">
                          {member.name}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getRoleColor(member.role)}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {member.role || 'Membro'}
                          </Badge>
                          {member.seniority && (
                            <Badge variant="outline">
                              {member.seniority}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Member Stats */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="text-center p-3 rounded-lg bg-muted/30">
                        <p className="font-semibold text-lg">{member.project_count || 0}</p>
                        <p className="text-muted-foreground">Projetos</p>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/30">
                        <p className="font-semibold text-lg">{member.allocation || 0}%</p>
                        <p className="text-muted-foreground">Alocação</p>
                      </div>
                    </div>

                    {/* Member Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Início: {formatDate(member.start_date)}</span>
                      </div>
                      {member.cost && (
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <span>Custo: {formatCurrency(member.cost)}/{member.cost_type || 'mês'}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1">
                        <Mail className="h-4 w-4 mr-1" />
                        Contatar
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        Ver Perfil
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
         </div>
       )}

       {/* Invite Member Modal */}
       <InviteMemberModal
         open={showInviteModal}
         onOpenChange={setShowInviteModal}
         onMemberInvited={fetchTeamMembers}
       />
     </div>
   );
 };

export default Team;