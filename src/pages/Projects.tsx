import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSearchParams } from "react-router-dom";
import { 
  Plus,
  Search,
  Building2,
  FolderOpen,
  BarChart3,
  Users,
  ChevronDown,
  ChevronRight,
  Trash2,
  MoreVertical
} from "lucide-react";
import { ProjectCard } from "@/components/ProjectCard";
import { NewProjectModal } from "@/components/modals/NewProjectModal";
import { DeleteConfirmationModal } from "@/components/modals/DeleteConfirmationModal";
import { IntegrationManager } from "@/components/integrations/IntegrationManager";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Client {
  id: string;
  name: string;
  status_color: string | null;
  project_count?: number;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  budget?: number;
  start_date?: string;
  end_date?: string;
  client_id?: string;
  client?: {
    name: string;
  };
  integrations?: Array<{
    id: string;
    integration_type: string;
    is_active: boolean;
  }>;
}

export default function Projects() {
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());
  const [newProjectModalOpen, setNewProjectModalOpen] = useState(false);
  const [integrationModalOpen, setIntegrationModalOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [deleteClientModal, setDeleteClientModal] = useState<{ isOpen: boolean; client: Client | null }>({
    isOpen: false,
    client: null
  });
  const [isDeletingClient, setIsDeletingClient] = useState(false);
  
  const [searchParams] = useSearchParams();
  const selectedClientId = searchParams.get('client');

  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterProjects();
  }, [projects, searchTerm, selectedClientId]);

  useEffect(() => {
    // Auto-expand client if coming from One Page View
    if (selectedClientId) {
      setExpandedClients(new Set([selectedClientId]));
    }
  }, [selectedClientId]);

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Loading projects data...');

      // Load clients - force fresh data
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('name');

      if (clientsError) throw clientsError;

      // Check if there are orphaned projects (projects without client_id)
      const { count: orphanedCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .is('client_id', null);

      // Count projects per client
      const clientsWithCounts = await Promise.all(
        (clientsData || []).map(async (client) => {
          const { count } = await supabase
            .from('projects')
            .select('*', { count: 'exact', head: true })
            .eq('client_id', client.id);

          return {
            ...client,
            project_count: count || 0,
          };
        })
      );

      // Add virtual "Sem Cliente" if there are orphaned projects
      if (orphanedCount && orphanedCount > 0) {
        clientsWithCounts.unshift({
          id: 'orphaned',
          name: 'Projetos sem Cliente',
          status_color: 'yellow',
          project_count: orphanedCount,
          contact_info: null,
          created_at: null,
          last_health_update: null,
          organization_id: null,
          overall_health: null,
          risk_level: 'medium',
        });
      }

      setClients(clientsWithCounts);

      // Load projects with client information and integrations - force fresh data
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select(`
          *,
          clients(name, status_color),
          project_integrations(*)
        `)
        .order('name');

      if (projectsError) throw projectsError;

      // Check which projects have integrations - force fresh data  
      const { data: integrations } = await supabase
        .from('project_integrations')
        .select('id, project_id, integration_type, is_active');

      const projectsWithIntegrations = (projectsData || []).map(project => ({
        ...project,
        integrations: integrations?.filter(integration => 
          integration.project_id === project.id && integration.is_active
        ) || []
      }));

      setProjects(projectsWithIntegrations);
      setClients(clientsWithCounts);
      console.log('Projects loaded:', projectsWithIntegrations?.length, 'projects with integrations');
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterProjects = () => {
    let filtered = projects;

    if (selectedClientId) {
      if (selectedClientId === 'orphaned') {
        filtered = filtered.filter(project => !project.client_id);
      } else {
        filtered = filtered.filter(project => project.client_id === selectedClientId);
      }
    }

    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.client?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredProjects(filtered);
  };

  const toggleClientExpansion = (clientId: string) => {
    const newExpanded = new Set(expandedClients);
    if (newExpanded.has(clientId)) {
      newExpanded.delete(clientId);
    } else {
      newExpanded.add(clientId);
    }
    setExpandedClients(newExpanded);
  };

  const handleManageIntegrations = (projectId: string) => {
    setSelectedProject(projectId);
    setIntegrationModalOpen(true);
  };

  const handleDeleteClient = async () => {
    if (!deleteClientModal.client) return;

    setIsDeletingClient(true);
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', deleteClientModal.client.id);

      if (error) throw error;

      toast({
        title: "Cliente excluído",
        description: `O cliente "${deleteClientModal.client.name}" e todos os seus projetos foram excluídos com sucesso.`,
      });

      // Reload data to reflect changes
      await loadData();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir cliente",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeletingClient(false);
      setDeleteClientModal({ isOpen: false, client: null });
    }
  };

  const getClientProjects = (clientId: string) => {
    if (clientId === 'orphaned') {
      return filteredProjects.filter(project => !project.client_id);
    }
    return filteredProjects.filter(project => project.client_id === clientId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando projetos...</p>
        </div>
      </div>
    );
  }

  // If showing specific client, show projects directly
  if (selectedClientId) {
    const client = clients.find(c => c.id === selectedClientId);
    const clientProjects = getClientProjects(selectedClientId);

    return (
      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Projetos - {client?.name}
            </h1>
            <p className="text-muted-foreground mt-2">
              Gerencie os projetos do cliente {client?.name}
            </p>
          </div>
          <Button onClick={() => setNewProjectModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Projeto
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {clientProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onManageIntegrations={handleManageIntegrations}
              onDelete={(projectId) => {
                setProjects(prev => prev.filter(p => p.id !== projectId));
              }}
              onIntegrationChanged={loadData}
            />
          ))}
        </div>

        {clientProjects.length === 0 && (
          <Card className="p-8">
            <div className="text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum projeto encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Este cliente ainda não possui projetos cadastrados.
              </p>
              <Button onClick={() => setNewProjectModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Criar Primeiro Projeto
              </Button>
            </div>
          </Card>
        )}

        <NewProjectModal 
          open={newProjectModalOpen}
          onOpenChange={setNewProjectModalOpen}
          onProjectCreated={loadData}
        />

        {selectedProject && integrationModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Gerenciar Integrações</h2>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setIntegrationModalOpen(false);
                      setSelectedProject(null);
                    }}
                  >
                    ✕
                  </Button>
                </div>
              </div>
              <div className="p-6">
                <IntegrationManager 
                  projectId={selectedProject}
                  clientId={projects.find(p => p.id === selectedProject)?.client_id}
                  onIntegrationAdded={() => {
                    console.log('Integration added callback triggered, reloading data...');
                    loadData();
                    setIntegrationModalOpen(false);
                    setSelectedProject(null);
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default hierarchical view by client
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Projetos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie todos os seus projetos organizados por cliente
          </p>
        </div>
        <Button onClick={() => setNewProjectModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Projeto
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar projetos ou clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients and Projects Hierarchy */}
      <div className="space-y-6">
        {clients.map((client) => {
          const clientProjects = getClientProjects(client.id);
          const isExpanded = expandedClients.has(client.id);
          
          // Skip clients with no projects when searching
          if (searchTerm && clientProjects.length === 0) return null;

          return (
            <Card key={client.id}>
              <CardHeader 
                className="cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => toggleClientExpansion(client.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      )}
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{client.name}</CardTitle>
                      <CardDescription>
                        {client.project_count} projeto{client.project_count !== 1 ? 's' : ''}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {client.status_color && (
                      <div 
                        className={`w-3 h-3 rounded-full ${
                          client.status_color === 'red' ? 'bg-red-500' :
                          client.status_color === 'yellow' ? 'bg-yellow-500' :
                          'bg-green-500'
                        }`} 
                      />
                    )}
                    <Badge variant="outline">
                      {clientProjects.length} projeto{clientProjects.length !== 1 ? 's' : ''}
                    </Badge>
                    
                    {/* Only show delete option for real clients, not orphaned projects */}
                    {client.id !== 'orphaned' && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteClientModal({ isOpen: true, client });
                            }}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Excluir Cliente
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="pt-0">
                  <Separator className="mb-6" />
                  {clientProjects.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                      {clientProjects.map((project) => (
                        <ProjectCard
                          key={project.id}
                          project={project}
                          onManageIntegrations={handleManageIntegrations}
                          onDelete={(projectId) => {
                            setProjects(prev => prev.filter(p => p.id !== projectId));
                          }}
                          onIntegrationChanged={loadData}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FolderOpen className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground mb-4">
                        Este cliente ainda não possui projetos cadastrados.
                      </p>
                      <Button 
                        variant="outline" 
                        onClick={() => setNewProjectModalOpen(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Criar Projeto
                      </Button>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {clients.length === 0 && (
        <Card className="p-8">
          <div className="text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Comece criando seu primeiro projeto e cliente.
            </p>
            <Button onClick={() => setNewProjectModalOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Projeto
            </Button>
          </div>
        </Card>
      )}

      <NewProjectModal 
        open={newProjectModalOpen}
        onOpenChange={setNewProjectModalOpen}
        onProjectCreated={loadData}
      />

      <DeleteConfirmationModal
        isOpen={deleteClientModal.isOpen}
        onClose={() => setDeleteClientModal({ isOpen: false, client: null })}
        onConfirm={handleDeleteClient}
        title="Excluir Cliente"
        description="Tem certeza de que deseja excluir este cliente? Todos os projetos associados também serão excluídos."
        itemName={deleteClientModal.client?.name || ""}
        isLoading={isDeletingClient}
      />

      {selectedProject && integrationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Gerenciar Integrações</h2>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setIntegrationModalOpen(false);
                    setSelectedProject(null);
                  }}
                >
                  ✕
                </Button>
              </div>
            </div>
            <div className="p-6">
              <IntegrationManager 
                projectId={selectedProject}
                clientId={projects.find(p => p.id === selectedProject)?.client_id}
                onIntegrationAdded={() => {
                  console.log('Integration added callback triggered (modal), reloading data...');
                  loadData();
                  setIntegrationModalOpen(false);
                  setSelectedProject(null);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}