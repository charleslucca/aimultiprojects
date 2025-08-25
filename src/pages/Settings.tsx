import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  Building, 
  Bell, 
  Shield, 
  Palette,
  Database,
  Key,
  Loader2,
  Save,
  Upload,
  Trash2,
  Settings as SettingsIcon
} from 'lucide-react';

const Settings = () => {
  const { user, loading, signOut } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Profile settings
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    phone: '',
    bio: '',
    avatar: ''
  });

  // Organization settings
  const [orgData, setOrgData] = useState({
    name: 'ProjectAI',
    slug: 'project-ai',
    description: '',
    website: '',
    timezone: 'America/Sao_Paulo'
  });

  // Notification settings
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    projectUpdates: true,
    teamInvites: true,
    weeklyReports: false,
    securityAlerts: true
  });

  const handleProfileSave = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement profile update
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrgSave = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement organization update
      toast({
        title: "Organização atualizada",
        description: "As configurações da organização foram salvas.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar organização",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotificationSave = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement notification settings update
      toast({
        title: "Notificações atualizadas",
        description: "Suas preferências de notificação foram salvas.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar notificações",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
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

  const userInitials = user.email?.[0]?.toUpperCase() || 'U';

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências e configurações da conta
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">Perfil</span>
          </TabsTrigger>
          <TabsTrigger value="organization" className="flex items-center space-x-2">
            <Building className="h-4 w-4" />
            <span className="hidden sm:inline">Organização</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Notificações</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Segurança</span>
          </TabsTrigger>
          <TabsTrigger value="advanced" className="flex items-center space-x-2">
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Avançado</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Informações do Perfil</CardTitle>
              <CardDescription>
                Atualize suas informações pessoais e foto de perfil
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center space-x-6">
                <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                  <AvatarImage src={profileData.avatar} />
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xl font-bold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-2">
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Alterar Foto
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Remover
                  </Button>
                </div>
              </div>

              <Separator />

              {/* Personal Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input
                    id="firstName"
                    value={profileData.firstName}
                    onChange={(e) => setProfileData({...profileData, firstName: e.target.value})}
                    placeholder="Seu nome"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Sobrenome</Label>
                  <Input
                    id="lastName"
                    value={profileData.lastName}
                    onChange={(e) => setProfileData({...profileData, lastName: e.target.value})}
                    placeholder="Seu sobrenome"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                  placeholder="seu@email.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  value={profileData.bio}
                  onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                  placeholder="Conte um pouco sobre você..."
                  className="w-full min-h-[100px] px-3 py-2 border border-border rounded-md bg-background text-foreground resize-none"
                />
              </div>

              <Button onClick={handleProfileSave} disabled={isLoading} className="bg-gradient-primary hover:opacity-90">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Alterações
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Organization Tab */}
        <TabsContent value="organization">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Configurações da Organização</CardTitle>
              <CardDescription>
                Gerencie as informações da sua organização
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Plano Atual</h3>
                  <p className="text-sm text-muted-foreground">Você está no plano gratuito</p>
                </div>
                <Badge className="bg-gradient-primary text-primary-foreground">
                  Gratuito
                </Badge>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="orgName">Nome da Organização</Label>
                  <Input
                    id="orgName"
                    value={orgData.name}
                    onChange={(e) => setOrgData({...orgData, name: e.target.value})}
                    placeholder="Nome da sua empresa"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orgSlug">Slug da Organização</Label>
                  <Input
                    id="orgSlug"
                    value={orgData.slug}
                    onChange={(e) => setOrgData({...orgData, slug: e.target.value})}
                    placeholder="minha-empresa"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orgDescription">Descrição</Label>
                <textarea
                  id="orgDescription"
                  value={orgData.description}
                  onChange={(e) => setOrgData({...orgData, description: e.target.value})}
                  placeholder="Descreva sua organização..."
                  className="w-full min-h-[100px] px-3 py-2 border border-border rounded-md bg-background text-foreground resize-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={orgData.website}
                    onChange={(e) => setOrgData({...orgData, website: e.target.value})}
                    placeholder="https://www.exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Fuso Horário</Label>
                  <select
                    id="timezone"
                    value={orgData.timezone}
                    onChange={(e) => setOrgData({...orgData, timezone: e.target.value})}
                    className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
                  >
                    <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                    <option value="America/New_York">Nova York (GMT-5)</option>
                    <option value="Europe/London">Londres (GMT+0)</option>
                  </select>
                </div>
              </div>

              <Button onClick={handleOrgSave} disabled={isLoading} className="bg-gradient-primary hover:opacity-90">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Organização
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Preferências de Notificação</CardTitle>
              <CardDescription>
                Configure como você deseja receber notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="emailNotifications">Notificações por Email</Label>
                    <p className="text-sm text-muted-foreground">Receba atualizações importantes por email</p>
                  </div>
                  <Switch
                    id="emailNotifications"
                    checked={notifications.emailNotifications}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, emailNotifications: checked})
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="projectUpdates">Atualizações de Projetos</Label>
                    <p className="text-sm text-muted-foreground">Notificações sobre mudanças em projetos</p>
                  </div>
                  <Switch
                    id="projectUpdates"
                    checked={notifications.projectUpdates}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, projectUpdates: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="teamInvites">Convites de Equipe</Label>
                    <p className="text-sm text-muted-foreground">Notificações sobre convites para projetos</p>
                  </div>
                  <Switch
                    id="teamInvites"
                    checked={notifications.teamInvites}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, teamInvites: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="weeklyReports">Relatórios Semanais</Label>
                    <p className="text-sm text-muted-foreground">Resumo semanal dos seus projetos</p>
                  </div>
                  <Switch
                    id="weeklyReports"
                    checked={notifications.weeklyReports}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, weeklyReports: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="securityAlerts">Alertas de Segurança</Label>
                    <p className="text-sm text-muted-foreground">Notificações importantes sobre segurança</p>
                  </div>
                  <Switch
                    id="securityAlerts"
                    checked={notifications.securityAlerts}
                    onCheckedChange={(checked) => 
                      setNotifications({...notifications, securityAlerts: checked})
                    }
                  />
                </div>
              </div>

              <Button onClick={handleNotificationSave} disabled={isLoading} className="bg-gradient-primary hover:opacity-90">
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Preferências
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Segurança da Conta</CardTitle>
              <CardDescription>
                Gerencie a segurança da sua conta e senhas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Alterar Senha</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentPassword">Senha Atual</Label>
                      <Input
                        id="currentPassword"
                        type="password"
                        placeholder="••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">Nova Senha</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>
                  <Button className="mt-4">
                    <Key className="h-4 w-4 mr-2" />
                    Alterar Senha
                  </Button>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Sessões Ativas</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Gerencie onde você está logado
                  </p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border/50">
                      <div>
                        <p className="font-medium">Navegador Atual</p>
                        <p className="text-sm text-muted-foreground">Chrome • São Paulo, Brasil</p>
                      </div>
                      <Badge variant="secondary">Ativo</Badge>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2 text-destructive">Zona de Perigo</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ações irreversíveis para sua conta
                  </p>
                  <div className="space-y-3">
                    <Button variant="outline" onClick={signOut}>
                      Sair de Todas as Sessões
                    </Button>
                    <Button variant="destructive">
                      Excluir Conta
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Advanced Tab */}
        <TabsContent value="advanced">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>Configurações Avançadas</CardTitle>
              <CardDescription>
                Configurações técnicas e de desenvolvedor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">API e Integrações</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Gerencie chaves de API e integrações externas
                  </p>
                  <Button variant="outline">
                    <Key className="h-4 w-4 mr-2" />
                    Gerar Chave de API
                  </Button>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Exportar Dados</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Baixe uma cópia dos seus dados
                  </p>
                  <Button variant="outline">
                    <Database className="h-4 w-4 mr-2" />
                    Exportar Dados
                  </Button>
                </div>

                <Separator />

                <div>
                  <h4 className="font-medium mb-2">Tema</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Personalize a aparência da aplicação
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" size="sm">
                      <Palette className="h-4 w-4 mr-2" />
                      Claro
                    </Button>
                    <Button variant="outline" size="sm">
                      <Palette className="h-4 w-4 mr-2" />
                      Escuro
                    </Button>
                    <Button variant="outline" size="sm">
                      <Palette className="h-4 w-4 mr-2" />
                      Sistema
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;