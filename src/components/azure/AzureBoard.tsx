import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AlertTriangle, Clock, User, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AzureBoardProps {
  workItems: any[];
  projects: any[];
  insights: any[];
  onItemUpdate: () => void;
}

const AzureBoard: React.FC<AzureBoardProps> = ({ workItems, projects, insights, onItemUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('all');

  // Define columns for Azure Kanban board
  const columns = [
    { id: 'new', title: 'Novo', states: ['New', 'To Do', 'Proposed'] },
    { id: 'active', title: 'Ativo', states: ['Active', 'Committed', 'In Progress'] },
    { id: 'resolved', title: 'Resolvido', states: ['Resolved', 'Done', 'Completed'] },
    { id: 'closed', title: 'Fechado', states: ['Closed', 'Removed'] }
  ];

  // Get unique assignees for filter
  const uniqueAssignees = useMemo(() => {
    const assignees = workItems
      .map(item => item.assigned_to)
      .filter(Boolean)
      .filter((assignee, index, array) => array.indexOf(assignee) === index);
    return assignees.sort();
  }, [workItems]);

  // Filter work items based on search and filters
  const filteredItems = useMemo(() => {
    return workItems.filter(item => {
      const matchesSearch = !searchTerm || 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.azure_id.toString().includes(searchTerm);
      
      const matchesProject = selectedProject === 'all' || item.project === selectedProject;
      const matchesAssignee = selectedAssignee === 'all' || item.assigned_to === selectedAssignee;

      return matchesSearch && matchesProject && matchesAssignee;
    });
  }, [workItems, searchTerm, selectedProject, selectedAssignee]);

  // Get work items by column
  const getItemsByColumn = (column: any) => {
    return filteredItems.filter(item => 
      column.states.includes(item.state)
    );
  };

  // Get AI insights for a work item
  const getItemInsights = (itemId: string) => {
    return insights.filter(insight => insight.item_id === itemId);
  };

  // Get priority color
  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return 'destructive';
      case 2:
        return 'destructive';
      case 3:
        return 'secondary';
      case 4:
        return 'outline';
      default:
        return 'secondary';
    }
  };

  // Get work item type color
  const getWorkItemTypeColor = (workItemType: string) => {
    switch (workItemType?.toLowerCase()) {
      case 'bug':
        return 'text-red-500';
      case 'user story':
        return 'text-green-500';
      case 'task':
        return 'text-blue-500';
      case 'feature':
        return 'text-purple-500';
      case 'epic':
        return 'text-indigo-500';
      default:
        return 'text-gray-500';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'Crítica';
      case 2: return 'Alta';
      case 3: return 'Média';
      case 4: return 'Baixa';
      default: return 'Não definida';
    }
  };

  return (
    <div className="space-y-4">
      {/* Header and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Board Azure DevOps
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por work item ou ID..."
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
                  <SelectItem key={project.id} value={project.name}>
                    {project.name}
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
          const columnItems = getItemsByColumn(column);
          
          return (
            <div key={column.id} className="space-y-3">
              {/* Column Header */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                  {column.title}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {columnItems.length}
                </Badge>
              </div>

              {/* Column Work Items */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {columnItems.map((item) => {
                  const itemInsights = getItemInsights(item.id);
                  const slaRisk = itemInsights.find(insight => insight.insight_type === 'sla_risk');
                  const hasHighRisk = slaRisk && slaRisk.confidence_score > 0.7;

                  return (
                    <Card 
                      key={item.id} 
                      className={cn(
                        "cursor-pointer transition-all duration-200 hover:shadow-md",
                        hasHighRisk && "border-red-200 bg-red-50"
                      )}
                    >
                      <CardContent className="p-4">
                        {/* Item Header */}
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              #{item.azure_id}
                            </Badge>
                            <Badge variant={getPriorityColor(item.priority)} className="text-xs">
                              {getPriorityLabel(item.priority)}
                            </Badge>
                          </div>
                          {hasHighRisk && (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </div>

                        {/* Item Title */}
                        <h4 className="font-medium text-sm mb-2 line-clamp-2">
                          {item.title}
                        </h4>

                        {/* Item Meta */}
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                          <span className={cn("font-medium", getWorkItemTypeColor(item.work_item_type))}>
                            {item.work_item_type}
                          </span>
                          {item.story_points && (
                            <Badge variant="secondary" className="text-xs">
                              {item.story_points} SP
                            </Badge>
                          )}
                        </div>

                        {/* AI Insights */}
                        {itemInsights.length > 0 && (
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
                        {item.assigned_to && (
                          <div className="flex items-center gap-2 mt-3">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-xs">
                                {item.assigned_to.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground truncate">
                              {item.assigned_to}
                            </span>
                          </div>
                        )}

                        {/* Tags */}
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {item.tags.slice(0, 3).map((tag: string) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                            {item.tags.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{item.tags.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}

                {columnItems.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum work item nesta coluna
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
              Total: {filteredItems.length} work items
              {filteredItems.length !== workItems.length && ` (de ${workItems.length})`}
            </span>
            <div className="flex items-center gap-4">
              <span>
                Alto Risco: {insights.filter(i => i.insight_type === 'sla_risk' && i.confidence_score > 0.7).length}
              </span>
              <span>
                Alta Prioridade: {filteredItems.filter(i => [1, 2].includes(i.priority)).length}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AzureBoard;