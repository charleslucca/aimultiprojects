import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, CheckCircle, Shield, Package, GitBranch, Clock } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RepositoryHealthProps {
  integrationId: string | null;
  repositories: any[];
}

interface HealthMetric {
  name: string;
  value: number;
  status: 'healthy' | 'warning' | 'critical';
  description: string;
  icon: React.ReactNode;
}

interface SecurityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  count: number;
}

export const RepositoryHealth: React.FC<RepositoryHealthProps> = ({ integrationId, repositories }) => {
  const [loading, setLoading] = useState(true);
  const [healthScore, setHealthScore] = useState(0);
  const [healthMetrics, setHealthMetrics] = useState<HealthMetric[]>([]);
  const [securityIssues, setSecurityIssues] = useState<SecurityIssue[]>([]);
  const [repoStats, setRepoStats] = useState({
    totalRepositories: 0,
    activeRepositories: 0,
    outdatedRepositories: 0,
    averageAge: 0
  });

  useEffect(() => {
    if (integrationId && repositories.length > 0) {
      analyzeRepositoryHealth();
    }
  }, [integrationId, repositories]);

  const analyzeRepositoryHealth = async () => {
    try {
      setLoading(true);

      // Calculate repository statistics
      const now = new Date();
      const activeRepos = repositories.filter(repo => {
        if (!repo.pushed_at) return false;
        const daysSinceUpdate = differenceInDays(now, parseISO(repo.pushed_at));
        return daysSinceUpdate <= 30;
      });

      const outdatedRepos = repositories.filter(repo => {
        if (!repo.pushed_at) return true;
        const daysSinceUpdate = differenceInDays(now, parseISO(repo.pushed_at));
        return daysSinceUpdate > 90;
      });

      const averageAge = repositories.reduce((sum, repo) => {
        if (!repo.created_at) return sum;
        const age = differenceInDays(now, parseISO(repo.created_at));
        return sum + age;
      }, 0) / repositories.length;

      setRepoStats({
        totalRepositories: repositories.length,
        activeRepositories: activeRepos.length,
        outdatedRepositories: outdatedRepos.length,
        averageAge: Math.round(averageAge)
      });

      // Calculate health metrics
      const metrics: HealthMetric[] = [
        {
          name: 'Atividade Recente',
          value: (activeRepos.length / repositories.length) * 100,
          status: activeRepos.length / repositories.length > 0.7 ? 'healthy' : 
                  activeRepos.length / repositories.length > 0.4 ? 'warning' : 'critical',
          description: `${activeRepos.length} de ${repositories.length} repositórios ativos`,
          icon: <Clock className="h-4 w-4" />
        },
        {
          name: 'Manutenção',
          value: ((repositories.length - outdatedRepos.length) / repositories.length) * 100,
          status: outdatedRepos.length === 0 ? 'healthy' : 
                  outdatedRepos.length < repositories.length * 0.3 ? 'warning' : 'critical',
          description: `${outdatedRepos.length} repositórios desatualizados`,
          icon: <Package className="h-4 w-4" />
        },
        {
          name: 'Diversidade',
          value: Math.min(100, (new Set(repositories.map(r => r.language)).size / repositories.length) * 200),
          status: new Set(repositories.map(r => r.language)).size >= 3 ? 'healthy' : 
                  new Set(repositories.map(r => r.language)).size >= 2 ? 'warning' : 'critical',
          description: `${new Set(repositories.map(r => r.language)).size} linguagens diferentes`,
          icon: <GitBranch className="h-4 w-4" />
        },
        {
          name: 'Segurança',
          value: Math.max(0, 100 - repositories.reduce((sum, r) => sum + r.open_issues_count, 0)),
          status: repositories.reduce((sum, r) => sum + r.open_issues_count, 0) === 0 ? 'healthy' :
                  repositories.reduce((sum, r) => sum + r.open_issues_count, 0) <= 10 ? 'warning' : 'critical',
          description: `${repositories.reduce((sum, r) => sum + r.open_issues_count, 0)} issues abertas`,
          icon: <Shield className="h-4 w-4" />
        }
      ];

      setHealthMetrics(metrics);

      // Calculate overall health score
      const overallScore = metrics.reduce((sum, metric) => sum + metric.value, 0) / metrics.length;
      setHealthScore(Math.round(overallScore));

      // Generate mock security issues (in real scenario, this would come from security scans)
      generateSecurityIssues();

    } catch (error) {
      console.error('Error analyzing repository health:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateSecurityIssues = () => {
    // Mock security issues - in real scenario, this would come from dependency scans, etc.
    const mockIssues: SecurityIssue[] = [
      {
        type: 'Dependências Vulneráveis',
        severity: 'medium' as const,
        description: 'Algumas dependências têm vulnerabilidades conhecidas',
        count: Math.floor(Math.random() * 5)
      },
      {
        type: 'Secrets Expostos',
        severity: 'high' as const,
        description: 'Possíveis chaves de API ou tokens no código',
        count: Math.floor(Math.random() * 2)
      },
      {
        type: 'Configurações Inseguras',
        severity: 'low' as const,
        description: 'Configurações que podem ser melhoradas',
        count: Math.floor(Math.random() * 3)
      }
    ].filter(issue => issue.count > 0);

    setSecurityIssues(mockIssues);
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getHealthScoreLabel = (score: number) => {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    return 'Precisa Atenção';
  };

  const getMetricStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getMetricStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-800 bg-red-100';
      case 'high': return 'text-red-700 bg-red-50';
      case 'medium': return 'text-yellow-700 bg-yellow-50';
      case 'low': return 'text-blue-700 bg-blue-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  if (loading) {
    return <div className="animate-pulse">Analisando saúde dos repositórios...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Health Score Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Pontuação Geral de Saúde</CardTitle>
          <CardDescription>Avaliação geral da saúde dos repositórios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{healthScore}</div>
              <Badge className={getHealthScoreColor(healthScore)}>
                {getHealthScoreLabel(healthScore)}
              </Badge>
            </div>
            <div className="flex-1">
              <Progress value={healthScore} className="w-full h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>0</span>
                <span>50</span>
                <span>100</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Repository Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{repoStats.totalRepositories}</p>
                <p className="text-xs text-muted-foreground">Total Repos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{repoStats.activeRepositories}</p>
                <p className="text-xs text-muted-foreground">Ativos (30d)</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{repoStats.outdatedRepositories}</p>
                <p className="text-xs text-muted-foreground">Desatualizados</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{repoStats.averageAge}d</p>
                <p className="text-xs text-muted-foreground">Idade Média</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas de Saúde</CardTitle>
          <CardDescription>Indicadores detalhados da saúde dos repositórios</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {healthMetrics.map((metric, index) => (
              <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                <div className={getMetricStatusColor(metric.status)}>
                  {metric.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{metric.name}</span>
                    {getMetricStatusIcon(metric.status)}
                  </div>
                  <div className="flex items-center gap-4">
                    <Progress value={metric.value} className="flex-1 h-2" />
                    <span className="text-sm font-medium">{Math.round(metric.value)}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{metric.description}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Security Issues */}
      {securityIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Questões de Segurança</CardTitle>
            <CardDescription>Problemas de segurança identificados nos repositórios</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {securityIssues.map((issue, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Shield className="h-4 w-4 text-red-600" />
                    <div>
                      <h4 className="font-medium">{issue.type}</h4>
                      <p className="text-sm text-muted-foreground">{issue.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getSeverityColor(issue.severity)}>
                      {issue.severity.toUpperCase()}
                    </Badge>
                    <Badge variant="outline">{issue.count}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Repository Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detalhes dos Repositórios</CardTitle>
          <CardDescription>Status individual de cada repositório</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {repositories.map((repo) => {
              const daysSinceUpdate = repo.pushed_at 
                ? differenceInDays(new Date(), parseISO(repo.pushed_at))
                : 999;
              
              const isActive = daysSinceUpdate <= 30;
              const isOutdated = daysSinceUpdate > 90;
              
              return (
                <div key={repo.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={isActive ? 'text-green-600' : isOutdated ? 'text-red-600' : 'text-yellow-600'}>
                      <GitBranch className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="font-medium">{repo.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {repo.language} • Última atualização: {' '}
                        {repo.pushed_at 
                          ? format(parseISO(repo.pushed_at), 'dd/MM/yyyy', { locale: ptBR })
                          : 'Nunca'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{repo.stars_count} ⭐</Badge>
                    <Badge variant="outline">{repo.open_issues_count} issues</Badge>
                    <Badge className={
                      isActive ? 'bg-green-100 text-green-800' :
                      isOutdated ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }>
                      {isActive ? 'Ativo' : isOutdated ? 'Desatualizado' : 'Inativo'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};