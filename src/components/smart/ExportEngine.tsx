import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Download,
  FileText,
  CheckCircle,
  ExternalLink,
  Copy,
  Settings
} from "lucide-react";

interface ExportEngineProps {
  sessionId: string;
  sessionType: 'discovery' | 'delivery';
  generatedBacklog?: any[];
  onExport?: (exportData: any) => void;
}

interface ExportItem {
  id: string;
  type: 'epic' | 'story' | 'task';
  title: string;
  description: string;
  acceptanceCriteria?: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  storyPoints?: number;
  labels?: string[];
}

export function ExportEngine({ sessionId, sessionType, generatedBacklog = [], onExport }: ExportEngineProps) {
  const { toast } = useToast();
  const [exportType, setExportType] = useState<'jira' | 'azure' | 'csv'>('jira');
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState<any>(null);
  const [projectKey, setProjectKey] = useState('');
  const [organizationUrl, setOrganizationUrl] = useState('');

  // Mock backlog items if none provided
  const backlogItems: ExportItem[] = generatedBacklog.length > 0 
    ? generatedBacklog 
    : [
        {
          id: '1',
          type: 'epic',
          title: 'Authentication System',
          description: 'Complete user authentication and authorization system',
          priority: 'high',
          storyPoints: 13,
          labels: ['security', 'core']
        },
        {
          id: '2', 
          type: 'story',
          title: 'User Login with Google OAuth',
          description: 'As a user, I want to login with my Google account so that I can access the system quickly',
          acceptanceCriteria: [
            'User can click "Login with Google" button',
            'System redirects to Google OAuth',
            'Upon successful auth, user is redirected to dashboard',
            'Login session persists for 7 days'
          ],
          priority: 'high',
          storyPoints: 5,
          labels: ['auth', 'oauth']
        },
        {
          id: '3',
          type: 'story', 
          title: 'Project Creation',
          description: 'As a project manager, I want to create new projects so that I can organize work',
          acceptanceCriteria: [
            'User can access "New Project" form',
            'Form validates required fields',
            'Project is created and appears in list',
            'User is redirected to project dashboard'
          ],
          priority: 'high',
          storyPoints: 8,
          labels: ['core', 'project-management']
        }
      ];

  const handleExport = async () => {
    setExporting(true);
    
    try {
      let exportData;
      
      switch (exportType) {
        case 'jira':
          exportData = await exportToJira();
          break;
        case 'azure':
          exportData = await exportToAzure();
          break;
        case 'csv':
          exportData = await exportToCSV();
          break;
        default:
          throw new Error('Tipo de export não suportado');
      }

      // Save export history
      const { error: saveError } = await supabase
        .from(sessionType === 'discovery' ? 'smart_discovery_sessions' : 'smart_delivery_sessions')
        .update({
          export_history: [
            ...(exportResult?.export_history || []),
            {
              timestamp: new Date().toISOString(),
              export_type: exportType,
              items_count: backlogItems.length,
              success: true,
              data: exportData
            }
          ]
        })
        .eq('id', sessionId);

      if (saveError) throw saveError;

      setExportResult(exportData);
      onExport?.(exportData);

      toast({
        title: "Export realizado com sucesso",
        description: `${backlogItems.length} itens exportados para ${exportType.toUpperCase()}`,
      });

    } catch (error: any) {
      console.error('Export error:', error);
      toast({
        title: "Erro no export",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  const exportToJira = async () => {
    // In a real implementation, this would:
    // 1. Connect to Jira API
    // 2. Create Epic first
    // 3. Create Stories under the Epic
    // 4. Set proper links and relationships
    
    const jiraItems = backlogItems.map(item => ({
      fields: {
        project: { key: projectKey },
        summary: item.title,
        description: item.description,
        issuetype: { name: item.type === 'epic' ? 'Epic' : 'Story' },
        priority: { name: item.priority === 'critical' ? 'Highest' : 
                         item.priority === 'high' ? 'High' :
                         item.priority === 'medium' ? 'Medium' : 'Low' },
        labels: item.labels,
        ...(item.storyPoints && { 
          customfield_10016: item.storyPoints // Story Points field
        }),
        ...(item.acceptanceCriteria && {
          description: `${item.description}\n\nCritérios de Aceitação:\n${item.acceptanceCriteria.map(c => `• ${c}`).join('\n')}`
        })
      }
    }));

    // Mock API response
    return {
      platform: 'jira',
      projectKey,
      items: jiraItems,
      urls: jiraItems.map((_, index) => `https://yourcompany.atlassian.net/browse/${projectKey}-${index + 1}`),
      summary: {
        total: backlogItems.length,
        epics: backlogItems.filter(i => i.type === 'epic').length,
        stories: backlogItems.filter(i => i.type === 'story').length,
        tasks: backlogItems.filter(i => i.type === 'task').length
      }
    };
  };

  const exportToAzure = async () => {
    // Azure DevOps work items format
    const azureItems = backlogItems.map(item => ({
      op: 'add',
      path: '/fields/System.Title',
      value: item.title,
      fields: {
        'System.Description': item.description,
        'System.WorkItemType': item.type === 'epic' ? 'Epic' : 
                               item.type === 'story' ? 'User Story' : 'Task',
        'Microsoft.VSTS.Common.Priority': item.priority === 'critical' ? 1 :
                                          item.priority === 'high' ? 2 :
                                          item.priority === 'medium' ? 3 : 4,
        'Microsoft.VSTS.Scheduling.StoryPoints': item.storyPoints,
        'System.Tags': item.labels?.join(';')
      }
    }));

    return {
      platform: 'azure',
      organizationUrl,
      items: azureItems,
      urls: azureItems.map((_, index) => `${organizationUrl}/_workitems/edit/${1000 + index}`),
      summary: {
        total: backlogItems.length,
        epics: backlogItems.filter(i => i.type === 'epic').length,
        stories: backlogItems.filter(i => i.type === 'story').length,
        tasks: backlogItems.filter(i => i.type === 'task').length
      }
    };
  };

  const exportToCSV = async () => {
    const csvHeaders = ['Type', 'Title', 'Description', 'Priority', 'Story Points', 'Labels', 'Acceptance Criteria'];
    const csvRows = backlogItems.map(item => [
      item.type,
      `"${item.title}"`,
      `"${item.description}"`,
      item.priority,
      item.storyPoints || '',
      item.labels?.join(';') || '',
      item.acceptanceCriteria?.join('; ') || ''
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.join(','))
    ].join('\n');

    // Create downloadable file
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    return {
      platform: 'csv',
      content: csvContent,
      downloadUrl: url,
      filename: `backlog-export-${new Date().toISOString().slice(0, 10)}.csv`,
      summary: {
        total: backlogItems.length,
        columns: csvHeaders.length
      }
    };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Conteúdo copiado para a área de transferência",
    });
  };

  return (
    <div className="space-y-6">
      {/* Export Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Exportar Backlog
          </CardTitle>
          <CardDescription>
            Exporte seu backlog para plataformas de gestão de projetos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Export Type Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Plataforma de Destino</Label>
            <RadioGroup value={exportType} onValueChange={(value) => setExportType(value as any)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="jira" id="jira" />
                <Label htmlFor="jira">Jira (Atlassian)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="azure" id="azure" />
                <Label htmlFor="azure">Azure DevOps</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="csv" id="csv" />
                <Label htmlFor="csv">CSV (Excel/Sheets)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Platform-specific Configuration */}
          {exportType === 'jira' && (
            <div>
              <Label htmlFor="projectKey">Project Key (Jira)</Label>
              <Input
                id="projectKey"
                placeholder="Ex: PROJ, DEV, SMART"
                value={projectKey}
                onChange={(e) => setProjectKey(e.target.value)}
              />
            </div>
          )}

          {exportType === 'azure' && (
            <div>
              <Label htmlFor="orgUrl">Organization URL (Azure)</Label>
              <Input
                id="orgUrl"
                placeholder="https://yourcompany.visualstudio.com"
                value={organizationUrl}
                onChange={(e) => setOrganizationUrl(e.target.value)}
              />
            </div>
          )}

          <Button 
            onClick={handleExport} 
            disabled={exporting || (exportType === 'jira' && !projectKey) || (exportType === 'azure' && !organizationUrl)}
            className="w-full"
          >
            {exporting ? (
              <>Exportando...</>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar {backlogItems.length} itens
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Backlog Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Preview do Backlog ({backlogItems.length} itens)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {backlogItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg border">
                <Badge variant={item.type === 'epic' ? 'default' : 
                               item.type === 'story' ? 'secondary' : 'outline'}>
                  {item.type}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-sm text-muted-foreground truncate">{item.description}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {item.priority}
                    </Badge>
                    {item.storyPoints && (
                      <Badge variant="outline" className="text-xs">
                        {item.storyPoints} pts
                      </Badge>
                    )}
                    {item.labels?.map(label => (
                      <Badge key={label} variant="outline" className="text-xs">
                        {label}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Export Results */}
      {exportResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              Export Realizado
            </CardTitle>
            <CardDescription>
              Backlog exportado com sucesso para {exportResult.platform.toUpperCase()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-2xl font-bold">{exportResult.summary.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              {exportResult.summary.epics !== undefined && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{exportResult.summary.epics}</p>
                  <p className="text-sm text-muted-foreground">Épicos</p>
                </div>
              )}
              {exportResult.summary.stories !== undefined && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{exportResult.summary.stories}</p>
                  <p className="text-sm text-muted-foreground">Stories</p>
                </div>
              )}
              {exportResult.summary.tasks !== undefined && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{exportResult.summary.tasks}</p>
                  <p className="text-sm text-muted-foreground">Tasks</p>
                </div>
              )}
            </div>

            {exportResult.platform === 'csv' ? (
              <div className="space-y-2">
                <Button 
                  onClick={() => {
                    const link = document.createElement('a');
                    link.href = exportResult.downloadUrl;
                    link.download = exportResult.filename;
                    link.click();
                  }}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Baixar {exportResult.filename}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => copyToClipboard(exportResult.content)}
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Conteúdo CSV
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Itens criados na plataforma. Acesse os links abaixo:
                </p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {exportResult.urls?.slice(0, 5).map((url: string, index: number) => (
                    <Button 
                      key={index}
                      variant="outline" 
                      onClick={() => window.open(url, '_blank')}
                      className="w-full justify-between text-left"
                    >
                      <span className="truncate">{backlogItems[index]?.title}</span>
                      <ExternalLink className="h-4 w-4 ml-2 flex-shrink-0" />
                    </Button>
                  ))}
                  {exportResult.urls?.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      E mais {exportResult.urls.length - 5} itens...
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}