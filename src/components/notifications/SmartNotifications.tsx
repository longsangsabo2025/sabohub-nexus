import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Bell, CheckCircle, AlertTriangle, Info, Clock, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SmartNotification, prioritizeNotifications } from '@/utils/aiRecommendations';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface NotificationData {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  actionable: boolean;
  created_at: string;
}

export function SmartNotifications() {
  const [filter, setFilter] = useState<'all' | 'urgent' | 'unread'>('all');
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['smart-notifications'],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as NotificationData[];
    },
  });

  // Transform to smart notifications with AI prioritization
  const smartNotifications: SmartNotification[] = prioritizeNotifications(
    (notificationsData || []).map((n) => ({
      id: n.id,
      type: n.type as any,
      title: n.title,
      message: n.message,
      actionable: n.actionable,
      timestamp: new Date(n.created_at),
      actions: n.actionable
        ? [
            { label: 'View', action: 'view' },
            { label: 'Dismiss', action: 'dismiss' },
          ]
        : undefined,
    }))
  );

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-notifications'] });
    },
  });

  // Delete notification mutation
  const deleteNotificationMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-notifications'] });
    },
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.user.id)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['smart-notifications'] });
    },
  });

  // Filter notifications
  const filteredNotifications = smartNotifications.filter((n) => {
    const notifData = notificationsData?.find((nd) => nd.id === n.id);
    if (filter === 'urgent') return n.urgent;
    if (filter === 'unread') return notifData && !notifData.read;
    return true;
  });

  const urgentCount = smartNotifications.filter((n) => n.urgent).length;
  const unreadCount = notificationsData?.filter((n) => !n.read).length || 0;

  const getTypeIcon = (type: SmartNotification['type']) => {
    switch (type) {
      case 'alert':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case 'deadline':
        return <Clock className="h-4 w-4 text-orange-600" />;
      case 'approval':
        return <CheckCircle className="h-4 w-4 text-blue-600" />;
      case 'task':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      default:
        return <Info className="h-4 w-4 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 70) return 'bg-red-100 text-red-800 border-red-300';
    if (priority >= 50) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (priority >= 30) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Smart Notifications</h1>
        </div>
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            Loading notifications...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bell className="h-8 w-8" />
            Smart Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-prioritized notifications with intelligent filtering
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Filter by</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setFilter('all')}>
                All Notifications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('urgent')}>
                Urgent Only ({urgentCount})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter('unread')}>
                Unread ({unreadCount})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {unreadCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{smartNotifications.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Urgent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{urgentCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Unread</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{unreadCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Actionable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {smartNotifications.filter((n) => n.actionable).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notifications List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filter === 'all' && 'All Notifications'}
            {filter === 'urgent' && 'Urgent Notifications'}
            {filter === 'unread' && 'Unread Notifications'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No notifications to display</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification) => {
                const notifData = notificationsData?.find((n) => n.id === notification.id);
                const isRead = notifData?.read || false;

                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'p-4 rounded-lg border transition-colors',
                      !isRead && 'bg-blue-50 border-blue-200',
                      isRead && 'bg-white'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getTypeIcon(notification.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-semibold text-sm">{notification.title}</h4>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={getPriorityColor(notification.priority)}
                            >
                              Priority: {notification.priority}
                            </Badge>
                            {notification.urgent && (
                              <Badge variant="destructive" className="animate-pulse">
                                URGENT
                              </Badge>
                            )}
                            {!isRead && (
                              <Badge variant="default" className="bg-blue-600">
                                New
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(notification.timestamp)}
                          </span>
                          <div className="flex items-center gap-2">
                            {notification.actions?.map((action) => (
                              <Button
                                key={action.action}
                                size="sm"
                                variant={action.action === 'view' ? 'default' : 'outline'}
                                onClick={() => {
                                  if (action.action === 'dismiss') {
                                    deleteNotificationMutation.mutate(notification.id);
                                  } else {
                                    markAsReadMutation.mutate(notification.id);
                                  }
                                }}
                              >
                                {action.label}
                              </Button>
                            ))}
                            {!isRead && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => markAsReadMutation.mutate(notification.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteNotificationMutation.mutate(notification.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function formatTimestamp(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Vừa xong';
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString('vi-VN');
}

export default SmartNotifications;
