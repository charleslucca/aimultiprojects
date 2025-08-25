import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertTriangle, Clock, User, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface JiraBoardProps {
  issues: any[];
  projects: any[];
  insights: any[];
  onIssueUpdate: () => void;
}

const JiraBoard: React.FC<JiraBoardProps> = ({ issues, projects, insights, onIssueUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');

  // Define columns for Kanban board
  const columns = [
    { id: 'todo', title: 'To Do', statuses: ['To Do', 'Open', 'New'] },
    { id: 'inprogress', title: 'Em Progresso', statuses: ['In Progress', 'In Development'] },
    { id: 'review', title: 'Em Revisão', statuses: ['In Review', 'Code Review', 'Testing'] },
    { id: 'done', title: 'Concluído', statuses: ['Done', 'Closed', 'Resolved'] }
  ];

  // Get unique assignees for filter
  const uniqueAssignees = useMemo(() => {
    const assignees = issues
      .map(issue => issue.assignee_name)
      .filter(Boolean)
      .filter((assignee, index, array) => array.indexOf(assignee) === index);
    return assignees.sort();
  }, [issues]);

  // Filter issues based on search and filters
  const filteredIssues = useMemo(() => {
    return issues.filter(issue => {
      const matchesSearch = !searchTerm || 
        issue.summary.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.jira_key.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesProject = selectedProject === 'all' || issue.project_key === selectedProject;
      const matchesAssignee = selectedAssignee === 'all' || issue.assignee_name === selectedAssignee;

      return matchesSearch && matchesProject && matchesAssignee;
    });
  }, [issues, searchTerm, selectedProject, selectedAssignee]);

  // Get issues by column
  const getIssuesByColumn = (column: any) => {
    return filteredIssues.filter(issue => 
      column.statuses.includes(issue.status)
    );
  };

  // Get AI insights for an issue
  const getIssueInsights = (issueId: string) => {
    return insights.filter(insight => insight.issue_id === issueId);
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'highest':
        return 'destructive';
      case 'high':
        return 'destructive';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      case 'lowest':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Get issue type icon color
  const getIssueTypeColor = (issueType: string) => {
    switch (issueType?.toLowerCase()) {
      case 'bug':
        return 'text-red-500';
      case 'story':
        return 'text-green-500';
      case 'task':
        return 'text-blue-500';
      case 'epic':
        return 'text-purple-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Board Inteligente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por issue ou chave..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Projeto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Projetos</SelectItem>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.jira_key}>
                    {project.jira_key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Assignees</SelectItem>
                {uniqueAssignees.map((assignee) => (
                  <SelectItem key={assignee} value={assignee}>
                    {assignee}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((column) => {
          const columnIssues = getIssuesByColumn(column);
          
          return (
            <div key={column.id} className="space-y-3">
              {/* Column Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {column.title}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {columnIssues.length}
                </Badge>
              </div>

              {/* Column Issues */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {columnIssues.map((issue) => {
                  const issueInsights = getIssueInsights(issue.id);
                  const slaRisk = issueInsights.find(insight => insight.insight_type === 'sla_risk');
                  const hasHighRisk = slaRisk && slaRisk.confidence_score > 0.7;

                  return (
                    <Card 
                      key={issue.id} 
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:shadow-md",
                        hasHighRisk && "border-red-200 bg-red-50"
                      )}
                    >
                      <CardContent className="p-4">
                        {/* Issue Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {issue.jira_key}
                            </Badge>
                            <Badge variant={getPriorityColor(issue.priority)} className="text-xs">
                              {issue.priority || 'Medium'}
                            </Badge>
                          </div>
                          {hasHighRisk && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>

                        {/* Issue Title */}
                        <h4 className="font-medium text-sm mb-2 line-clamp-2">
                          {issue.summary}
                        </h4>

                        {/* Issue Meta */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                          <span className={cn("font-medium", getIssueTypeColor(issue.issue_type))}>
                            {issue.issue_type}
                          </span>
                          {issue.story_points && (
                            <Badge variant="secondary" className="text-xs">
                              {issue.story_points} SP
                            </Badge>
                          )}
                        </div>

                        {/* AI Insights */}
                        {issueInsights.length > 0 && (
                          <div className="mb-3">
                            {slaRisk && (
                              <div className="flex items-center gap-1 text-xs">
                                <Clock className="h-3 w-3 text-orange-500" />
                                <span className="text-orange-600">
                                  Risco SLA: {Math.round(slaRisk.confidence_score * 100)}%
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Assignee */}
                        {issue.assignee_name && (
                          <div className="flex items-center gap-2 mt-3">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {issue.assignee_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground truncate">
                              {issue.assignee_name}
                            </span>
                          </div>
                        )}

                        {/* Labels */}
                        {issue.labels && issue.labels.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {issue.labels.slice(0, 3).map((label: string) => (
                              <Badge key={label} variant="outline" className="text-xs">
                                {label}
                              </Badge>
                            ))}
                            {issue.labels.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{issue.labels.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {columnIssues.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhuma issue nesta coluna
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Total: {filteredIssues.length} issues
              {filteredIssues.length !== issues.length && ` (de ${issues.length})`}
            </span>
            <div className="flex items-center gap-4">
              <span>
                Alto Risco: {insights.filter(i => i.insight_type === 'sla_risk' && i.confidence_score > 0.7).length}
              </span>
              <span>
                Alta Prioridade: {filteredIssues.filter(i => ['Highest', 'High'].includes(i.priority)).length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JiraBoard;