import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { Code2, AlertTriangle, Shield, TrendingUp, FileText, Bug } from 'lucide-react';

interface CodeQualityChartsProps {
  integrationId: string | null;
}

interface QualityMetric {
  metric_type: string;
  metric_value: number;
  metric_data: any;
  measured_at: string;
}

interface QualityTrend {
  date: string;
  complexity: number;
  maintainability: number;
  testCoverage: number;
  technicalDebt: number;
}

export const CodeQualityCharts: React.FC<CodeQualityChartsProps> = ({ integrationId }) => {
  const [loading, setLoading] = useState(true);
  const [qualityMetrics, setQualityMetrics] = useState({
    linesOfCode: 0,
    complexity: 0,
    maintainability: 75,
    testCoverage: 0,
    technicalDebt: 0,
    codeSmells: 0
  });
  const [qualityTrends, setQualityTrends] = useState<QualityTrend[]>([]);
  const [codeAnalysis, setCodeAnalysis] = useState({
    duplicatedLines: 0,
    cyclomaticComplexity: 0,
    cognitiveComplexity: 0,
    securityIssues: 0
  });

  useEffect(() => {
    if (integrationId) {
      loadCodeQuality();
    }
  }, [integrationId]);

  const loadCodeQuality = async () => {
    if (!integrationId) return;

    try {
      setLoading(true);

      // Get code metrics
      const { data: metrics, error } = await supabase
        .from('github_code_metrics')
        .select('*')
        .eq('integration_id', integrationId)
        .order('measured_at', { ascending: false });

      if (error) throw error;

      // Process current metrics
      processCurrentMetrics(metrics || []);

      // Process trends
      const trends = processTrends(metrics || []);
      setQualityTrends(trends);

      // Simulate code analysis (in a real scenario, this would come from static analysis tools)
      generateCodeAnalysis();

    } catch (error) {
      console.error('Error loading code quality:', error);
    } finally {
      setLoading(false);
    }
  };

  const processCurrentMetrics = (metrics: QualityMetric[]) => {
    const latestMetrics = {
      linesOfCode: 0,
      complexity: 0,
      maintainability: 75,
      testCoverage: 0,
      technicalDebt: 0,
      codeSmells: 0
    };

    // Get the latest value for each metric type
    const metricTypes = ['lines_of_code', 'complexity', 'test_coverage', 'technical_debt'];
    
    metricTypes.forEach(type => {
      const latestMetric = metrics.find(m => m.metric_type === type);
      if (latestMetric) {
        switch (type) {
          case 'lines_of_code':
            latestMetrics.linesOfCode = latestMetric.metric_value;
            break;
          case 'complexity':
            latestMetrics.complexity = latestMetric.metric_value;
            break;
          case 'test_coverage':
            latestMetrics.testCoverage = latestMetric.metric_value;
            break;
          case 'technical_debt':
            latestMetrics.technicalDebt = latestMetric.metric_value;
            break;
        }
      }
    });

    // Calculate derived metrics
    latestMetrics.maintainability = Math.max(0, 100 - (latestMetrics.complexity * 2) - (latestMetrics.technicalDebt / 1000));
    latestMetrics.codeSmells = Math.floor(latestMetrics.linesOfCode / 1000) + Math.floor(latestMetrics.complexity / 10);

    setQualityMetrics(latestMetrics);
  };

  const processTrends = (metrics: QualityMetric[]): QualityTrend[] => {
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    return last30Days.map((date, index) => {
      // Simulate trend data - in real scenario, this would come from historical metrics
      const baseComplexity = 15;
      const baseMaintainability = 75;
      const baseTestCoverage = 60;
      const baseTechnicalDebt = 200;

      return {
        date: `${String(index + 1).padStart(2, '0')}/11`,
        complexity: baseComplexity + Math.sin(index / 5) * 3 + Math.random() * 2,
        maintainability: baseMaintainability + Math.cos(index / 7) * 10 + Math.random() * 5,
        testCoverage: baseTestCoverage + Math.sin(index / 3) * 15 + Math.random() * 3,
        technicalDebt: baseTechnicalDebt + index * 2 + Math.random() * 10
      };
    });
  };

  const generateCodeAnalysis = () => {
    // Simulate code analysis results
    setCodeAnalysis({
      duplicatedLines: Math.floor(Math.random() * 500) + 100,
      cyclomaticComplexity: Math.floor(Math.random() * 20) + 10,
      cognitiveComplexity: Math.floor(Math.random() * 25) + 15,
      securityIssues: Math.floor(Math.random() * 5)
    });
  };

  const getQualityScore = (value: number, type: 'maintainability' | 'coverage' | 'complexity') => {
    switch (type) {
      case 'maintainability':
        if (value >= 80) return 'high';
        if (value >= 60) return 'medium';
        return 'low';
      case 'coverage':
        if (value >= 80) return 'high';
        if (value >= 60) return 'medium';
        return 'low';
      case 'complexity':
        if (value <= 10) return 'high';
        if (value <= 20) return 'medium';
        return 'low';
      default:
        return 'medium';
    }
  };

  const getScoreColor = (score: string) => {
    switch (score) {
      case 'high': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getScoreLabel = (score: string) => {
    switch (score) {
      case 'high': return 'Excelente';
      case 'medium': return 'Bom';
      case 'low': return 'Crítico';
      default: return 'N/A';
    }
  };

  if (loading) {
    return <div className="animate-pulse">Carregando métricas de qualidade...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Quality Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Manutenibilidade</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{Math.round(qualityMetrics.maintainability)}%</span>
                <Badge className={getScoreColor(getQualityScore(qualityMetrics.maintainability, 'maintainability'))}>
                  {getScoreLabel(getQualityScore(qualityMetrics.maintainability, 'maintainability'))}
                </Badge>
              </div>
              <Progress value={qualityMetrics.maintainability} className="w-full" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Cobertura de Testes</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{Math.round(qualityMetrics.testCoverage)}%</span>
                <Badge className={getScoreColor(getQualityScore(qualityMetrics.testCoverage, 'coverage'))}>
                  {getScoreLabel(getQualityScore(qualityMetrics.testCoverage, 'coverage'))}
                </Badge>
              </div>
              <Progress value={qualityMetrics.testCoverage} className="w-full" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-2">
              <Code2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Complexidade</span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">{Math.round(qualityMetrics.complexity)}</span>
                <Badge className={getScoreColor(getQualityScore(qualityMetrics.complexity, 'complexity'))}>
                  {getScoreLabel(getQualityScore(qualityMetrics.complexity, 'complexity'))}
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">Menor é melhor</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quality Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Tendências de Qualidade (30 dias)</CardTitle>
          <CardDescription>Evolução das métricas de qualidade do código</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={qualityTrends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="maintainability" 
                stroke="hsl(var(--primary))" 
                name="Manutenibilidade %" 
              />
              <Line 
                type="monotone" 
                dataKey="testCoverage" 
                stroke="#22c55e" 
                name="Cobertura %" 
              />
              <Line 
                type="monotone" 
                dataKey="complexity" 
                stroke="#ef4444" 
                name="Complexidade" 
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Technical Debt */}
        <Card>
          <CardHeader>
            <CardTitle>Débito Técnico</CardTitle>
            <CardDescription>Evolução do débito técnico ao longo do tempo</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={qualityTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="technicalDebt" 
                  stroke="#f59e0b" 
                  fill="#f59e0b"
                  fillOpacity={0.3}
                  name="Horas de débito"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Code Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Análise de Código</CardTitle>
            <CardDescription>Identificação de problemas e padrões</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span>Code Smells</span>
                </div>
                <Badge variant="outline">{qualityMetrics.codeSmells}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-blue-600" />
                  <span>Linhas Duplicadas</span>
                </div>
                <Badge variant="outline">{codeAnalysis.duplicatedLines}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                  <span>Complexidade Ciclomática</span>
                </div>
                <Badge variant="outline">{codeAnalysis.cyclomaticComplexity}</Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bug className="h-4 w-4 text-red-600" />
                  <span>Problemas de Segurança</span>
                </div>
                <Badge 
                  className={codeAnalysis.securityIssues > 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}
                >
                  {codeAnalysis.securityIssues}
                </Badge>
              </div>

              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Linhas de Código</span>
                  <span className="text-lg font-bold">{qualityMetrics.linesOfCode.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};