import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GitPullRequest, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface PullRequestInsightsProps {
  integrationId: string | null;
}

interface PRMetrics {
  totalPRs: number;
  openPRs: number;
  mergedPRs: number;
  closedPRs: number;
  avgTimeToMerge: number;
  mergeRate: number;
}

interface PRTrend {
  date: string;
  opened: number;
  merged: number;
  closed: number;
}

interface PRAuthor {
  author: string;
  total: number;
  merged: number;
  mergeRate: number;
}

export const PullRequestInsights: React.FC<PullRequestInsightsProps> = ({ integrationId }) => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<PRMetrics>({
    totalPRs: 0,
    openPRs: 0,
    mergedPRs: 0,
    closedPRs: 0,
    avgTimeToMerge: 0,
    mergeRate: 0
  });
  const [trends, setTrends] = useState<PRTrend[]>([]);
  const [authors, setAuthors] = useState<PRAuthor[]>([]);
  const [recentPRs, setRecentPRs] = useState<any[]>([]);

  useEffect(() => {
    if (integrationId) {
      loadPRInsights();
    }
  }, [integrationId]);

  const loadPRInsights = async () => {
    if (!integrationId) return;

    try {
      setLoading(true);

      // Get all PRs
      const { data: prs, error } = await supabase
        .from('github_pull_requests')
        .select('*')
        .eq('integration_id', integrationId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const prData = prs || [];

      // Calculate metrics
      const totalPRs = prData.length;
      const openPRs = prData.filter(pr => pr.state === 'open').length;
      const mergedPRs = prData.filter(pr => pr.merged).length;
      const closedPRs = prData.filter(pr => pr.state === 'closed' && !pr.merged).length;
      
      // Calculate average time to merge
      const mergedWithTimes = prData.filter(pr => pr.merged && pr.merged_at && pr.created_at);
      const avgTimeToMerge = mergedWithTimes.length > 0 
        ? mergedWithTimes.reduce((sum, pr) => {
            const hours = differenceInHours(parseISO(pr.merged_at), parseISO(pr.created_at));
            return sum + hours;
          }, 0) / mergedWithTimes.length
        : 0;

      const mergeRate = totalPRs > 0 ? (mergedPRs / totalPRs) * 100 : 0;

      setMetrics({
        totalPRs,
        openPRs,
        mergedPRs,
        closedPRs,
        avgTimeToMerge: Math.round(avgTimeToMerge),
        mergeRate: Math.round(mergeRate * 10) / 10
      });

      // Process trends (last 30 days)
      const trendsData = processTrends(prData);
      setTrends(trendsData);

      // Process authors
      const authorsData = processAuthors(prData);
      setAuthors(authorsData);

      // Recent PRs (last 10)
      setRecentPRs(prData.slice(0, 10));

    } catch (error) {
      console.error('Error loading PR insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const processTrends = (prs: any[]): PRTrend[] => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return format(date, 'yyyy-MM-dd');
    }).reverse();

    return last30Days.map(date => {
      const dayPRs = prs.filter(pr => {
        const prDate = format(parseISO(pr.created_at), 'yyyy-MM-dd');
        return prDate === date;
      });

      return {
        date: format(parseISO(date), 'dd/MM', { locale: ptBR }),
        opened: dayPRs.length,
        merged: dayPRs.filter(pr => pr.merged && format(parseISO(pr.merged_at || pr.created_at), 'yyyy-MM-dd') === date).length,
        closed: dayPRs.filter(pr => pr.state === 'closed' && !pr.merged && format(parseISO(pr.closed_at || pr.created_at), 'yyyy-MM-dd') === date).length
      };
    });
  };

  const processAuthors = (prs: any[]): PRAuthor[] => {
    const authorMap = new Map<string, { total: number; merged: number }>();

    prs.forEach(pr => {
      const author = pr.author_login || 'Desconhecido';
      if (!authorMap.has(author)) {
        authorMap.set(author, { total: 0, merged: 0 });
      }
      const authorData = authorMap.get(author)!;
      authorData.total += 1;
      if (pr.merged) {
        authorData.merged += 1;
      }
    });

    return Array.from(authorMap.entries())
      .map(([author, data]) => ({
        author,
        total: data.total,
        merged: data.merged,
        mergeRate: data.total > 0 ? (data.merged / data.total) * 100 : 0
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  };

  const getPRStateIcon = (pr: any) => {
    if (pr.merged) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (pr.state === 'open') return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getPRStateBadge = (pr: any) => {
    if (pr.merged) return <Badge className="bg-green-100 text-green-800">Merged</Badge>;
    if (pr.state === 'open') return <Badge className="bg-yellow-100 text-yellow-800">Aberta</Badge>;
    return <Badge className="bg-red-100 text-red-800">Fechada</Badge>;
  };

  const COLORS = ['hsl(var(--primary))', '#22c55e', '#ef4444', '#f59e0b'];

  if (loading) {
    return <div className="animate-pulse">Carregando insights de Pull Requests...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <GitPullRequest className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{metrics.totalPRs}</p>
                <p className="text-xs text-muted-foreground">Total PRs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{metrics.avgTimeToMerge}h</p>
                <p className="text-xs text-muted-foreground">Tempo médio</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold">{metrics.mergeRate}%</p>
                <p className="text-xs text-muted-foreground">Taxa de merge</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">{metrics.openPRs}</p>
                <p className="text-xs text-muted-foreground">PRs abertas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PR Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Tendências de Pull Requests (30 dias)</CardTitle>
          <CardDescription>Evolução diária de abertura, merge e fechamento</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="opened" stroke="hsl(var(--primary))" name="Abertas" />
              <Line type="monotone" dataKey="merged" stroke="#22c55e" name="Merged" />
              <Line type="monotone" dataKey="closed" stroke="#ef4444" name="Fechadas" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Authors Performance */}
        <Card>
          <CardHeader>
            <CardTitle>Performance dos Autores</CardTitle>
            <CardDescription>PRs criadas e taxa de merge por autor</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={authors.slice(0, 8)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="author" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="total" fill="hsl(var(--primary))" name="Total PRs" />
                <Bar dataKey="merged" fill="#22c55e" name="Merged" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* PR Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Status</CardTitle>
            <CardDescription>Estado atual das Pull Requests</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Abertas', value: metrics.openPRs, fill: '#f59e0b' },
                    { name: 'Merged', value: metrics.mergedPRs, fill: '#22c55e' },
                    { name: 'Fechadas', value: metrics.closedPRs, fill: '#ef4444' }
                  ]}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={(entry) => `${entry.name}: ${entry.value}`}
                >
                  {[0, 1, 2].map((index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent PRs */}
      <Card>
        <CardHeader>
          <CardTitle>Pull Requests Recentes</CardTitle>
          <CardDescription>Últimas PRs criadas ou atualizadas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentPRs.map((pr) => (
              <div key={pr.id} className="flex items-center gap-4 p-3 border rounded-lg">
                {getPRStateIcon(pr)}
                <div className="flex-1">
                  <h4 className="font-medium">{pr.title}</h4>
                  <p className="text-sm text-muted-foreground">
                    #{pr.number} • por {pr.author_login} • {format(parseISO(pr.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {getPRStateBadge(pr)}
                  {pr.base_branch && pr.head_branch && (
                    <Badge variant="outline">
                      {pr.head_branch} → {pr.base_branch}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};