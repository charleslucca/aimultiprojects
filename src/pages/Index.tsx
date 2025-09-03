import React from 'react';

import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock,
  AlertTriangle,
  CheckCircle,
  Mountain,
  Plus,
  ArrowRight
} from 'lucide-react';

const Index = () => {
  // Remove auth dependencies for now
  const user = null;
  const session = null;
  const loading = false;
  const signIn = () => {};
  const signUp = () => {};
  const signOut = () => {};
  const refreshAuth = () => {};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const stats = [
    {
      title: 'Projetos Ativos',
      value: '12',
      change: '+2.1%',
      icon: BarChart3,
      color: 'text-primary',
      bgColor: 'bg-primary-light',
    },
    {
      title: 'Taxa de Sucesso',
      value: '94%',
      change: '+5.2%',
      icon: TrendingUp,
      color: 'text-success',
      bgColor: 'bg-success/10',
    },
    {
      title: 'Membros da Equipe',
      value: '28',
      change: '+12%',
      icon: Users,
      color: 'text-accent',
      bgColor: 'bg-accent-light',
    },
    {
      title: 'Horas Trabalhadas',
      value: '1,247',
      change: '+8.3%',
      icon: Clock,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
    },
  ];

  const recentProjects = [
    {
      id: 1,
      name: 'Sistema de Gestão',
      status: 'active',
      progress: 75,
      team: 5,
      deadline: '2024-02-15',
      priority: 'high',
    },
    {
      id: 2,
      name: 'App Mobile',
      status: 'planning',
      progress: 25,
      team: 3,
      deadline: '2024-03-01',
      priority: 'medium',
    },
    {
      id: 3,
      name: 'Plataforma Web',
      status: 'completed',
      progress: 100,
      team: 8,
      deadline: '2024-01-30',
      priority: 'low',
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success text-success-foreground';
      case 'planning':
        return 'bg-warning text-warning-foreground';
      case 'completed':
        return 'bg-accent text-accent-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive text-destructive-foreground';
      case 'medium':
        return 'bg-warning text-warning-foreground';
      case 'low':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-alpine rounded-2xl p-8 text-primary-foreground shadow-alpine">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Bem-vindo, {user.email?.split('@')[0]}! 👋
            </h1>
            <p className="text-primary-foreground/90 text-lg">
              Vamos analisar seus projetos com inteligência artificial
            </p>
          </div>
          <div className="hidden md:block">
            <Mountain className="h-24 w-24 text-primary-foreground/20" />
          </div>
        </div>
        
        <div className="mt-6 flex items-center space-x-4">
          <Button className="bg-white/20 hover:bg-white/30 text-primary-foreground border border-white/30">
            <Plus className="h-4 w-4 mr-2" />
            Novo Projeto
          </Button>
          <Button variant="ghost" className="text-primary-foreground hover:bg-white/10">
            Ver Relatórios
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.title} className="glass-card hover:shadow-alpine transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <p className="text-sm text-success font-medium mt-1">{stat.change}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Projects Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Projetos Recentes
              <Button variant="ghost" size="sm">
                Ver todos
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </CardTitle>
            <CardDescription>
              Acompanhe o progresso dos seus projetos principais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h4 className="font-medium">{project.name}</h4>
                    <Badge variant="secondary" className={getStatusColor(project.status)}>
                      {project.status}
                    </Badge>
                    <Badge variant="outline" className={getPriorityColor(project.priority)}>
                      {project.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span className="flex items-center">
                      <Users className="h-3 w-3 mr-1" />
                      {project.team} membros
                    </span>
                    <span className="flex items-center">
                      <Clock className="h-3 w-3 mr-1" />
                      {project.deadline}
                    </span>
                  </div>
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>Progresso</span>
                      <span>{project.progress}%</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-gradient-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${project.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mountain className="h-5 w-5 mr-2 text-primary" />
              Insights da IA
            </CardTitle>
            <CardDescription>
              Análises inteligentes dos seus projetos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-success/10 border border-success/20">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-success mt-0.5" />
                <div>
                  <p className="font-medium text-success-foreground">Projeto no prazo</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    O "Sistema de Gestão" está 15% adiantado em relação ao cronograma.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-warning mt-0.5" />
                <div>
                  <p className="font-medium text-warning-foreground">Atenção necessária</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    O "App Mobile" pode precisar de recursos adicionais para cumprir o prazo.
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-primary-light border border-primary/20">
              <div className="flex items-start space-x-3">
                <BarChart3 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Recomendação</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Considere redistribuir 2 membros da equipe do projeto concluído.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
