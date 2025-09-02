import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/layout/AppLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import OnePageView from "./pages/OnePageView";
import Auth from "./pages/Auth";
import Projects from "./pages/Projects";
import Dashboard from "./pages/Dashboard";
import Team from "./pages/Team";
import Academy from "./pages/Academy";
import JiraCockpit from "./pages/JiraCockpit";
import JiraCockpitProject from "./pages/JiraCockpitProject";
import AzureCockpitProject from "./pages/AzureCockpitProject";
import SmartHub from "./pages/SmartHub";
import SmartDiscovery from "./pages/SmartDiscovery";
import SmartDelivery from "./pages/SmartDelivery";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

// Create QueryClient instance with proper configuration
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Debug component to monitor app state (temporary)
const AppDebugInfo = () => {
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="fixed top-0 right-0 z-50 bg-black/80 text-white p-2 text-xs rounded-bl-lg">
      <div>App: Loaded</div>
      <div>Route: {window.location.pathname}</div>
      <div>Time: {new Date().toLocaleTimeString()}</div>
    </div>
  );
};

const App: React.FC = () => {
  console.log('App: Rendering at', new Date().toISOString());
  
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <AppDebugInfo />
            <BrowserRouter>
              <AppLayout>
                <Routes>
                  <Route path="/" element={<OnePageView />} />
                  <Route path="/auth" element={<Auth />} />
                  <Route path="/projects" element={<Projects />} />
                  <Route path="/projects/:projectId/jira" element={<JiraCockpitProject />} />
                  <Route path="/projects/:projectId/azure" element={<AzureCockpitProject />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/team" element={<Team />} />
                  <Route path="/academy" element={<Academy />} />
                  <Route path="/smart-hub" element={<SmartHub />} />
                  <Route path="/smart-hub/discovery" element={<SmartDiscovery />} />
                  <Route path="/smart-hub/discovery/:sessionId" element={<SmartDiscovery />} />
                  <Route path="/smart-hub/delivery" element={<SmartDelivery />} />
                  <Route path="/smart-hub/delivery/:sessionId" element={<SmartDelivery />} />
                  <Route path="/settings" element={<Settings />} />
                  {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </AppLayout>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
