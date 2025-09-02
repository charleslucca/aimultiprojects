import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GitBranch, GitCommit, GitPullRequest, Users, Code, Activity, Star, GitFork } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CommitAnalytics } from './CommitAnalytics';
import { PullRequestInsights } from './PullRequestInsights';
import { CodeQualityCharts } from './CodeQualityCharts';
import { RepositoryHealth } from './RepositoryHealth';

interface GitHubBoardProps {
  projectId: string;
}

interface GitHubRepository {
  id: string;
  name: string;
  full_name: string;
  description?: string;
  language?: string;
  stars_count: number;
  forks_count: number;
  open_issues_count: number;
  size_kb: number;
  synced_at: string;
}

interface GitHubMetrics {
  totalCommits: number;
  totalPullRequests: number;
  totalContributors: number;
  openPRs: number;
  mergedPRs: number;
  recentActivity: number;
}

export const GitHubBoard: React.FC<GitHubBoardProps> = ({ projectId }) => {
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [metrics, setMetrics] = useState<GitHubMetrics>({
    totalCommits: 0,
    totalPullRequests: 0,
    totalContributors: 0,
    openPRs: 0,
    mergedPRs: 0,
    recentActivity: 0
  });
  const [integrationId, setIntegrationId] = useState<string | null>(null);

  useEffect(() => {
    if (projectId) {
      loadGitHubData();
    }
  }, [projectId]);

  const loadGitHubData = async () => {
    try {
      setLoading(true);
      
      // Get GitHub integration
      const { data: integrations, error: integrationError } = await supabase
        .from('project_integrations')
        .select('*')
        .eq('project_id', projectId)
        .eq('integration_type', 'github')
        .eq('is_active', true);

      if (integrationError) throw integrationError;

      if (!integrations || integrations.length === 0) {
        setLoading(false);
        return;
      }

      const integration = integrations[0];
      setIntegrationId(integration.id);

      // Load repositories
      const { data: repos, error: reposError } = await supabase
        .from('github_repositories')
        .select('*')
        .eq('integration_id', integration.id);

      if (reposError) throw reposError;
      setRepositories(repos || []);

      // Load metrics from all repositories
      await loadMetrics(integration.id);

    } catch (error) {
      console.error('Error loading GitHub data:', error);
      toast.error('Erro ao carregar dados do GitHub');
    } finally {
      setLoading(false);
    }
  };

  const loadMetrics = async (integrationId: string) => {
    try {
      // Get commits count
      const { count: commitsCount } = await supabase
        .from('github_commits')
        .select('*', { count: 'exact', head: true })
        .eq('integration_id', integrationId);

      // Get pull requests data
      const { data: prs } = await supabase
        .from('github_pull_requests')
        .select('state, merged')
        .eq('integration_id', integrationId);

      // Get contributors count
      const { count: contributorsCount } = await supabase
        .from('github_contributors')
        .select('*', { count: 'exact', head: true })
        .eq('integration_id', integrationId);

      // Get recent activity (commits from last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { count: recentCommits } = await supabase
        .from('github_commits')
        .select('*', { count: 'exact', head: true })
        .eq('integration_id', integrationId)
        .gte('commit_date', weekAgo.toISOString());

      const openPRs = prs?.filter(pr => pr.state === 'open').length || 0;
      const mergedPRs = prs?.filter(pr => pr.merged).length || 0;

      setMetrics({
        totalCommits: commitsCount || 0,
        totalPullRequests: prs?.length || 0,
        totalContributors: contributorsCount || 0,
        openPRs,
        mergedPRs,
        recentActivity: recentCommits || 0
      });

    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  };

  const handleSync = async () => {
    if (!integrationId) return;

    try {
      setSyncing(true);
      toast.info('Iniciando sincronização do GitHub...');

      const { data, error } = await supabase.functions.invoke('github-sync', {
        body: { integrationId }
      });

      if (error) throw error;

      toast.success('Sincronização concluída com sucesso!');
      await loadGitHubData(); // Reload data
      
    } catch (error) {
      console.error('Sync error:', error);
      toast.error('Erro na sincronização do GitHub');
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return <div className="animate-pulse">Carregando dados do GitHub...</div>;
  }

  if (repositories.length === 0) {
    return (
      <div className="text-center py-8">
        <Code className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Nenhum repositório encontrado</h3>
        <p className="text-sm text-muted-foreground">
          Configure uma integração GitHub para ver os insights de código.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">GitHub Insights</h2>
          <p className="text-muted-foreground">
            Análise e métricas dos repositórios de código
          </p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          {syncing ? (
            <>
              <Activity className="h-4 w-4 mr-2 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <GitBranch className="h-4 w-4 mr-2" />
              Sincronizar
            </>
          )}
        </Button>
      </div>

      {/* Repository Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {repositories.map((repo) => (
          <Card key={repo.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{repo.name}</CardTitle>
              <CardDescription>{repo.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {repo.language && (
                  <Badge variant="secondary">{repo.language}</Badge>
                )}
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {repo.stars_count}
                </div>
                <div className="flex items-center gap-1">
                  <GitFork className="h-3 w-3" />
                  {repo.forks_count}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <GitCommit className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{metrics.totalCommits}</p>
                <p className="text-xs text-muted-foreground">Total Commits</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{metrics.totalPullRequests}</p>
                <p className="text-xs text-muted-foreground">Pull Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{metrics.totalContributors}</p>
                <p className="text-xs text-muted-foreground">Contribuidores</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{metrics.openPRs}</p>
                <p className="text-xs text-muted-foreground">PRs Abertas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{metrics.mergedPRs}</p>
                <p className="text-xs text-muted-foreground">PRs Merged</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-2xl font-bold">{metrics.recentActivity}</p>
                <p className="text-xs text-muted-foreground">Commits (7d)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Insights */}
      <Tabs defaultValue="commits" className="space-y-4">
        <TabsList>
          <TabsTrigger value="commits">Commits</TabsTrigger>
          <TabsTrigger value="pullrequests">Pull Requests</TabsTrigger>
          <TabsTrigger value="quality">Qualidade</TabsTrigger>
          <TabsTrigger value="health">Saúde do Repo</TabsTrigger>
        </TabsList>

        <TabsContent value="commits">
          <CommitAnalytics integrationId={integrationId} />
        </TabsContent>

        <TabsContent value="pullrequests">
          <PullRequestInsights integrationId={integrationId} />
        </TabsContent>

        <TabsContent value="quality">
          <CodeQualityCharts integrationId={integrationId} />
        </TabsContent>

        <TabsContent value="health">
          <RepositoryHealth integrationId={integrationId} repositories={repositories} />
        </TabsContent>
      </Tabs>
    </div>
  );
};