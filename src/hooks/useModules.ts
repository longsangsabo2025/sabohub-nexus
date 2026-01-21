// Hooks for new SABOHUB modules
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { 
  Customer, 
  Product, 
  ProductCategory,
  Warehouse,
  Inventory,
  SalesOrder,
  Receivable,
  Payment,
  Delivery 
} from '@/types/modules';

// =====================================================
// CUSTOMERS HOOKS
// =====================================================
export function useCustomers(filters?: { 
  search?: string; 
  type?: string;
  status?: string;
  branch_id?: string;
}) {
  const { employeeUser } = useAuth();
  
  return useQuery({
    queryKey: ['customers', filters, employeeUser?.company_id],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .order('name', { ascending: true });

      if (employeeUser?.company_id) {
        query = query.eq('company_id', employeeUser.company_id);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,code.ilike.%${filters.search}%,phone.ilike.%${filters.search}%`);
      }
      if (filters?.type) {
        query = query.eq('type', filters.type);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.branch_id) {
        query = query.eq('branch_id', filters.branch_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Customer[];
    },
    enabled: !!employeeUser?.company_id,
  });
}

export function useCustomer(id: string) {
  return useQuery({
    queryKey: ['customer', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('*, customer_contacts(*)')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Customer & { customer_contacts: any[] };
    },
    enabled: !!id,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  const { employeeUser } = useAuth();

  return useMutation({
    mutationFn: async (customer: Partial<Customer>) => {
      const { data, error } = await supabase
        .from('customers')
        .insert({
          ...customer,
          company_id: employeeUser?.company_id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Customer> & { id: string }) => {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customer', variables.id] });
    },
  });
}

// =====================================================
// PRODUCTS HOOKS
// =====================================================
export function useProducts(filters?: {
  search?: string;
  category_id?: string;
  status?: string;
}) {
  const { employeeUser } = useAuth();

  return useQuery({
    queryKey: ['products', filters, employeeUser?.company_id],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*, product_categories(name)')
        .order('name', { ascending: true });

      if (employeeUser?.company_id) {
        query = query.eq('company_id', employeeUser.company_id);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,sku.ilike.%${filters.search}%,barcode.ilike.%${filters.search}%`);
      }
      if (filters?.category_id) {
        query = query.eq('category_id', filters.category_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (Product & { product_categories: { name: string } | null })[];
    },
    enabled: !!employeeUser?.company_id,
  });
}

