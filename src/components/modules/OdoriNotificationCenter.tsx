import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  useOdoriNotifications, 
  useUnreadOdoriCount, 
  useMarkOdoriRead,
  useMarkAllOdoriRead,
  OdoriNotification 
} from '@/hooks/useOdoriNotifications';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Bell, 
  ShoppingCart, 
  Truck, 
  CreditCard, 
  Package, 
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  CheckCheck
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const notificationIcons: Record<OdoriNotification['type'], React.ComponentType<{ className?: string }>> = {
  order: ShoppingCart,
  delivery: Truck,
  payment: CreditCard,
  inventory: Package,
  customer: Users,
  alert: AlertTriangle,
};

const priorityStyles: Record<OdoriNotification['priority'], string> = {
  low: 'border-l-gray-400',
  normal: 'border-l-blue-400',
  high: 'border-l-orange-400',
  urgent: 'border-l-red-500',
};

function NotificationItem({ 
  notification, 
  onRead, 
  onClick 
}: { 
  notification: OdoriNotification; 
  onRead: () => void;
  onClick: () => void;
}) {
  const Icon = notificationIcons[notification.type] || Bell;

  return (
    <div
      className={cn(
        'p-3 border-l-4 cursor-pointer hover:bg-gray-50 transition-colors',
        priorityStyles[notification.priority],
        !notification.is_read && 'bg-blue-50/50'
      )}
      onClick={() => {
        if (!notification.is_read) onRead();
        onClick();
      }}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          'p-2 rounded-full',
          notification.type === 'order' && 'bg-purple-100 text-purple-600',
          notification.type === 'delivery' && 'bg-blue-100 text-blue-600',
          notification.type === 'payment' && 'bg-green-100 text-green-600',
          notification.type === 'inventory' && 'bg-orange-100 text-orange-600',
          notification.type === 'customer' && 'bg-pink-100 text-pink-600',
          notification.type === 'alert' && 'bg-red-100 text-red-600',
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className={cn(
              'text-sm truncate',
              !notification.is_read && 'font-semibold'
            )}>
              {notification.title}
            </p>
            {!notification.is_read && (
              <span className="h-2 w-2 bg-blue-500 rounded-full flex-shrink-0"></span>
            )}
          </div>
          <p className="text-xs text-gray-600 line-clamp-2 mt-0.5">
            {notification.message}
          </p>
          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDistanceToNow(new Date(notification.created_at), { 
              addSuffix: true, 
              locale: vi 
            })}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
      </div>
    </div>
  );
}

export function OdoriNotificationCenter() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useOdoriNotifications();
  const { data: unreadCount = 0 } = useUnreadOdoriCount();
  const markRead = useMarkOdoriRead();
  const markAllRead = useMarkAllOdoriRead();

  const handleNotificationClick = (notification: OdoriNotification) => {
    if (notification.action_url) {
      navigate(notification.action_url);
      setOpen(false);
    }
  };

  const filterByType = (type: string) => {
    if (type === 'all') return notifications;
    return notifications.filter(n => n.type === type);
  };

  // Helper function available if needed for displaying unread counts per type
  const _unreadByType = (type: string) => {
    const filtered = filterByType(type);
    return filtered.filter(n => !n.is_read).length;
  };
  void _unreadByType; // Suppress unused warning

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-red-500"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold">Thông báo Odori</h3>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-1" />
              Đọc tất cả
            </Button>
          )}
        </div>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full justify-start px-2 py-1 h-auto flex-wrap">
            <TabsTrigger value="all" className="text-xs relative">
              Tất cả
              {unreadCount > 0 && (
                <span className="ml-1 text-xs bg-red-500 text-white rounded-full px-1.5">
                  {unreadCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="order" className="text-xs">
              <ShoppingCart className="h-3 w-3 mr-1" />
              Đơn hàng
            </TabsTrigger>
            <TabsTrigger value="delivery" className="text-xs">
              <Truck className="h-3 w-3 mr-1" />
              Giao hàng
            </TabsTrigger>
            <TabsTrigger value="payment" className="text-xs">
              <CreditCard className="h-3 w-3 mr-1" />
              Thanh toán
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-80">
            {['all', 'order', 'delivery', 'payment', 'inventory', 'customer', 'alert'].map(type => (
              <TabsContent key={type} value={type} className="m-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                ) : filterByType(type).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                    <CheckCircle className="h-10 w-10 mb-2 text-green-500" />
                    <p className="text-sm">Không có thông báo mới</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filterByType(type).map(notification => (
                      <NotificationItem
                        key={notification.id}
                        notification={notification}
                        onRead={() => markRead.mutate(notification.id)}
                        onClick={() => handleNotificationClick(notification)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            ))}
          </ScrollArea>
        </Tabs>

        <div className="p-2 border-t">
          <Button 
            variant="ghost" 
            className="w-full text-sm"
            onClick={() => {
              navigate('/notifications');
              setOpen(false);
            }}
          >
            Xem tất cả thông báo
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Full page notification list
export function OdoriNotificationList() {
  const navigate = useNavigate();
  const { data: notifications = [], isLoading } = useOdoriNotifications();
  const markRead = useMarkOdoriRead();
  const markAllRead = useMarkAllOdoriRead();

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Thông báo</h1>
        {unreadCount > 0 && (
          <Button 
            variant="outline"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <CheckCheck className="h-4 w-4 mr-2" />
            Đánh dấu tất cả đã đọc ({unreadCount})
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Bell className="h-16 w-16 mb-4 text-gray-300" />
              <p className="text-lg">Không có thông báo</p>
              <p className="text-sm">Các thông báo mới sẽ xuất hiện ở đây</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map(notification => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={() => markRead.mutate(notification.id)}
                  onClick={() => {
                    if (notification.action_url) {
                      navigate(notification.action_url);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default OdoriNotificationCenter;
