import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  BookOpen, 
  Play, 
  Clock,
  Star,
  Search,
  Filter,
  TrendingUp,
  Award,
  Users,
  Loader2,
  PlayCircle,
  CheckCircle
} from 'lucide-react';

interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: number;
  thumbnail_url: string;
  video_url: string;
  tags: string[];
  created_at: string;
}

const Academy = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [filteredCourses, setFilteredCourses] = useState<Course[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchCourses();
    }
  }, [user]);

  useEffect(() => {
    filterCourses();
  }, [courses, searchTerm, categoryFilter]);

  const fetchCourses = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('academy_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setCourses(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar cursos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterCourses = () => {
    let filtered = courses;

    if (searchTerm) {
      filtered = filtered.filter(course =>
        course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        course.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(course => course.category === categoryFilter);
    }

    setFilteredCourses(filtered);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${remainingMinutes}min`;
    }
    return `${minutes}min`;
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case 'gestão':
        return 'bg-primary text-primary-foreground';
      case 'análise':
        return 'bg-accent text-accent-foreground';
      case 'ferramentas':
        return 'bg-warning text-warning-foreground';
      case 'metodologia':
        return 'bg-success text-success-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  const categories = ['all', 'gestão', 'análise', 'ferramentas', 'metodologia'];
  const categoryLabels: { [key: string]: string } = {
    all: 'Todos',
    'gestão': 'Gestão',
    'análise': 'Análise',
    'ferramentas': 'Ferramentas',
    'metodologia': 'Metodologia'
  };

  // Mock data for demonstration
  const mockCourses = [
    {
      id: '1',
      title: 'Fundamentos da Gestão de Projetos',
      description: 'Aprenda os conceitos essenciais para gerenciar projetos com eficiência e entregar resultados de qualidade.',
      category: 'gestão',
      duration: 45,
      thumbnail_url: '/api/placeholder/300/200',
      video_url: '#',
      tags: ['projetos', 'gestão', 'fundamentos'],
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      title: 'Análise de Dados para Projetos',
      description: 'Como usar dados e métricas para tomar decisões melhores em seus projetos.',
      category: 'análise',
      duration: 60,
      thumbnail_url: '/api/placeholder/300/200',
      video_url: '#',
      tags: ['dados', 'análise', 'métricas'],
      created_at: new Date().toISOString()
    },
    {
      id: '3',
      title: 'Ferramentas de Produtividade',
      description: 'Descubra as melhores ferramentas para aumentar a produtividade da sua equipe.',
      category: 'ferramentas',
      duration: 30,
      thumbnail_url: '/api/placeholder/300/200',
      video_url: '#',
      tags: ['produtividade', 'ferramentas', 'equipe'],
      created_at: new Date().toISOString()
    },
    {
      id: '4',
      title: 'Metodologias Ágeis na Prática',
      description: 'Implemente metodologias ágeis em seus projetos para maior flexibilidade e entregas contínuas.',
      category: 'metodologia',
      duration: 75,
      thumbnail_url: '/api/placeholder/300/200',
      video_url: '#',
      tags: ['agile', 'scrum', 'metodologia'],
      created_at: new Date().toISOString()
    }
  ];

  const displayCourses = courses.length > 0 ? filteredCourses : mockCourses.filter(course => {
    const matchesSearch = !searchTerm || 
      course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'all' || course.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold gradient-text">Academia ProjectAI</h1>
          <p className="text-muted-foreground">
            Aprenda e melhore suas habilidades em gestão de projetos
          </p>
        </div>
        <Button className="bg-gradient-primary hover:opacity-90 shadow-alpine">
          <BookOpen className="h-4 w-4 mr-2" />
          Meus Cursos
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Cursos Disponíveis</p>
                <p className="text-2xl font-bold">{displayCourses.length}</p>
              </div>
              <div className="p-3 rounded-xl bg-primary-light">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Progresso Geral</p>
                <p className="text-2xl font-bold">65%</p>
              </div>
              <div className="p-3 rounded-xl bg-accent-light">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Certificados</p>
                <p className="text-2xl font-bold">3</p>
              </div>
              <div className="p-3 rounded-xl bg-warning/10">
                <Award className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Horas Estudadas</p>
                <p className="text-2xl font-bold">42h</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10">
                <Clock className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="glass-card">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cursos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-border rounded-md bg-background text-foreground"
              >
                {categories.map(category => (
                  <option key={category} value={category}>
                    {categoryLabels[category]}
                  </option>
                ))}
              </select>
              <Button variant="outline" size="icon">
                <Filter className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Learning Section */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center">
            <PlayCircle className="h-5 w-5 mr-2 text-primary" />
            Continue Aprendendo
          </CardTitle>
          <CardDescription>
            Retome de onde parou
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4 p-4 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
              <div className="w-16 h-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                <Play className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">Análise de Dados para Projetos</h4>
                <p className="text-sm text-muted-foreground">Módulo 3: Visualização de Dados</p>
                <div className="mt-2">
                  <Progress value={70} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">70% concluído</p>
                </div>
              </div>
              <Button size="sm">
                <Play className="h-4 w-4 mr-2" />
                Continuar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Courses Grid */}
      {isLoading && courses.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="glass-card animate-pulse">
              <div className="aspect-video bg-muted rounded-t-lg"></div>
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded w-3/4"></div>
                  <div className="h-3 bg-muted rounded w-full"></div>
                  <div className="h-3 bg-muted rounded w-2/3"></div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-muted rounded w-16"></div>
                    <div className="h-6 bg-muted rounded w-20"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : displayCourses.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum curso encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Tente ajustar os filtros para encontrar cursos.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayCourses.map((course) => (
            <Card key={course.id} className="glass-card hover:shadow-alpine transition-all duration-300 cursor-pointer overflow-hidden">
              {/* Course Thumbnail */}
              <div className="aspect-video bg-gradient-primary relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/80 to-primary/60 flex items-center justify-center">
                  <Play className="h-12 w-12 text-primary-foreground opacity-80" />
                </div>
                <div className="absolute top-4 right-4">
                  <Badge className={getCategoryColor(course.category)}>
                    {course.category}
                  </Badge>
                </div>
              </div>

              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Course Info */}
                  <div>
                    <h3 className="font-semibold text-lg line-clamp-2 mb-2">{course.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {course.description}
                    </p>
                  </div>

                  {/* Course Meta */}
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center space-x-2">
                      <Clock className="h-4 w-4" />
                      <span>{formatDuration(course.duration)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Star className="h-4 w-4 fill-current text-warning" />
                      <span>4.8</span>
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {course.tags.slice(0, 3).map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Action */}
                  <Button className="w-full bg-gradient-primary hover:opacity-90">
                    <Play className="h-4 w-4 mr-2" />
                    Iniciar Curso
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Academy;