export function useProductCategories() {
  const { employeeUser } = useAuth();

  return useQuery({
    queryKey: ['product_categories', employeeUser?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .eq('company_id', employeeUser?.company_id!)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return data as ProductCategory[];
    },
    enabled: !!employeeUser?.company_id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { employeeUser } = useAuth();

  return useMutation({
    mutationFn: async (product: Partial<Product>) => {
      const { data, error } = await supabase
        .from('products')
        .insert({
          ...product,
          company_id: employeeUser?.company_id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
}

// =====================================================
// INVENTORY HOOKS
// =====================================================
export function useWarehouses() {
  const { employeeUser } = useAuth();

  return useQuery({
    queryKey: ['warehouses', employeeUser?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('warehouses')
        .select('*')
        .eq('company_id', employeeUser?.company_id!)
        .eq('is_active', true)
        .order('name', { ascending: true });
      if (error) throw error;
      return data as Warehouse[];
    },
    enabled: !!employeeUser?.company_id,
  });
}

export function useInventory(warehouse_id?: string) {
  const { employeeUser } = useAuth();

  return useQuery({
    queryKey: ['inventory', warehouse_id, employeeUser?.company_id],
    queryFn: async () => {
      let query = supabase
        .from('inventory')
        .select('*, products(id, sku, name, unit, min_stock), warehouses(id, name)')
        .order('updated_at', { ascending: false });

      if (warehouse_id) {
        query = query.eq('warehouse_id', warehouse_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (Inventory & { 
        products: Pick<Product, 'id' | 'sku' | 'name' | 'unit' | 'min_stock'>;
        warehouses: Pick<Warehouse, 'id' | 'name'>;
      })[];
    },
    enabled: !!employeeUser?.company_id,
  });
}

// =====================================================
// SALES ORDERS HOOKS
// =====================================================
export function useSalesOrders(filters?: {
  status?: string;
  customer_id?: string;
  date_from?: string;
  date_to?: string;
}) {
  const { employeeUser } = useAuth();

  return useQuery({
    queryKey: ['sales_orders', filters, employeeUser?.company_id],
    queryFn: async () => {
      let query = supabase
        .from('sales_orders')
        .select('*, customers(id, name, code, phone)')
        .order('created_at', { ascending: false });

      if (employeeUser?.company_id) {
        query = query.eq('company_id', employeeUser.company_id);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      if (filters?.date_from) {
        query = query.gte('order_date', filters.date_from);
      }
      if (filters?.date_to) {
        query = query.lte('order_date', filters.date_to);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (SalesOrder & { customers: Pick<Customer, 'id' | 'name' | 'code' | 'phone'> })[];
    },
    enabled: !!employeeUser?.company_id,
  });
}

export function useSalesOrder(id: string) {
  return useQuery({
    queryKey: ['sales_order', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sales_orders')
        .select('*, customers(*), sales_order_items(*, products(*))')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as SalesOrder & { customers: Customer; sales_order_items: any[] };
    },
    enabled: !!id,
  });
}

export function useCreateSalesOrder() {
  const queryClient = useQueryClient();
  const { employeeUser, user } = useAuth();

  return useMutation({
    mutationFn: async (order: { 
      customer_id: string;
      items: { product_id: string; quantity: number; unit_price: number }[];
      notes?: string;
      expected_delivery_date?: string;
    }) => {
      // Calculate totals
      const subtotal = order.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
      
      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from('sales_orders')
        .insert({
          company_id: employeeUser?.company_id,
          customer_id: order.customer_id,
          order_date: new Date().toISOString().split('T')[0],
          expected_delivery_date: order.expected_delivery_date,
          subtotal,
          total_amount: subtotal, // Can add tax/discount later
          notes: order.notes,
          created_by: user?.id,
          status: 'draft',
        })
        .select()
        .single();
      
      if (orderError) throw orderError;

      // Create order items
      const items = order.items.map(item => ({
        order_id: orderData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        line_total: item.quantity * item.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from('sales_order_items')
        .insert(items);
      
      if (itemsError) throw itemsError;

      return orderData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales_orders'] });
    },
  });
}

// =====================================================
// RECEIVABLES HOOKS
// =====================================================
export function useReceivables(filters?: {
  status?: string;
  customer_id?: string;
}) {
  const { employeeUser } = useAuth();

  return useQuery({
    queryKey: ['receivables', filters, employeeUser?.company_id],
    queryFn: async () => {
      let query = supabase
        .from('receivables')
        .select('*, customers(id, name, code)')
        .order('due_date', { ascending: true });

      if (employeeUser?.company_id) {
        query = query.eq('company_id', employeeUser.company_id);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (Receivable & { customers: Pick<Customer, 'id' | 'name' | 'code'> })[];
    },
    enabled: !!employeeUser?.company_id,
  });
}

export function usePayments(filters?: {
  customer_id?: string;
  status?: string;
}) {
  const { employeeUser } = useAuth();

  return useQuery({
    queryKey: ['payments', filters, employeeUser?.company_id],
    queryFn: async () => {
      let query = supabase
        .from('payments')
        .select('*, customers(id, name, code)')
        .order('payment_date', { ascending: false });

      if (employeeUser?.company_id) {
        query = query.eq('company_id', employeeUser.company_id);
      }

      if (filters?.customer_id) {
        query = query.eq('customer_id', filters.customer_id);
      }
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (Payment & { customers: Pick<Customer, 'id' | 'name' | 'code'> })[];
    },
    enabled: !!employeeUser?.company_id,
  });
}

// =====================================================
// DELIVERY HOOKS
// =====================================================
export function useDeliveries(filters?: {
  status?: string;
  driver_id?: string;
  date?: string;
}) {
  const { employeeUser } = useAuth();

  return useQuery({
    queryKey: ['deliveries', filters, employeeUser?.company_id],
    queryFn: async () => {
      let query = supabase
        .from('deliveries')
        .select('*, employees!deliveries_driver_id_fkey(id, full_name)')
        .order('delivery_date', { ascending: false });

      if (employeeUser?.company_id) {
        query = query.eq('company_id', employeeUser.company_id);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.driver_id) {
        query = query.eq('driver_id', filters.driver_id);
      }
      if (filters?.date) {
        query = query.eq('delivery_date', filters.date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (Delivery & { employees: { id: string; full_name: string } | null })[];
    },
    enabled: !!employeeUser?.company_id,
  });
}

export function useDelivery(id: string) {
  return useQuery({
    queryKey: ['delivery', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('deliveries')
        .select('*, delivery_items(*, sales_orders(order_number, total_amount))')
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as Delivery & { delivery_items: any[] };
    },
    enabled: !!id,
  });
}
