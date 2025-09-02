import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GitCommit, TrendingUp, Clock, User } from 'lucide-react';

interface CommitAnalyticsProps {
  integrationId: string | null;
}

interface CommitData {
  date: string;
  commits: number;
  additions: number;
  deletions: number;
  contributors: Set<string> | number;
}

interface ContributorData {
  name: string;
  commits: number;
  additions: number;
  deletions: number;
}

export const CommitAnalytics: React.FC<CommitAnalyticsProps> = ({ integrationId }) => {
  const [loading, setLoading] = useState(true);
  const [commitTimeline, setCommitTimeline] = useState<CommitData[]>([]);
  const [topContributors, setTopContributors] = useState<ContributorData[]>([]);
  const [commitMetrics, setCommitMetrics] = useState({
    avgCommitsPerDay: 0,
    avgLinesChanged: 0,
    mostActiveDay: '',
    totalCodeChurn: 0
  });

  useEffect(() => {
    if (integrationId) {
      loadCommitAnalytics();
    }
  }, [integrationId]);

  const loadCommitAnalytics = async () => {
    if (!integrationId) return;

    try {
      setLoading(true);

      // Get commits from last 30 days
      const thirtyDaysAgo = subDays(new Date(), 30);
      
      const { data: commits, error } = await supabase
        .from('github_commits')
        .select('*')
        .eq('integration_id', integrationId)
        .gte('commit_date', thirtyDaysAgo.toISOString())
        .order('commit_date', { ascending: true });

      if (error) throw error;

      // Process timeline data
      const timelineData = processTimelineData(commits || []);
      setCommitTimeline(timelineData);

      // Process contributor data
      const contributorData = processContributorData(commits || []);
      setTopContributors(contributorData);

      // Calculate metrics
      const metrics = calculateMetrics(commits || [], timelineData);
      setCommitMetrics(metrics);

    } catch (error) {
      console.error('Error loading commit analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const processTimelineData = (commits: any[]): CommitData[] => {
    const timeline = new Map<string, {
      date: string;
      commits: number;
      additions: number;
      deletions: number;
      contributors: Set<string>;
    }>();

    commits.forEach(commit => {
      if (!commit.commit_date) return;
      
      const date = format(parseISO(commit.commit_date), 'yyyy-MM-dd');
      
      if (!timeline.has(date)) {
        timeline.set(date, {
          date: format(parseISO(commit.commit_date), 'dd/MM', { locale: ptBR }),
          commits: 0,
          additions: 0,
          deletions: 0,
          contributors: new Set()
        });
      }

      const dayData = timeline.get(date)!;
      dayData.commits += 1;
      dayData.additions += commit.additions || 0;
      dayData.deletions += commit.deletions || 0;
      
      if (commit.author_name) {
        dayData.contributors.add(commit.author_name);
      }
    });

    return Array.from(timeline.values()).map(day => ({
      ...day,
      contributors: day.contributors.size
    }));
  };

  const processContributorData = (commits: any[]): ContributorData[] => {
    const contributors = new Map<string, ContributorData>();

    commits.forEach(commit => {
      const name = commit.author_name || 'Desconhecido';
      
      if (!contributors.has(name)) {
        contributors.set(name, {
          name,
          commits: 0,
          additions: 0,
          deletions: 0
        });
      }

      const contributor = contributors.get(name)!;
      contributor.commits += 1;
      contributor.additions += commit.additions || 0;
      contributor.deletions += commit.deletions || 0;
    });

    return Array.from(contributors.values())
      .sort((a, b) => b.commits - a.commits)
      .slice(0, 10); // Top 10 contributors
  };

  const calculateMetrics = (commits: any[], timeline: CommitData[]) => {
    const totalCommits = commits.length;
    const totalDays = timeline.length || 1;
    const avgCommitsPerDay = totalCommits / totalDays;

    const totalLinesChanged = commits.reduce((sum, commit) => 
      sum + (commit.additions || 0) + (commit.deletions || 0), 0);
    const avgLinesChanged = totalLinesChanged / totalCommits || 0;

    const mostActiveDay = timeline.reduce((max, day) => 
      day.commits > max.commits ? day : max, { commits: 0, date: 'N/A' });

    const totalCodeChurn = commits.reduce((sum, commit) => 
      sum + Math.abs((commit.additions || 0) - (commit.deletions || 0)), 0);

    return {
      avgCommitsPerDay: Math.round(avgCommitsPerDay * 10) / 10,
      avgLinesChanged: Math.round(avgLinesChanged),
      mostActiveDay: mostActiveDay.date,
      totalCodeChurn
    };
  };

  const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#8884d8', '#82ca9d', '#ffc658'];

  if (loading) {
    return <div className="animate-pulse">Carregando análise de commits...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{commitMetrics.avgCommitsPerDay}</p>
                <p className="text-xs text-muted-foreground">Commits/dia</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <GitCommit className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{commitMetrics.avgLinesChanged}</p>
                <p className="text-xs text-muted-foreground">Linhas/commit</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{commitMetrics.mostActiveDay}</p>
                <p className="text-xs text-muted-foreground">Dia mais ativo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <div>
                <p className="text-2xl font-bold">{commitMetrics.totalCodeChurn}</p>
                <p className="text-xs text-muted-foreground">Code Churn</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Commit Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Atividade de Commits (30 dias)</CardTitle>
          <CardDescription>Evolução diária de commits e alterações de código</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={commitTimeline}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Area 
                type="monotone" 
                dataKey="commits" 
                stackId="1"
                stroke="hsl(var(--primary))" 
                fill="hsl(var(--primary))"
                fillOpacity={0.3}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lines Changed Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Alterações de Código</CardTitle>
            <CardDescription>Adições vs. Remoções por dia</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={commitTimeline}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="additions" fill="#22c55e" name="Adições" />
                <Bar dataKey="deletions" fill="#ef4444" name="Remoções" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Contributors */}
        <Card>
          <CardHeader>
            <CardTitle>Top Contribuidores</CardTitle>
            <CardDescription>Desenvolvedores mais ativos</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={topContributors.slice(0, 6)}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="commits"
                  label={(entry) => `${entry.name}: ${entry.commits}`}
                >
                  {topContributors.slice(0, 6).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};