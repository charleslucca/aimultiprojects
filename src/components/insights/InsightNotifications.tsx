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
import { useAuth } from '@/contexts/AuthContext';
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
  insight_id: string;
  alert_type: 'info' | 'warning' | 'error' | 'success';
  alert_message: string;
  is_read: boolean;
  expires_at: string | null;
  created_at: string;
}

interface NotificationRule {
  id: string;
  insight_types: string[];
  alert_levels: string[];
  notification_channels: string[];
  is_active: boolean;
}

export default function InsightNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
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
      const { data, error } = await supabase
        .from('insight_alerts')
        .select('*')
        .contains('target_users', [user.id])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setAlerts(data || []);
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
      const { data, error } = await supabase
        .from('notification_rules')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;
      setRules(data || []);
    } catch (error) {
      console.error('Error loading notification rules:', error);
    }
  };

  const showNotificationToast = (alert: InsightAlert) => {
    const icon = getAlertIcon(alert.alert_type);
    const variant = alert.alert_type === 'error' ? 'destructive' : 'default';

    toast({
      title: 'Nova Notificação',
      description: alert.alert_message,
      variant,
    });
  };

  const markAsRead = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('insight_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, is_read: true } : alert
        )
      );
    } catch (error) {
      console.error('Error marking alert as read:', error);
    }
  };

  const dismissAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('insight_alerts')
        .delete()
        .eq('id', alertId);

      if (error) throw error;

      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      
      toast({
        title: 'Notificação removida',
        description: 'A notificação foi removida com sucesso',
      });
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  };

  const updateNotificationRule = async (ruleId: string, updates: Partial<NotificationRule>) => {
    try {
      const { error } = await supabase
        .from('notification_rules')
        .update(updates)
        .eq('id', ruleId);

      if (error) throw error;

      setRules(prev => 
        prev.map(rule => 
          rule.id === ruleId ? { ...rule, ...updates } : rule
        )
      );

      toast({
        title: 'Configuração atualizada',
        description: 'Suas preferências de notificação foram salvas',
      });
    } catch (error) {
      console.error('Error updating notification rule:', error);
    }
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
    if (filter === 'unread') return !alert.is_read;
    if (filter === 'critical') return alert.alert_type === 'error';
    return true;
  });

  const unreadCount = alerts.filter(alert => !alert.is_read).length;

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
                    className={`transition-colors ${!alert.is_read ? 'border-primary/50 bg-primary/5' : ''}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {getAlertIcon(alert.alert_type)}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-1">
                              <Badge variant={getAlertBadgeVariant(alert.alert_type)}>
                                {alert.alert_type}
                              </Badge>
                              {!alert.is_read && (
                                <Badge variant="secondary" className="text-xs">
                                  Nova
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm font-medium mb-1">
                              {alert.alert_message}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(alert.created_at).toLocaleString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {!alert.is_read && (
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