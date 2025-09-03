import React, { useState, useEffect } from 'react';

import { Navigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { NewProjectModal } from '@/components/modals/NewProjectModal';
import { ProjectDetailsModal } from '@/components/modals/ProjectDetailsModal';
import {
  Plus, 
  Search, 
  Filter,
  Calendar,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  Target,
  Loader2
} from 'lucide-react';

interface Project {
  id: string;
  client_id: string;
  name: string;
  description: string;
  status: string;
  budget: number;
  start_date: string;
  end_date: string;
  metadata: any;
  created_at: string;
}

const Projects = () => {
  // Remove auth dependencies for now
  const user = null;
  const loading = false;
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, statusFilter]);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setProjects(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar projetos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterProjects = () => {
    let filtered = projects;

    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => project.status === statusFilter);
    }

    setFilteredProjects(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'ativo':
        return 'bg-success text-success-foreground';
      case 'planning':
      case 'planejamento':
        return 'bg-warning text-warning-foreground';
      case 'completed':
      case 'concluído':
        return 'bg-accent text-accent-foreground';
      case 'paused':
      case 'pausado':
        return 'bg-muted text-muted-foreground';
      case 'cancelled':
      case 'cancelado':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Mock function for priority since it's not in the current schema
  const getPriorityColor = (priority: string = 'medium') => {
    switch (priority) {
      case 'high':
        return 'bg-destructive text-destructive-foreground';
      case 'medium':
        return 'bg-warning text-warning-foreground';
      case 'low':
        return 'bg-success text-success-foreground';
      case 'critical':
        return 'bg-destructive text-destructive-foreground animate-pulse';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  // Mock function for progress since it's not in the current schema
  const getProgressPercentage = (project: Project) => {
    // Generate a mock progress based on project status
    switch (project.status?.toLowerCase()) {
      case 'completed':
      case 'concluído':
        return 100;
      case 'active':
      case 'ativo':
        return Math.floor(Math.random() * 60) + 30; // 30-90%
      case 'planning':
      case 'planejamento':
        return Math.floor(Math.random() * 30); // 0-30%
      default:
        return 0;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
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

  const statusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'planning', label: 'Planejamento' },
    { value: 'active', label: 'Ativo' },
    { value: 'paused', label: 'Pausado' },
    { value: 'completed', label: 'Concluído' },
    { value: 'cancelled', label: 'Cancelado' },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projetos</h1>
          <p className="text-muted-foreground">
            Gerencie e acompanhe todos os seus projetos
          </p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90 shadow-alpine"
          onClick={() => setShowNewProjectModal(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar projetos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="glass-card animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                  <div className="h-2 bg-muted rounded w-full"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-muted rounded w-16"></div>
                    <div className="h-6 bg-muted rounded w-20"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum projeto encontrado</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter !== 'all'
                ? 'Tente ajustar os filtros para encontrar projetos.'
                : 'Você ainda não tem projetos. Que tal criar o primeiro?'}
            </p>
            <Button className="bg-gradient-primary hover:opacity-90">
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Projeto
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Card key={project.id} className="glass-card hover:shadow-alpine transition-all duration-300 cursor-pointer">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Project Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg line-clamp-1">{project.name}</h3>
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {project.description}
                      </p>
                    </div>
                  </div>

                  {/* Status and Priority */}
                  <div className="flex gap-2">
                    <Badge className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                    <Badge variant="outline" className={getPriorityColor('medium')}>
                      prioridade média
                    </Badge>
                  </div>

                  {/* Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>Progresso</span>
                      <span className="font-medium">{getProgressPercentage(project)}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-gradient-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${getProgressPercentage(project)}%` }}
                      />
                    </div>
                  </div>

                  {/* Project Details */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {project.budget && (
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Orçamento:</span>
                        <span className="font-medium">{formatCurrency(project.budget)}</span>
                      </div>
                    )}
                    {project.end_date && (
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Prazo:</span>
                        <span className="font-medium">{formatDate(project.end_date)}</span>
                      </div>
                    )}
                  </div>

                  {/* AI Insights - Mock since not in current schema */}
                  <div className="p-3 rounded-lg bg-primary-light border border-primary/20">
                    <div className="flex items-center space-x-2 mb-2">
                      <AlertTriangle className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium text-primary">IA Insights</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      Projeto está dentro do cronograma previsto. Considere revisar o orçamento.
                    </p>
                  </div>

                  {/* Action Button */}
                  <Button 
                    variant="outline" 
                    className="w-full hover:bg-accent"
                    onClick={() => setSelectedProjectId(project.id)}
                  >
                    Ver Detalhes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modals */}
      <NewProjectModal
        open={showNewProjectModal}
        onOpenChange={setShowNewProjectModal}
        onProjectCreated={fetchProjects}
      />
      {selectedProjectId && (
        <ProjectDetailsModal
          open={!!selectedProjectId}
          onOpenChange={(open) => !open && setSelectedProjectId(null)}
          projectId={selectedProjectId}
        />
      )}
    </div>
  );
};

export default Projects;