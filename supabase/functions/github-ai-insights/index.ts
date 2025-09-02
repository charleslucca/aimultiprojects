import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  // Implement function timeout (40 seconds for individual insights, 60 for all)
  const isGenerateAll = (await req.clone().json()).action === 'generate_github_insights';
  const timeoutMs = isGenerateAll ? 60000 : 30000;
  
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`Function timeout: Operation exceeded ${timeoutMs/1000} seconds`)), timeoutMs)
  );

  const workPromise = async () => {
    try {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
      if (!openAIApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      const { action, integration_id, project_id } = await req.json();
      
      console.log('Received GitHub AI insights request:', { action, integration_id, project_id, timestamp: new Date().toISOString() });

      if (action === 'security_analysis') {
        const insights = await performSecurityAnalysis(supabaseClient, openAIApiKey, integration_id, project_id);
        return new Response(JSON.stringify({ insights }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'code_quality_assessment') {
        const insights = await performCodeQualityAssessment(supabaseClient, openAIApiKey, integration_id, project_id);
        return new Response(JSON.stringify({ insights }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'test_coverage_analysis') {
        const insights = await performTestCoverageAnalysis(supabaseClient, openAIApiKey, integration_id, project_id);
        return new Response(JSON.stringify({ insights }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'performance_insights') {
        const insights = await performPerformanceAnalysis(supabaseClient, openAIApiKey, integration_id, project_id);
        return new Response(JSON.stringify({ insights }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'pipeline_health') {
        const insights = await performPipelineHealthAnalysis(supabaseClient, openAIApiKey, integration_id, project_id);
        return new Response(JSON.stringify({ insights }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'dev_performance') {
        const insights = await performDevPerformanceAnalysis(supabaseClient, openAIApiKey, integration_id, project_id);
        return new Response(JSON.stringify({ insights }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'release_prediction') {
        const insights = await performReleasePredictionAnalysis(supabaseClient, openAIApiKey, integration_id, project_id);
        return new Response(JSON.stringify({ insights }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (action === 'generate_github_insights') {
        const results = await generateAllGitHubInsights(supabaseClient, openAIApiKey, integration_id, project_id);
        return new Response(JSON.stringify({ results }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Error in github-ai-insights function after ${duration}ms:`, error);
      return new Response(JSON.stringify({ 
        error: error.message,
        duration_ms: duration,
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  };

  try {
    const result = await Promise.race([workPromise(), timeoutPromise]);
    const duration = Date.now() - startTime;
    console.log(`GitHub AI insights function completed successfully in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`GitHub AI insights function failed after ${duration}ms:`, error);
    return new Response(JSON.stringify({ 
      error: error.message,
      duration_ms: duration,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// Generate all GitHub insights for a project with delay between calls
async function generateAllGitHubInsights(supabaseClient: any, openAIApiKey: string, integrationId: string, projectId: string) {
  console.log('🚀 Starting GitHub insights generation for:', { integrationId, projectId });
  
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  
  const insights = [
    { name: 'Security Analysis', func: performSecurityAnalysis },
    { name: 'Code Quality Assessment', func: performCodeQualityAssessment },
    { name: 'Test Coverage Analysis', func: performTestCoverageAnalysis },
    { name: 'Performance Analysis', func: performPerformanceAnalysis },
    { name: 'Pipeline Health Analysis', func: performPipelineHealthAnalysis },
    { name: 'Development Performance Analysis', func: performDevPerformanceAnalysis },
    { name: 'Release Prediction Analysis', func: performReleasePredictionAnalysis }
  ];
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const insight of insights) {
    try {
      console.log(`📊 Starting ${insight.name}...`);
      const startTime = Date.now();
      
      await insight.func(supabaseClient, openAIApiKey, integrationId, projectId);
      
      const duration = Date.now() - startTime;
      console.log(`✅ ${insight.name} completed in ${duration}ms`);
      successCount++;
      
      await delay(1000);
    } catch (error) {
      console.error(`❌ Error in ${insight.name}:`, error);
      errorCount++;
      // Continue with other insights even if one fails
    }
  }
  
  console.log(`🎯 GitHub insights generation completed. Success: ${successCount}, Errors: ${errorCount}`);
  
  if (successCount === 0) {
    throw new Error(`All GitHub insights failed to generate. Check logs for details.`);
  }
  
  return { success: true, generated: successCount, failed: errorCount };
}

// Security Analysis
async function performSecurityAnalysis(supabaseClient: any, openAIApiKey: string, integrationId: string, projectId: string) {
  console.log('🔒 Starting security analysis...');
  
  try {
    // Fetch repositories
    console.log('📦 Fetching repositories for integration:', integrationId);
    const { data: repositories, error: repoError } = await supabaseClient
      .from('github_repositories')
      .select('*')
      .eq('integration_id', integrationId);

    if (repoError) {
      console.error('❌ Error fetching repositories:', repoError);
      throw repoError;
    }
    console.log(`📦 Found ${repositories?.length || 0} repositories`);

    // Fetch recent commits (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    console.log('💾 Fetching recent commits...');
    const { data: commits, error: commitsError } = await supabaseClient
      .from('github_commits')
      .select('*')
      .eq('integration_id', integrationId)
      .gte('commit_date', thirtyDaysAgo.toISOString())
      .order('commit_date', { ascending: false })
      .limit(100);

    if (commitsError) {
      console.error('❌ Error fetching commits:', commitsError);
      throw commitsError;
    }
    console.log(`💾 Found ${commits?.length || 0} recent commits`);

    // Fetch pull requests
    console.log('🔀 Fetching pull requests...');
    const { data: pullRequests, error: prError } = await supabaseClient
      .from('github_pull_requests')
      .select('*')
      .eq('integration_id', integrationId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (prError) {
      console.error('❌ Error fetching pull requests:', prError);
      throw prError;
    }
    console.log(`🔀 Found ${pullRequests?.length || 0} pull requests`);

    // Check if we have enough data
    if (!repositories?.length && !commits?.length && !pullRequests?.length) {
      console.log('⚠️ No data available for security analysis');
      throw new Error('No GitHub data available for security analysis');
    }

    const analysisData = {
      repositories: repositories?.map(r => ({
        name: r.name,
        language: r.language,
        size_kb: r.size_kb,
        open_issues: r.open_issues_count
      })) || [],
      recent_commits: commits?.map(c => ({
        message: c.message,
        author: c.author_name,
        files_changed: c.changed_files,
        additions: c.additions,
        deletions: c.deletions
      })) || [],
      pull_requests: pullRequests?.map(pr => ({
        title: pr.title,
        state: pr.state,
        mergeable: pr.mergeable,
        base_branch: pr.base_branch,
        head_branch: pr.head_branch
      })) || []
    };

    const prompt = `
      Analise os dados do repositório GitHub para identificar riscos de segurança:

      Repositórios: ${JSON.stringify(analysisData.repositories)}
      Commits Recentes: ${JSON.stringify(analysisData.recent_commits.slice(0, 10))}
      Pull Requests: ${JSON.stringify(analysisData.pull_requests.slice(0, 10))}

      Identifique:
      1. VULNERABILIDADES CRÍTICAS: Credenciais expostas, secrets em código, dependências desatualizadas
      2. RISCOS DE CÓDIGO: Padrões perigosos, código não revisado, alterações sensíveis
      3. PROCESSO: Falta de revisão de código, merges diretos na main, branches desprotegidas
      4. ALERTAS DE DEPENDÊNCIAS: Bibliotecas com vulnerabilidades conhecidas

      Responda em JSON válido com:
      {
        "security_score": 0.0-1.0,
        "critical_alerts": [
          {
            "type": "credential_exposure|vulnerable_dependency|unsafe_code|process_violation",
            "severity": "CRITICAL|HIGH|MEDIUM|LOW",
            "title": "Título do alerta",
            "description": "Descrição detalhada",
            "affected_files": ["arquivo1.js", "arquivo2.py"],
            "recommendations": ["ação1", "ação2"]
          }
        ],
        "vulnerabilities_found": number,
        "recommendations": ["recomendação1", "recomendação2"]
      }
    `;

    console.log('🤖 Calling OpenAI for security analysis...');
    const analysis = await callOpenAI(openAIApiKey, prompt, 'Você é um especialista em segurança de código.');
    console.log('🤖 OpenAI analysis received:', { hasData: !!analysis, keys: Object.keys(analysis || {}) });

    const executiveSummary = generateSecuritySummary(analysis);
    console.log('📋 Generated executive summary:', executiveSummary?.substring(0, 100) + '...');

    // Store the insight in the database
    console.log('💾 Storing security analysis in database...');
    const insertData = {
      project_id: projectId,
      insight_type: 'github_security',
      confidence_score: analysis.security_score || 0.8,
      insight_data: {
        ...analysis,
        analysis_type: 'security',
        repositories_analyzed: repositories.length,
        commits_analyzed: commits?.length || 0,
        prs_analyzed: pullRequests?.length || 0
      },
      executive_summary: executiveSummary,
      alert_category: analysis.critical_alerts?.length > 0 ? 'SECURITY' : 'GENERAL',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };
    console.log('💾 Insert data prepared:', { ...insertData, insight_data: 'REDACTED', executive_summary: 'REDACTED' });

    const { data: insertResult, error } = await supabaseClient
      .from('jira_ai_insights')
      .insert(insertData)
      .select();

    if (error) {
      console.error('❌ Error storing security analysis:', error);
      throw error;
    }

    console.log('✅ Security analysis stored successfully:', { insertId: insertResult?.[0]?.id });
    console.log('🔒 Security analysis completed');
    
    return analysis;
  } catch (error) {
    console.error('❌ Security analysis failed:', error);
    throw error;
  }
}

// Code Quality Assessment
async function performCodeQualityAssessment(supabaseClient: any, openAIApiKey: string, integrationId: string, projectId: string) {
  console.log('Starting code quality assessment...');

  // Get repositories and recent commits
  const { data: repositories } = await supabaseClient
    .from('github_repositories')
    .select('*')
    .eq('integration_id', integrationId);

  const { data: commits } = await supabaseClient
    .from('github_commits')
    .select('*')
    .eq('integration_id', integrationId)
    .order('commit_date', { ascending: false })
    .limit(100);

  const { data: contributors } = await supabaseClient
    .from('github_contributors')
    .select('*')
    .eq('integration_id', integrationId)
    .order('contributions', { ascending: false });

  const analysisData = {
    repositories: repositories?.map(r => ({
      name: r.name,
      language: r.language,
      size_kb: r.size_kb,
      stars: r.stars_count,
      forks: r.forks_count
    })) || [],
    commits: commits?.map(c => ({
      message: c.message,
      additions: c.additions,
      deletions: c.deletions,
      files_changed: c.changed_files
    })) || [],
    contributors: contributors?.slice(0, 10) || []
  };

  const prompt = `
    Analise a qualidade do código baseado nos dados do GitHub:

    Repositórios: ${JSON.stringify(analysisData.repositories)}
    Últimos Commits: ${JSON.stringify(analysisData.commits.slice(0, 20))}
    Contribuidores: ${JSON.stringify(analysisData.contributors)}

    Avalie:
    1. TECHNICAL DEBT: Commits grandes, refactoring necessário, código complexo
    2. PADRÕES DE CÓDIGO: Consistência, convenções, estrutura
    3. MANUTENIBILIDADE: Frequência de alterações, tamanho de commits, modularidade
    4. COLABORAÇÃO: Distribuição de contribuições, reviews de código

    Responda em JSON com:
    {
      "quality_score": 0.0-1.0,
      "technical_debt_score": 0.0-1.0,
      "maintainability_score": 0.0-1.0,
      "critical_issues": [
        {
          "type": "technical_debt|code_smell|maintainability|collaboration",
          "severity": "CRITICAL|HIGH|MEDIUM|LOW",
          "title": "Título do problema",
          "description": "Descrição",
          "impact": "Impacto no projeto",
          "recommendations": ["solução1", "solução2"]
        }
      ],
      "improvements": ["melhoria1", "melhoria2"]
    }
  `;

  try {
    const analysis = await callOpenAI(openAIApiKey, prompt, 'Você é um arquiteto de software sênior.');

    await supabaseClient
      .from('jira_ai_insights')
      .insert({
        project_id: projectId,
        insight_type: 'github_quality',
        confidence_score: analysis.quality_score || 0.7,
        insight_data: {
          ...analysis,
          analysis_type: 'code_quality',
          repositories_count: repositories?.length || 0,
          commits_analyzed: commits?.length || 0
        },
        executive_summary: generateQualitySummary(analysis),
        alert_category: analysis.critical_issues?.length > 0 ? 'QUALITY' : 'GENERAL',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

    console.log('Code quality assessment completed');
    return analysis;
  } catch (error) {
    console.error('Error in code quality assessment:', error);
    throw error;
  }
}

// Test Coverage Analysis
async function performTestCoverageAnalysis(supabaseClient: any, openAIApiKey: string, integrationId: string, projectId: string) {
  console.log('Starting test coverage analysis...');

  const { data: commits } = await supabaseClient
    .from('github_commits')
    .select('*')
    .eq('integration_id', integrationId)
    .order('commit_date', { ascending: false })
    .limit(100);

  // Analyze commit messages for test-related patterns
  const testCommits = commits?.filter(c => 
    /test|spec|jest|mocha|cypress|junit/i.test(c.message)
  ) || [];

  const prompt = `
    Analise a cobertura e qualidade de testes baseado nos commits:

    Total de Commits: ${commits?.length || 0}
    Commits Relacionados a Testes: ${testCommits.length}
    
    Commits de Teste: ${JSON.stringify(testCommits.slice(0, 10).map(c => c.message))}
    Commits Recentes: ${JSON.stringify(commits?.slice(0, 20).map(c => c.message) || [])}

    Identifique:
    1. COBERTURA DE TESTES: Frequência de commits de teste vs código
    2. PADRÕES DE TESTE: Tipos de teste identificados, frameworks
    3. RISCOS: Código sem testes, áreas críticas descobertas
    4. QUALIDADE: Testes automatizados, integração contínua

    Responda em JSON:
    {
      "test_coverage_estimated": 0.0-1.0,
      "testing_maturity": "BAIXA|MÉDIA|ALTA",
      "test_to_code_ratio": 0.0-1.0,
      "critical_gaps": [
        {
          "type": "missing_tests|failing_tests|outdated_tests",
          "severity": "CRITICAL|HIGH|MEDIUM|LOW",
          "title": "Gap identificado",
          "description": "Descrição do problema",
          "risk_impact": "Impacto do risco",
          "recommendations": ["solução1", "solução2"]
        }
      ],
      "testing_recommendations": ["rec1", "rec2"]
    }
  `;

  try {
    const analysis = await callOpenAI(openAIApiKey, prompt, 'Você é um QA Engineer experiente.');

    await supabaseClient
      .from('jira_ai_insights')
      .insert({
        project_id: projectId,
        insight_type: 'github_testing',
        confidence_score: analysis.test_coverage_estimated || 0.6,
        insight_data: {
          ...analysis,
          analysis_type: 'test_coverage',
          total_commits: commits?.length || 0,
          test_commits: testCommits.length
        },
        executive_summary: generateTestingSummary(analysis),
        alert_category: analysis.critical_gaps?.length > 0 ? 'TESTING' : 'GENERAL',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

    console.log('Test coverage analysis completed');
    return analysis;
  } catch (error) {
    console.error('Error in test coverage analysis:', error);
    throw error;
  }
}

// Performance Analysis
async function performPerformanceAnalysis(supabaseClient: any, openAIApiKey: string, integrationId: string, projectId: string) {
  console.log('Starting performance analysis...');

  const { data: commits } = await supabaseClient
    .from('github_commits')
    .select('*')
    .eq('integration_id', integrationId)
    .order('commit_date', { ascending: false })
    .limit(50);

  const { data: repositories } = await supabaseClient
    .from('github_repositories')
    .select('*')
    .eq('integration_id', integrationId);

  // Identify performance-related patterns
  const performanceCommits = commits?.filter(c => 
    /performance|optimization|slow|memory|cpu|cache|database/i.test(c.message)
  ) || [];

  const largeCommits = commits?.filter(c => 
    (c.additions || 0) + (c.deletions || 0) > 500
  ) || [];

  const prompt = `
    Analise o impacto de performance baseado nos dados do repositório:

    Repositórios: ${JSON.stringify(repositories?.map(r => ({name: r.name, size_kb: r.size_kb, language: r.language})))}
    Commits de Performance: ${JSON.stringify(performanceCommits.slice(0, 5).map(c => c.message))}
    Commits Grandes (>500 linhas): ${largeCommits.length}
    
    Últimos Commits: ${JSON.stringify(commits?.slice(0, 15).map(c => ({
      message: c.message,
      additions: c.additions,
      deletions: c.deletions,
      files: c.changed_files
    })) || [])}

    Identifique:
    1. RISCOS DE PERFORMANCE: Commits que podem impactar performance
    2. CÓDIGO INEFICIENTE: Padrões que sugerem problemas de performance  
    3. ALERTAS DE TAMANHO: Repositórios ou commits muito grandes
    4. OTIMIZAÇÕES: Oportunidades de melhoria identificadas

    Responda em JSON:
    {
      "performance_score": 0.0-1.0,
      "efficiency_rating": "BAIXA|MÉDIA|ALTA",
      "performance_risks": [
        {
          "type": "inefficient_code|large_commits|memory_issues|database_performance",
          "severity": "CRITICAL|HIGH|MEDIUM|LOW", 
          "title": "Risco identificado",
          "description": "Descrição do problema",
          "performance_impact": "Impacto esperado",
          "optimization_suggestions": ["otimização1", "otimização2"]
        }
      ],
      "recommendations": ["rec1", "rec2"]
    }
  `;

  try {
    const analysis = await callOpenAI(openAIApiKey, prompt, 'Você é um especialista em otimização de performance.');

    await supabaseClient
      .from('jira_ai_insights')
      .insert({
        project_id: projectId,
        insight_type: 'github_performance',
        confidence_score: analysis.performance_score || 0.7,
        insight_data: {
          ...analysis,
          analysis_type: 'performance',
          performance_commits: performanceCommits.length,
          large_commits: largeCommits.length,
          total_commits: commits?.length || 0
        },
        executive_summary: generatePerformanceSummary(analysis),
        alert_category: analysis.performance_risks?.some((r: any) => r.severity === 'CRITICAL') ? 'PERFORMANCE' : 'GENERAL',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

    console.log('Performance analysis completed');
    return analysis;
  } catch (error) {
    console.error('Error in performance analysis:', error);
    throw error;
  }
}

// Pipeline Health Analysis
async function performPipelineHealthAnalysis(supabaseClient: any, openAIApiKey: string, integrationId: string, projectId: string) {
  console.log('Starting pipeline health analysis...');

  // Get workflow data
  const { data: workflows } = await supabaseClient
    .from('github_workflows')
    .select('*')
    .eq('integration_id', integrationId);

  const { data: workflowRuns } = await supabaseClient
    .from('github_workflow_runs')
    .select('*')
    .eq('integration_id', integrationId)
    .order('run_started_at', { ascending: false })
    .limit(50);

  if (!workflows || workflows.length === 0) {
    console.log('No workflows found for pipeline analysis');
    // Create a basic insight about missing CI/CD
    await supabaseClient
      .from('jira_ai_insights')
      .insert({
        project_id: projectId,
        insight_type: 'github_pipeline',
        confidence_score: 0.9,
        insight_data: {
          analysis_type: 'pipeline_health',
          pipeline_status: 'NOT_CONFIGURED',
          critical_issues: [{
            type: 'missing_cicd',
            severity: 'HIGH',
            title: 'CI/CD não configurado',
            description: 'Nenhum workflow de CI/CD foi encontrado no repositório',
            recommendations: ['Configurar GitHub Actions', 'Implementar testes automatizados', 'Configurar deploy automático']
          }]
        },
        executive_summary: '⚠️ ATENÇÃO: Projeto sem CI/CD configurado - Riscos de qualidade e deploy',
        alert_category: 'PIPELINE',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });
    return;
  }

  const failedRuns = workflowRuns?.filter(r => r.conclusion === 'failure') || [];
  const successRate = workflowRuns?.length > 0 ? 
    (workflowRuns.length - failedRuns.length) / workflowRuns.length : 0;

  const prompt = `
    Analise a saúde dos pipelines CI/CD baseado nos dados:

    Workflows Configurados: ${workflows.length}
    Workflows: ${JSON.stringify(workflows.map(w => ({name: w.name, state: w.state})))}
    
    Execuções Recentes: ${workflowRuns?.length || 0}
    Taxa de Sucesso: ${Math.round(successRate * 100)}%
    Falhas Recentes: ${failedRuns.length}
    
    Execuções: ${JSON.stringify(workflowRuns?.slice(0, 10).map(r => ({
      workflow: r.workflow_name,
      status: r.status,
      conclusion: r.conclusion,
      duration: r.duration_seconds
    })) || [])}

    Identifique:
    1. SAÚDE DOS PIPELINES: Status, taxa de sucesso, tempo de build
    2. PROBLEMAS CRÍTICOS: Workflows falhando, builds lentos, configurações incorretas
    3. ALERTAS DE PERFORMANCE: Builds muito demorados, gargalos
    4. RECOMENDAÇÕES: Melhorias de processo e configuração

    Responda em JSON:
    {
      "pipeline_health_score": 0.0-1.0,
      "success_rate": 0.0-1.0,
      "pipeline_issues": [
        {
          "type": "failing_builds|slow_builds|missing_tests|configuration_issues",
          "severity": "CRITICAL|HIGH|MEDIUM|LOW",
          "title": "Problema do pipeline", 
          "description": "Descrição detalhada",
          "affected_workflows": ["workflow1", "workflow2"],
          "recommendations": ["solução1", "solução2"]
        }
      ],
      "performance_metrics": {
        "average_build_time": "tempo em segundos",
        "failure_frequency": "frequência de falhas"
      },
      "improvements": ["melhoria1", "melhoria2"]
    }
  `;

  try {
    const analysis = await callOpenAI(openAIApiKey, prompt, 'Você é um especialista em DevOps e CI/CD.');

    await supabaseClient
      .from('jira_ai_insights')
      .insert({
        project_id: projectId,
        insight_type: 'github_pipeline',
        confidence_score: analysis.pipeline_health_score || 0.8,
        insight_data: {
          ...analysis,
          analysis_type: 'pipeline_health',
          workflows_count: workflows.length,
          recent_runs: workflowRuns?.length || 0,
          success_rate: successRate
        },
        executive_summary: generatePipelineSummary(analysis, successRate),
        alert_category: analysis.pipeline_issues?.some((i: any) => i.severity === 'CRITICAL') ? 'PIPELINE' : 'GENERAL',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

    console.log('Pipeline health analysis completed');
    return analysis;
  } catch (error) {
    console.error('Error in pipeline health analysis:', error);
    throw error;
  }
}

// Development Performance Analysis
async function performDevPerformanceAnalysis(supabaseClient: any, openAIApiKey: string, integrationId: string, projectId: string) {
  console.log('Starting development performance analysis...');

  const { data: commits } = await supabaseClient
    .from('github_commits')
    .select('*')
    .eq('integration_id', integrationId)
    .order('commit_date', { ascending: false })
    .limit(200);

  const { data: contributors } = await supabaseClient
    .from('github_contributors')
    .select('*')
    .eq('integration_id', integrationId)
    .order('contributions', { ascending: false });

  // Calculate development metrics
  const last7Days = new Date();
  last7Days.setDate(last7Days.getDate() - 7);
  
  const recentCommits = commits?.filter(c => 
    new Date(c.commit_date) > last7Days
  ) || [];

  const commitsPerDay = recentCommits.length / 7;
  const topContributor = contributors?.[0];
  const contributorBalance = topContributor ? 
    topContributor.contributions / (commits?.length || 1) : 0;

  const prompt = `
    Analise a performance de desenvolvimento da equipe:

    Métricas Gerais:
    - Total de Commits: ${commits?.length || 0}
    - Commits (últimos 7 dias): ${recentCommits.length}
    - Commits por dia: ${commitsPerDay.toFixed(1)}
    - Contribuidores ativos: ${contributors?.length || 0}
    
    Distribuição de Contribuições:
    ${JSON.stringify(contributors?.slice(0, 5).map(c => ({
      name: c.login,
      contributions: c.contributions,
      percentage: Math.round((c.contributions / (commits?.length || 1)) * 100)
    })) || [])}

    Commits Recentes: ${JSON.stringify(recentCommits.slice(0, 10).map(c => ({
      author: c.author_name,
      message: c.message,
      changes: (c.additions || 0) + (c.deletions || 0)
    })))}

    Identifique:
    1. VELOCIDADE: Frequência de commits, ritmo de desenvolvimento
    2. DISTRIBUIÇÃO: Equilíbrio entre contribuidores, concentração de conhecimento
    3. ALERTAS: Baixa atividade, desenvolvedores sobrecarregados, inatividade
    4. TENDÊNCIAS: Padrões de produtividade, sazonalidade

    Responda em JSON:
    {
      "development_velocity_score": 0.0-1.0,
      "team_balance_score": 0.0-1.0,
      "activity_level": "BAIXA|MÉDIA|ALTA",
      "performance_alerts": [
        {
          "type": "low_commit_frequency|contributor_imbalance|team_inactivity|knowledge_concentration",
          "severity": "CRITICAL|HIGH|MEDIUM|LOW",
          "title": "Alerta de performance",
          "description": "Descrição do problema",
          "metrics": {"commits_per_day": number, "contributor_balance": number},
          "recommendations": ["ação1", "ação2"]
        }
      ],
      "team_insights": {
        "most_active_contributor": "nome",
        "contribution_distribution": "BALANCEADA|DESBALANCEADA",
        "development_rhythm": "CONSISTENTE|IRREGULAR"
      },
      "recommendations": ["rec1", "rec2"]
    }
  `;

  try {
    const analysis = await callOpenAI(openAIApiKey, prompt, 'Você é um tech lead experiente.');

    await supabaseClient
      .from('jira_ai_insights')
      .insert({
        project_id: projectId,
        insight_type: 'github_dev_performance',
        confidence_score: analysis.development_velocity_score || 0.7,
        insight_data: {
          ...analysis,
          analysis_type: 'dev_performance',
          commits_per_day: commitsPerDay,
          contributor_balance: contributorBalance,
          total_contributors: contributors?.length || 0,
          recent_activity: recentCommits.length
        },
        executive_summary: generateDevPerformanceSummary(analysis, commitsPerDay),
        alert_category: analysis.performance_alerts?.some((a: any) => a.severity === 'CRITICAL') ? 'DEV_PERFORMANCE' : 'GENERAL',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

    console.log('Development performance analysis completed');
    return analysis;
  } catch (error) {
    console.error('Error in development performance analysis:', error);
    throw error;
  }
}

// Release Prediction Analysis  
async function performReleasePredictionAnalysis(supabaseClient: any, openAIApiKey: string, integrationId: string, projectId: string) {
  console.log('Starting release prediction analysis...');

  const { data: releases } = await supabaseClient
    .from('github_releases')
    .select('*')
    .eq('integration_id', integrationId)
    .order('published_at', { ascending: false })
    .limit(20);

  const { data: commits } = await supabaseClient
    .from('github_commits')
    .select('*')
    .eq('integration_id', integrationId)
    .order('commit_date', { ascending: false })
    .limit(100);

  const { data: pullRequests } = await supabaseClient
    .from('github_pull_requests')
    .select('*')
    .eq('integration_id', integrationId)
    .eq('state', 'closed')
    .eq('merged', true)
    .order('merged_at', { ascending: false })
    .limit(50);

  const lastRelease = releases?.[0];
  const daysSinceLastRelease = lastRelease ? 
    Math.floor((Date.now() - new Date(lastRelease.published_at).getTime()) / (1000 * 60 * 60 * 24)) : null;

  const commitsSinceLastRelease = lastRelease ? 
    commits?.filter(c => new Date(c.commit_date) > new Date(lastRelease.published_at)) || [] : commits || [];

  const prompt = `
    Analise o padrão de releases e preveja a próxima release:

    Histórico de Releases: ${JSON.stringify(releases?.map(r => ({
      tag: r.tag_name,
      name: r.name,
      date: r.published_at,
      prerelease: r.prerelease
    })) || [])}

    Última Release: ${lastRelease ? lastRelease.tag_name : 'Nenhuma'}
    Dias desde a última: ${daysSinceLastRelease || 'N/A'}
    
    Commits desde a última release: ${commitsSinceLastRelease.length}
    PRs mergeados recentes: ${pullRequests?.length || 0}

    Commits recentes: ${JSON.stringify(commitsSinceLastRelease.slice(0, 15).map(c => ({
      message: c.message,
      date: c.commit_date,
      author: c.author_name
    })))}

    Features candidatas (baseado em commits): ${JSON.stringify(
      commitsSinceLastRelease.filter(c => 
        /feat|feature|add|new/i.test(c.message)
      ).slice(0, 10).map(c => c.message)
    )}

    Identifique:
    1. PADRÃO DE RELEASES: Frequência, intervalos, tipos de release
    2. PRONTIDÃO: Quantidade de mudanças, features completas, estabilidade
    3. PREVISÃO: Data estimada da próxima release, confiança da previsão
    4. CANDIDATOS: Features/fixes que provavelmente estarão na próxima release

    Responda em JSON:
    {
      "next_release_prediction": {
        "estimated_days": number,
        "confidence": 0.0-1.0,
        "readiness_score": 0.0-1.0,
        "predicted_type": "MAJOR|MINOR|PATCH"
      },
      "release_readiness": {
        "commits_ready": number,
        "features_identified": [{"name": "feature", "status": "ready|partial|pending"}],
        "blockers": ["blocker1", "blocker2"]
      },
      "release_risks": [
        {
          "type": "overdue_release|insufficient_testing|breaking_changes|unstable_features",
          "severity": "CRITICAL|HIGH|MEDIUM|LOW",
          "title": "Risco da release",
          "description": "Descrição do risco",
          "impact": "Impacto no cronograma",
          "mitigation": ["ação1", "ação2"]
        }
      ],
      "recommendations": ["rec1", "rec2"]
    }
  `;

  try {
    const analysis = await callOpenAI(openAIApiKey, prompt, 'Você é um release manager experiente.');

    await supabaseClient
      .from('jira_ai_insights')
      .insert({
        project_id: projectId,
        insight_type: 'github_release_prediction',
        confidence_score: analysis.next_release_prediction?.confidence || 0.6,
        insight_data: {
          ...analysis,
          analysis_type: 'release_prediction',
          releases_analyzed: releases?.length || 0,
          commits_since_last_release: commitsSinceLastRelease.length,
          days_since_last_release: daysSinceLastRelease
        },
        executive_summary: generateReleaseSummary(analysis, daysSinceLastRelease),
        alert_category: analysis.release_risks?.some((r: any) => r.severity === 'CRITICAL') ? 'RELEASE' : 'GENERAL',
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

    console.log('Release prediction analysis completed');
    return analysis;
  } catch (error) {
    console.error('Error in release prediction analysis:', error);
    throw error;
  }
}

// Helper function to call OpenAI API
async function callOpenAI(apiKey: string, prompt: string, systemMessage: string = 'You are a helpful assistant.'): Promise<any> {
  console.log('🤖 Starting OpenAI API call...');
  const timeout = 25000; // 25 seconds timeout
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    console.log('🤖 Making API request to OpenAI...');
    const requestData = {
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemMessage + ' Responda APENAS com JSON válido.' },
        { role: 'user', content: prompt.substring(0, 500) + '...' } // Log truncated prompt
      ],
      max_tokens: 2000,
      temperature: 0.3,
    };
    console.log('🤖 Request data prepared:', { ...requestData, messages: 'REDACTED' });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemMessage + ' Responda APENAS com JSON válido.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log('🤖 OpenAI API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error details:', errorText);
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const aiResponse = await response.json();
    console.log('🤖 OpenAI response received:', { 
      hasChoices: !!aiResponse.choices, 
      choicesLength: aiResponse.choices?.length,
      hasContent: !!aiResponse.choices?.[0]?.message?.content 
    });
    
    let content = aiResponse.choices[0]?.message?.content;
    
    if (!content) {
      console.error('❌ No content in OpenAI response:', aiResponse);
      throw new Error('No content in OpenAI response');
    }

    console.log('🤖 Raw content preview:', content.substring(0, 200) + '...');
    
    // Clean JSON content
    if (content.includes('```json')) {
      content = content.replace(/```json\s*/g, '').replace(/```\s*$/g, '');
    }
    console.log('🤖 Cleaned content preview:', content.substring(0, 200) + '...');
    
    try {
      const parsed = JSON.parse(content);
      console.log('✅ Successfully parsed JSON:', { keys: Object.keys(parsed) });
      return parsed;
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('❌ Raw content that failed to parse:', content);
      
      // Try to extract JSON from the content
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extractedJson = JSON.parse(jsonMatch[0]);
          console.log('✅ Successfully extracted and parsed JSON from content');
          return extractedJson;
        } catch (extractError) {
          console.error('❌ Failed to parse extracted JSON:', extractError);
        }
      }
      
      throw new Error(`Failed to parse OpenAI response as JSON: ${parseError}`);
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('❌ OpenAI API call failed:', error);
    if (error.name === 'AbortError') {
      throw new Error('OpenAI request timed out');
    }
    throw error;
  }
}

// Summary generation functions
function generateSecuritySummary(analysis: any): string {
  const criticalCount = analysis.critical_alerts?.filter((a: any) => a.severity === 'CRITICAL').length || 0;
  const vulnerabilities = analysis.vulnerabilities_found || 0;
  
  if (criticalCount > 0) {
    return `🚨 CRÍTICO: ${criticalCount} vulnerabilidade(s) crítica(s) detectada(s) - Ação imediata necessária`;
  }
  if (vulnerabilities > 0) {
    return `⚠️ ${vulnerabilities} problema(s) de segurança identificado(s) - Revisão recomendada`;
  }
  return `✅ Análise de segurança concluída - Score: ${Math.round((analysis.security_score || 0) * 100)}%`;
}

function generateQualitySummary(analysis: any): string {
  const criticalIssues = analysis.critical_issues?.filter((i: any) => i.severity === 'CRITICAL').length || 0;
  const qualityScore = Math.round((analysis.quality_score || 0) * 100);
  
  if (criticalIssues > 0) {
    return `🔥 ${criticalIssues} problema(s) crítico(s) de qualidade - Technical debt alto`;
  }
  if (qualityScore < 60) {
    return `⚠️ Qualidade do código precisa de atenção - Score: ${qualityScore}%`;
  }
  return `✅ Qualidade do código: ${qualityScore}% - Manutenibilidade ${analysis.maintainability_score ? Math.round(analysis.maintainability_score * 100) + '%' : 'N/A'}`;
}

function generateTestingSummary(analysis: any): string {
  const coverage = Math.round((analysis.test_coverage_estimated || 0) * 100);
  const criticalGaps = analysis.critical_gaps?.filter((g: any) => g.severity === 'CRITICAL').length || 0;
  
  if (criticalGaps > 0) {
    return `🚨 ${criticalGaps} gap(s) crítico(s) de teste identificado(s) - Riscos de qualidade`;
  }
  if (coverage < 50) {
    return `⚠️ Cobertura de testes baixa: ~${coverage}% - Aumentar testes recomendado`;
  }
  return `📊 Cobertura de testes estimada: ~${coverage}% - Maturidade: ${analysis.testing_maturity}`;
}

function generatePerformanceSummary(analysis: any): string {
  const performanceScore = Math.round((analysis.performance_score || 0) * 100);
  const criticalRisks = analysis.performance_risks?.filter((r: any) => r.severity === 'CRITICAL').length || 0;
  
  if (criticalRisks > 0) {
    return `⚡ ${criticalRisks} risco(s) crítico(s) de performance detectado(s) - Otimização urgente`;
  }
  if (performanceScore < 60) {
    return `⚠️ Score de performance: ${performanceScore}% - Melhorias recomendadas`;
  }
  return `✅ Performance: ${performanceScore}% - Eficiência: ${analysis.efficiency_rating}`;
}

function generatePipelineSummary(analysis: any, successRate: number): string {
  const pipelineScore = Math.round((analysis.pipeline_health_score || 0) * 100);
  const success = Math.round(successRate * 100);
  const criticalIssues = analysis.pipeline_issues?.filter((i: any) => i.severity === 'CRITICAL').length || 0;
  
  if (criticalIssues > 0) {
    return `🚨 ${criticalIssues} problema(s) crítico(s) no pipeline - Taxa de sucesso: ${success}%`;
  }
  if (success < 70) {
    return `⚠️ Pipeline instável - Taxa de sucesso: ${success}% - Revisão necessária`;
  }
  return `✅ Pipeline saudável - Score: ${pipelineScore}% - Taxa de sucesso: ${success}%`;
}

function generateDevPerformanceSummary(analysis: any, commitsPerDay: number): string {
  const velocityScore = Math.round((analysis.development_velocity_score || 0) * 100);
  const criticalAlerts = analysis.performance_alerts?.filter((a: any) => a.severity === 'CRITICAL').length || 0;
  
  if (criticalAlerts > 0) {
    return `🚨 ${criticalAlerts} alerta(s) crítico(s) de produtividade - ${commitsPerDay.toFixed(1)} commits/dia`;
  }
  if (commitsPerDay < 1) {
    return `⚠️ Baixa atividade: ${commitsPerDay.toFixed(1)} commits/dia - Velocidade: ${velocityScore}%`;
  }
  return `📈 Produtividade: ${velocityScore}% - Atividade: ${commitsPerDay.toFixed(1)} commits/dia`;
}

function generateReleaseSummary(analysis: any, daysSinceLastRelease: number | null): string {
  const confidence = Math.round((analysis.next_release_prediction?.confidence || 0) * 100);
  const estimatedDays = analysis.next_release_prediction?.estimated_days || 0;
  const criticalRisks = analysis.release_risks?.filter((r: any) => r.severity === 'CRITICAL').length || 0;
  
  if (criticalRisks > 0) {
    return `🚨 ${criticalRisks} risco(s) crítico(s) para próxima release - ${daysSinceLastRelease || 'N/A'} dias desde a última`;
  }
  if (daysSinceLastRelease && daysSinceLastRelease > 60) {
    return `⚠️ Release atrasada: ${daysSinceLastRelease} dias - Próxima estimada em ${estimatedDays} dias`;
  }
  return `📅 Próxima release estimada em ${estimatedDays} dias - Confiança: ${confidence}%`;
}