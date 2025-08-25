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
  UserPlus
} from 'lucide-react';

interface TeamMember {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  role: string;
  created_at: string;
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
      
      // Get all profiles (team members)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        throw profilesError;
      }

      // Get project counts for each member
      const membersWithStats = await Promise.all(
        (profiles || []).map(async (member) => {
          const { count: projectCount } = await supabase
            .from('project_members')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', member.user_id);

          const { count: taskCount } = await supabase
            .from('tasks')
            .select('*', { count: 'exact', head: true })
            .eq('assigned_to', member.user_id);

          return {
            ...member,
            project_count: projectCount || 0,
            task_count: taskCount || 0
          };
        })
      );

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
        `${member.first_name} ${member.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        member.role?.toLowerCase().includes(searchTerm.toLowerCase())
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
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
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
        <Button className="bg-gradient-primary hover:opacity-90 shadow-alpine">
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
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="bg-gradient-primary text-primary-foreground font-medium">
                          {getInitials(member.first_name, member.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">
                          {member.first_name} {member.last_name}
                        </h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={getRoleColor(member.role)}>
                            <RoleIcon className="h-3 w-3 mr-1" />
                            {member.role || 'Membro'}
                          </Badge>
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
                        <p className="font-semibold text-lg">{member.task_count || 0}</p>
                        <p className="text-muted-foreground">Tarefas</p>
                      </div>
                    </div>

                    {/* Member Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center space-x-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Desde {formatDate(member.created_at)}</span>
                      </div>
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
    </div>
  );
};

export default Team;