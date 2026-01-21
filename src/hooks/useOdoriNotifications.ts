import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface OdoriNotification {
  id: string;
  type: 'order' | 'delivery' | 'payment' | 'inventory' | 'customer' | 'alert';
  title: string;
  message: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  is_read: boolean;
  action_url?: string;
  action_type?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
}

// Odori-specific notification hooks
export function useOdoriNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['odori-notifications', user?.id],
    queryFn: async (): Promise<OdoriNotification[]> => {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id)
        .in('type', ['order', 'delivery', 'payment', 'inventory', 'customer', 'alert'])
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

export function useUnreadOdoriCount() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['odori-unread-count', user?.id],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user?.id)
        .eq('is_read', false)
        .in('type', ['order', 'delivery', 'payment', 'inventory', 'customer', 'alert']);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
    refetchInterval: 30000,
  });
}

export function useMarkOdoriRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odori-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['odori-unread-count'] });
    },
  });
}

export function useMarkAllOdoriRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const userId = user?.id;

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('is_read', false)
        .in('type', ['order', 'delivery', 'payment', 'inventory', 'customer', 'alert']);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['odori-notifications'] });
      queryClient.invalidateQueries({ queryKey: ['odori-unread-count'] });
      toast.success('Đã đánh dấu tất cả đã đọc');
    },
  });
}

// Create notification helper
export async function createOdoriNotification(params: {
  userId: string;
  type: OdoriNotification['type'];
  title: string;
  message: string;
  priority?: OdoriNotification['priority'];
  actionUrl?: string;
  actionType?: string;
  metadata?: Record<string, unknown>;
}) {
  const { error } = await supabase.from('notifications').insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    message: params.message,
    priority: params.priority || 'normal',
    action_url: params.actionUrl,
    action_type: params.actionType,
    metadata: params.metadata,
    is_read: false,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Failed to create notification:', error);
  }
}

// Notification triggers for Odori events
export const OdoriNotificationTriggers = {
  // Order notifications
  newOrder: async (userId: string, orderNumber: string, customerName: string, amount: number) => {
    await createOdoriNotification({
      userId,
      type: 'order',
      title: 'Đơn hàng mới',
      message: `Đơn hàng ${orderNumber} từ ${customerName} - ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)}`,
      priority: 'high',
      actionUrl: `/orders/${orderNumber}`,
      actionType: 'view_order',
    });
  },

  orderStatusChanged: async (userId: string, orderNumber: string, newStatus: string) => {
    const statusText: Record<string, string> = {
      pending: 'Chờ xử lý',
      confirmed: 'Đã xác nhận',
      processing: 'Đang xử lý',
      shipped: 'Đang giao',
      delivered: 'Đã giao',
      cancelled: 'Đã hủy',
    };

    await createOdoriNotification({
      userId,
      type: 'order',
      title: 'Cập nhật đơn hàng',
      message: `Đơn hàng ${orderNumber} đã chuyển sang: ${statusText[newStatus] || newStatus}`,
      actionUrl: `/orders/${orderNumber}`,
      actionType: 'view_order',
    });
  },

  // Delivery notifications
  deliveryAssigned: async (userId: string, deliveryNumber: string, driverName: string) => {
    await createOdoriNotification({
      userId,
      type: 'delivery',
      title: 'Phân công giao hàng',
      message: `Đơn giao ${deliveryNumber} đã được giao cho ${driverName}`,
      actionUrl: `/deliveries/${deliveryNumber}`,
      actionType: 'view_delivery',
    });
  },

  deliveryCompleted: async (userId: string, deliveryNumber: string, customerName: string) => {
    await createOdoriNotification({
      userId,
      type: 'delivery',
      title: 'Giao hàng thành công',
      message: `Đã giao thành công cho ${customerName} - ${deliveryNumber}`,
      priority: 'low',
      actionUrl: `/deliveries/${deliveryNumber}`,
      actionType: 'view_delivery',
    });
  },

  deliveryFailed: async (userId: string, deliveryNumber: string, reason: string) => {
    await createOdoriNotification({
      userId,
      type: 'delivery',
      title: 'Giao hàng thất bại',
      message: `Đơn ${deliveryNumber} giao thất bại: ${reason}`,
      priority: 'urgent',
      actionUrl: `/deliveries/${deliveryNumber}`,
      actionType: 'view_delivery',
    });
  },

  // Payment notifications  
  paymentReceived: async (userId: string, amount: number, customerName: string, invoiceNumber?: string) => {
    await createOdoriNotification({
      userId,
      type: 'payment',
      title: 'Nhận thanh toán',
      message: `Đã nhận ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)} từ ${customerName}`,
      priority: 'normal',
      actionUrl: invoiceNumber ? `/receivables/${invoiceNumber}` : '/receivables',
      actionType: 'view_payment',
    });
  },

  paymentOverdue: async (userId: string, customerName: string, amount: number, daysOverdue: number) => {
    await createOdoriNotification({
      userId,
      type: 'payment',
      title: 'Công nợ quá hạn',
      message: `${customerName} còn nợ ${new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount)} - Quá hạn ${daysOverdue} ngày`,
      priority: 'urgent',
      actionUrl: '/receivables',
      actionType: 'view_receivables',
    });
  },

  // Inventory notifications
  lowStock: async (userId: string, productName: string, currentStock: number, minStock: number) => {
    await createOdoriNotification({
      userId,
      type: 'inventory',
      title: 'Tồn kho thấp',
      message: `${productName} còn ${currentStock} (Tối thiểu: ${minStock})`,
      priority: 'high',
      actionUrl: '/inventory',
      actionType: 'view_inventory',
    });
  },

  outOfStock: async (userId: string, productName: string) => {
    await createOdoriNotification({
      userId,
      type: 'inventory',
      title: 'Hết hàng',
      message: `${productName} đã hết hàng`,
      priority: 'urgent',
      actionUrl: '/inventory',
      actionType: 'view_inventory',
    });
  },

  // Customer notifications
  newCustomer: async (userId: string, customerName: string) => {
    await createOdoriNotification({
      userId,
      type: 'customer',
      title: 'Khách hàng mới',
      message: `${customerName} vừa được thêm vào hệ thống`,
      priority: 'low',
      actionUrl: '/customers',
      actionType: 'view_customers',
    });
  },

  // General alerts
  systemAlert: async (userId: string, title: string, message: string, priority: OdoriNotification['priority'] = 'normal') => {
    await createOdoriNotification({
      userId,
      type: 'alert',
      title,
      message,
      priority,
    });
  },
};
