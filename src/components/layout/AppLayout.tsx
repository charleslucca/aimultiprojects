import React from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Bell, Search, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

// Loading screen component
const LoadingScreen = () => (
  <div className="min-h-screen bg-background flex items-center justify-center">
    <div className="text-center space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
      <p className="text-muted-foreground">Carregando aplicação...</p>
    </div>
  </div>
);

// Minimal layout for auth pages
const MinimalLayout: React.FC<AppLayoutProps> = ({ children }) => (
  <div className="min-h-screen bg-background">
    {children}
  </div>
);

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, loading } = useAuth();

  console.log('AppLayout render:', { user: !!user, loading });

  // Show loading screen during auth initialization
  if (loading) {
    return <LoadingScreen />;
  }

  // Show minimal layout for unauthenticated users
  if (!user) {
    return <MinimalLayout>{children}</MinimalLayout>;
  }

  // Full layout for authenticated users
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 bg-card/80 backdrop-blur-sm border-b border-border/30 flex items-center px-6 gap-4 sticky top-0 z-40">
            <SidebarTrigger className="hover:bg-accent hover:text-accent-foreground" />
            
            <div className="flex-1 flex items-center justify-between">
              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar projetos, tarefas..."
                    className="pl-10 bg-background/50 border-border/50 focus:border-primary/50"
                  />
                </div>
              </div>

              {/* Header Actions */}
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="icon" className="hover:bg-accent">
                  <Bell className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};