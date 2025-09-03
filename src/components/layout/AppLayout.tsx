import React from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Bell, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
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