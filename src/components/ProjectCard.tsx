import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, 
  DollarSign, 
  Users, 
  Settings,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Unplug,
  MoreVertical
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  client?: {
    name: string;
  };
  jira_connected?: boolean;
}

interface ProjectCardProps {
  project: Project;
  showClient?: boolean;
  onConnectJira?: (projectId: string) => void;
  onDelete?: (projectId: string) => void;
  onDisconnectJira?: (projectId: string) => void;
}

export function ProjectCard({ project, showClient = false, onConnectJira, onDelete, onDisconnectJira }: ProjectCardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'planning':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'on-hold':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'planning':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
      case 'on-hold':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleJiraCockpit = () => {
    navigate(`/projects/${project.id}/jira`);
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      toast({
        title: "Projeto excluído",
        description: `O projeto "${project.name}" foi excluído com sucesso.`,
      });

      onDelete?.(project.id);
    } catch (error: any) {
      toast({
        title: "Erro ao excluir projeto",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleDisconnectJira = async () => {
    try {
      // Remove Jira connection from project (update to set jira_connected = false)
      // This would need to be implemented based on your data structure
      
      toast({
        title: "Jira desconectado",
        description: `A conexão Jira foi removida do projeto "${project.name}".`,
      });

      onDisconnectJira?.(project.id);
    } catch (error: any) {
      toast({
        title: "Erro ao desconectar Jira",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Calculate a mock progress (you can replace with real data)
  const progress = Math.floor(Math.random() * 100);

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold mb-1">{project.name}</CardTitle>
            {showClient && project.client && (
              <CardDescription className="text-sm text-muted-foreground mb-2">
                Cliente: {project.client.name}
              </CardDescription>
            )}
            {project.description && (
              <CardDescription className="text-sm text-muted-foreground line-clamp-2">
                {project.description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            {getStatusIcon(project.status)}
            <Badge className={getStatusColor(project.status)}>
              {project.status}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="ml-auto">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {project.jira_connected && (
                  <>
                    <DropdownMenuItem onClick={handleDisconnectJira}>
                      <Unplug className="mr-2 h-4 w-4" />
                      Desconectar Jira
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem 
                  onClick={() => setShowDeleteModal(true)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Excluir Projeto
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Project Metrics */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          {project.budget && (
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Orçamento</p>
                <p className="font-medium">{formatCurrency(project.budget)}</p>
              </div>
            </div>
          )}

          {project.start_date && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Início</p>
                <p className="font-medium">{formatDate(project.start_date)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {project.jira_connected ? (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={handleJiraCockpit}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Ver Insights
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="flex-1">
              <Settings className="mr-2 h-4 w-4" />
              Configurar
            </Button>
          )}
          
          {!project.jira_connected && (
            <Button 
              variant="secondary" 
              size="sm" 
              className="flex-1"
              onClick={() => onConnectJira?.(project.id)}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              Conectar Jira
            </Button>
          )}
        </div>
      </CardContent>

      <DeleteConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title="Excluir Projeto"
        description="Tem certeza de que deseja excluir este projeto?"
        itemName={project.name}
        isLoading={isDeleting}
      />
    </Card>
  );
}