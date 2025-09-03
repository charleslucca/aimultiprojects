import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

import { 
  Bell, 
  BellOff, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  X,
  Settings,
  Filter
} from 'lucide-react';

interface InsightAlert {
  id: string;
  project_id: string;
  insight_type: string;
  content: string;
  confidence_score: number;
  created_at: string;
  created_by?: string;
}

interface NotificationRule {
  id: string;
  insight_types: string[];
  alert_levels: string[];
  notification_channels: string[];
  is_active: boolean;
}

export default function InsightNotifications() {
  const { toast } = useToast();
  // Remove auth dependencies for now  
  const user = null; // Remove user dependency
  const [alerts, setAlerts] = useState<InsightAlert[]>([]);
  const [rules, setRules] = useState<NotificationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');

  useEffect(() => {
    if (user) {
      loadAlerts();
      loadNotificationRules();
      
      // Subscribe to real-time alerts
      const alertsSubscription = supabase
        .channel('insight_alerts')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'insight_alerts',
          filter: `target_users=cs.{${user.id}}`
        }, (payload) => {
          setAlerts(prev => [payload.new as InsightAlert, ...prev]);
          showNotificationToast(payload.new as InsightAlert);
        })
        .subscribe();

      return () => {
        alertsSubscription.unsubscribe();
      };
    }
  }, [user]);

  const loadAlerts = async () => {
    if (!user) return;

    try {
    // Use existing unified_insights table instead
    const { data, error } = await supabase
      .from('unified_insights')
      .select('*')
      .eq('created_by', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

      if (error) throw error;
      // Transform unified_insights to alerts format
      const transformedAlerts = (data || []).map(insight => ({
        id: insight.id,
        project_id: insight.project_id,
        insight_type: insight.insight_type,
        content: insight.content,
        confidence_score: insight.confidence_score,
        created_at: insight.created_at,
        created_by: insight.created_by
      }));
      setAlerts(transformedAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao carregar notificações',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationRules = async () => {
    if (!user) return;

    try {
    // Mock notification rules for now - will be implemented later
    const mockRules = [
      {
        id: 'rule-1',
        insight_types: ['analysis', 'risk'],
        alert_levels: ['high', 'critical'],
        notification_channels: ['email', 'in_app'],
        is_active: true
      }
    ];
    setRules(mockRules);
    } catch (error) {
      console.error('Error loading notification rules:', error);
    }
  };

  const showNotificationToast = (alert: InsightAlert) => {
    const icon = getAlertIcon(alert.insight_type);
    const variant = alert.insight_type === 'risk' ? 'destructive' : 'default';

    toast({
      title: 'Nova Notificação',
      description: alert.content.slice(0, 100) + '...',
      variant,
    });
  };

  const markAsRead = async (alertId: string) => {
    // Mock function - just update local state
    setAlerts(prev => 
      prev.map(alert => 
        alert.id === alertId ? { ...alert, confidence_score: 1.0 } : alert
      )
    );
    
    toast({
      title: 'Marcado como lido',
      description: 'Insight marcado como visualizado',
    });
  };

  const dismissAlert = async (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    
    toast({
      title: 'Insight removido',
      description: 'O insight foi removido da lista',
    });
  };

  const updateNotificationRule = async (ruleId: string, updates: Partial<NotificationRule>) => {
    setRules(prev => 
      prev.map(rule => 
        rule.id === ruleId ? { ...rule, ...updates } : rule
      )
    );

    toast({
      title: 'Configuração atualizada',
      description: 'Suas preferências de notificação foram salvas',
    });
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'success': return <CheckCircle className="h-4 w-4 text-success" />;
      default: return <Info className="h-4 w-4 text-info" />;
    }
  };

  const getAlertBadgeVariant = (type: string) => {
    switch (type) {
      case 'error': return 'destructive';
      case 'warning': return 'secondary';
      case 'success': return 'default';
      default: return 'outline';
    }
  };

  const filteredAlerts = alerts.filter(alert => {
    if (filter === 'unread') return alert.confidence_score < 0.8;
    if (filter === 'critical') return alert.insight_type === 'risk';
    return true;
  });

  const unreadCount = alerts.filter(alert => alert.confidence_score < 0.8).length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <CardTitle>Notificações Inteligentes</CardTitle>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="rounded-full">
                  {unreadCount}
                </Badge>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4 mr-2" />
                Configurações
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter buttons */}
          <div className="flex items-center space-x-2 mb-4">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              Todas
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
            >
              Não lidas ({unreadCount})
            </Button>
            <Button
              variant={filter === 'critical' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('critical')}
            >
              Críticas
            </Button>
          </div>

          <Separator className="mb-4" />

          {/* Settings panel */}
          {showSettings && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">Configurações de Notificação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between">
                    <div>
                      <Label>Notificações {rule.insight_types.join(', ')}</Label>
                      <p className="text-sm text-muted-foreground">
                        Canais: {rule.notification_channels.join(', ')}
                      </p>
                    </div>
                    <Switch
                      checked={rule.is_active}
                      onCheckedChange={(checked) => 
                        updateNotificationRule(rule.id, { is_active: checked })
                      }
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Alerts list */}
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {filteredAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <BellOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {filter === 'all' ? 'Nenhuma notificação encontrada' :
                     filter === 'unread' ? 'Nenhuma notificação não lida' :
                     'Nenhuma notificação crítica'}
                  </p>
                </div>
              ) : (
                filteredAlerts.map((alert) => (
                  <Card 
                    key={alert.id} 
                    className={`transition-colors ${alert.confidence_score < 0.8 ? 'border-primary/50 bg-primary/5' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {getAlertIcon(alert.insight_type)}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                            <Badge variant="outline">
                              {alert.insight_type}
                            </Badge>
                            {alert.confidence_score < 0.8 && (
                              <Badge variant="secondary" className="text-xs">
                                Nova
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm font-medium mb-1">
                            {alert.content.slice(0, 100)}...
                          </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(alert.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {alert.confidence_score < 0.8 && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(alert.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dismissAlert(alert.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}