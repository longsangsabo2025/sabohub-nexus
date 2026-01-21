import { supabase } from '@/integrations/supabase/client';
import type { SalesOrder, SalesOrderItem } from '@/types/modules';

export interface CreateOrderItemInput {
  product_id: string;
  product_name: string;
  product_sku?: string;
  unit: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number;
  notes?: string;
}

export interface CreateOrderInput {
  customer_id: string;
  expected_delivery_date?: string;
  shipping_address?: string;
  notes?: string;
  items: CreateOrderItemInput[];
}

export interface UpdateOrderInput {
  expected_delivery_date?: string;
  shipping_address?: string;
  notes?: string;
  status?: 'draft' | 'pending' | 'approved' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
}

export interface OrderFilters {
  customerId?: string;
  status?: string;
  fromDate?: string;
  toDate?: string;
  salesRepId?: string;
  search?: string;
}

class OrderService {
  private getCompanyId(): string | null {
    return localStorage.getItem('company_id');
  }

  private getUserId(): string | null {
    return localStorage.getItem('user_id');
  }

  async getAll(filters: OrderFilters = {}): Promise<SalesOrder[]> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('sales_orders')
      .select(`
        *,
        customer:customer_id(id, name, code),
        sales_rep:sales_rep_id(id, display_name),
        approved_by:approved_by(id, display_name)
      `)
      .eq('company_id', companyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (filters.customerId) {
      query = query.eq('customer_id', filters.customerId);
    }
    if (filters.status) {
      query = query.eq('status', filters.status);
    }
    if (filters.salesRepId) {
      query = query.eq('sales_rep_id', filters.salesRepId);
    }
    if (filters.fromDate) {
      query = query.gte('order_date', filters.fromDate);
    }
    if (filters.toDate) {
      query = query.lte('order_date', filters.toDate);
    }
    if (filters.search) {
      query = query.ilike('order_number', `%${filters.search}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as SalesOrder[];
  }

  async getById(id: string): Promise<SalesOrder | null> {
    const { data, error } = await supabase
      .from('sales_orders')
      .select(`
        *,
        customer:customer_id(id, name, code, phone, email, address),
        sales_rep:sales_rep_id(id, display_name),
        approved_by:approved_by(id, display_name)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as SalesOrder;
  }

  async getOrderItems(orderId: string): Promise<SalesOrderItem[]> {
    const { data, error } = await supabase
      .from('sales_order_items')
      .select(`
        *,
        product:product_id(id, name, sku, barcode)
      `)
      .eq('order_id', orderId)
      .order('line_number');

    if (error) throw error;
    return data as SalesOrderItem[];
  }

  async create(input: CreateOrderInput): Promise<SalesOrder> {
    const companyId = this.getCompanyId();
    const userId = this.getUserId();
    if (!companyId) throw new Error('Company ID not found');

    // Generate order number
    const timestamp = Date.now().toString().slice(-8);
    const orderNumber = `SO${new Date().getFullYear()}${timestamp}`;

    // Calculate totals
    let subtotal = 0;
    const itemsWithTotals = input.items.map((item, index) => {
      const lineTotal = item.quantity * item.unit_price;
      const discountAmount = lineTotal * ((item.discount_percent || 0) / 100);
      const finalTotal = lineTotal - discountAmount;
      subtotal += finalTotal;
      return {
        ...item,
        line_number: index + 1,
        line_total: lineTotal,
        discount_amount: discountAmount,
      };
    });

    // Create order
    const { data: order, error: orderError } = await supabase
      .from('sales_orders')
      .insert({
        company_id: companyId,
        customer_id: input.customer_id,
        order_number: orderNumber,
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: input.expected_delivery_date,
        shipping_address: input.shipping_address,
        notes: input.notes,
        status: 'draft',
        subtotal,
        discount_total: itemsWithTotals.reduce((sum, item) => sum + item.discount_amount, 0),
        tax_total: 0, // Calculate based on tax rules
        total_amount: subtotal,
        sales_rep_id: userId,
        item_count: input.items.length,
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = itemsWithTotals.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      product_name: item.product_name,
      product_sku: item.product_sku,
      unit: item.unit,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percent: item.discount_percent || 0,
      discount_amount: item.discount_amount,
      line_total: item.line_total - item.discount_amount,
      line_number: item.line_number,
      notes: item.notes,
    }));

    const { error: itemsError } = await supabase
      .from('sales_order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    return order as SalesOrder;
  }

  async update(id: string, input: UpdateOrderInput): Promise<SalesOrder> {
    const { data, error } = await supabase
      .from('sales_orders')
      .update({
        ...input,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as SalesOrder;
  }

  async updateItems(orderId: string, items: CreateOrderItemInput[]): Promise<void> {
    // Delete existing items
    await supabase
      .from('sales_order_items')
      .delete()
      .eq('order_id', orderId);

    // Insert new items
    let subtotal = 0;
    const orderItems = items.map((item, index) => {
      const lineTotal = item.quantity * item.unit_price;
      const discountAmount = lineTotal * ((item.discount_percent || 0) / 100);
      subtotal += lineTotal - discountAmount;
      return {
        order_id: orderId,
        product_id: item.product_id,
        product_name: item.product_name,
        product_sku: item.product_sku,
        unit: item.unit,
        quantity: item.quantity,
        unit_price: item.unit_price,
        discount_percent: item.discount_percent || 0,
        discount_amount: discountAmount,
        line_total: lineTotal - discountAmount,
        line_number: index + 1,
        notes: item.notes,
      };
    });

    const { error: itemsError } = await supabase
      .from('sales_order_items')
      .insert(orderItems);

    if (itemsError) throw itemsError;

    // Update order totals
    await supabase
      .from('sales_orders')
      .update({
        subtotal,
        total_amount: subtotal,
        item_count: items.length,
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);
  }

  async approve(id: string): Promise<SalesOrder> {
    const userId = this.getUserId();
    
    const { data, error } = await supabase
      .from('sales_orders')
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as SalesOrder;
  }

  async cancel(id: string, reason?: string): Promise<SalesOrder> {
    const { data, error } = await supabase
      .from('sales_orders')
      .update({
        status: 'cancelled',
        notes: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as SalesOrder;
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('sales_orders')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  }

  async getStats(filters?: { fromDate?: string; toDate?: string }): Promise<{
    totalOrders: number;
    pendingOrders: number;
    approvedOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    totalRevenue: number;
    averageOrderValue: number;
  }> {
    const companyId = this.getCompanyId();
    if (!companyId) throw new Error('Company ID not found');

    let query = supabase
      .from('sales_orders')
      .select('status, total_amount')
      .eq('company_id', companyId)
      .is('deleted_at', null);

    if (filters?.fromDate) {
      query = query.gte('order_date', filters.fromDate);
    }
    if (filters?.toDate) {
      query = query.lte('order_date', filters.toDate);
    }

    const { data, error } = await query;
    if (error) throw error;

    const stats = {
      totalOrders: data.length,
      pendingOrders: data.filter(o => o.status === 'pending').length,
      approvedOrders: data.filter(o => o.status === 'approved').length,
      deliveredOrders: data.filter(o => o.status === 'delivered').length,
      cancelledOrders: data.filter(o => o.status === 'cancelled').length,
      totalRevenue: data.reduce((sum, o) => sum + (o.total_amount || 0), 0),
      averageOrderValue: 0,
    };

    if (stats.totalOrders > 0) {
      stats.averageOrderValue = stats.totalRevenue / stats.totalOrders;
    }

    return stats;
  }
}

export const orderService = new OrderService();
