// Types for new SABOHUB modules (Odori onboarding)

// =====================================================
// CUSTOMERS MODULE
// =====================================================
export interface Customer {
  id: string;
  company_id: string;
  branch_id?: string;
  code: string;
  name: string;
  type: 'retail' | 'wholesale' | 'distributor' | 'horeca' | 'agent';
  channel: 'gt' | 'mt' | 'horeca' | 'online' | 'other';
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  district?: string;
  ward?: string;
  lat?: number;
  lng?: number;
  tax_code?: string;
  payment_terms: number;
  credit_limit: number;
  current_debt: number;
  status: 'active' | 'inactive' | 'blacklisted';
  assigned_to?: string;
  tags?: string[];
  notes?: string;
  last_order_date?: string;
  total_orders: number;
  total_revenue: number;
  created_at: string;
  updated_at: string;
}

export interface CustomerContact {
  id: string;
  customer_id: string;
  name: string;
  title?: string;
  phone?: string;
  email?: string;
  is_primary: boolean;
  created_at: string;
}

export interface CustomerVisit {
  id: string;
  customer_id: string;
  employee_id: string;
  visit_date: string;
  check_in_time?: string;
  check_out_time?: string;
  check_in_lat?: number;
  check_in_lng?: number;
  check_out_lat?: number;
  check_out_lng?: number;
  purpose: string;
  notes?: string;
  outcome?: string;
  photos?: string[];
  next_action?: string;
  created_at: string;
}

// =====================================================
// PRODUCTS & INVENTORY MODULE
// =====================================================
export interface ProductCategory {
  id: string;
  company_id: string;
  parent_id?: string;
  name: string;
  slug: string;
  description?: string;
  image_url?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Product {
  id: string;
  company_id: string;
  category_id?: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  unit: string;
  pack_size: number;
  cost_price: number;
  selling_price: number;
  wholesale_price?: number;
  min_price?: number;
  tax_percent: number;
  min_stock: number;
  max_stock?: number;
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
  image_url?: string;
  images?: string[];
  status: 'active' | 'inactive' | 'discontinued';
  created_at: string;
  updated_at: string;
}

export interface Warehouse {
  id: string;
  company_id: string;
  branch_id?: string;
  code: string;
  name: string;
  address?: string;
  type: 'main' | 'transit' | 'return' | 'damage';
  manager_id?: string;
  is_active: boolean;
  created_at: string;
}

export interface Inventory {
  id: string;
  warehouse_id: string;
  product_id: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  last_counted_at?: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: string;
  company_id: string;
  warehouse_id: string;
  product_id: string;
  type: 'in' | 'out' | 'transfer' | 'adjustment' | 'return';
  quantity: number;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

// =====================================================
// SALES ORDERS MODULE
// =====================================================
export interface SalesOrder {
  id: string;
  company_id: string;
  branch_id?: string;
  warehouse_id?: string;
  customer_id: string;
  order_number: string;
  order_date: string;
  expected_delivery_date?: string;
  order_type: 'regular' | 'sample' | 'return' | 'exchange';
  source: 'sale_rep' | 'telesale' | 'online' | 'walk_in';
  status: 'draft' | 'pending_approval' | 'approved' | 'confirmed' | 'processing' | 'ready' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'unpaid' | 'partial' | 'paid' | 'refunded';
  delivery_status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'failed';
  subtotal: number;
  discount_amount: number;
  discount_percent?: number;
  tax_amount: number;
  shipping_fee: number;
  total_amount: number;
  paid_amount: number;
  shipping_address?: string;
  shipping_phone?: string;
  notes?: string;
  internal_notes?: string;
  approved_by?: string;
  approved_at?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Relations
  customer?: Customer;
  items?: SalesOrderItem[];
}

export interface SalesOrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  sku: string;
  unit: string;
  quantity: number;
  delivered_quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  tax_percent: number;
  tax_amount: number;
  line_total: number;
  notes?: string;
  
  // Relations
  product?: Product;
}

// =====================================================
// RECEIVABLES MODULE
// =====================================================
export interface Receivable {
  id: string;
  company_id: string;
  customer_id: string;
  order_id?: string;
  invoice_number?: string;
  invoice_date: string;
  due_date: string;
  original_amount: number;
  paid_amount: number;
  balance: number;
  status: 'pending' | 'partial' | 'paid' | 'overdue' | 'written_off';
  days_overdue: number;
  notes?: string;
  created_at: string;
  
  // Relations
  customer?: Customer;
}

export interface Payment {
  id: string;
  company_id: string;
  customer_id: string;
  payment_number: string;
  payment_date: string;
  amount: number;
  payment_method: 'cash' | 'bank_transfer' | 'check' | 'card' | 'ewallet' | 'other';
  reference?: string;
  status: 'pending' | 'confirmed' | 'rejected';
  attachments?: any[];
  created_by?: string;
  created_at: string;
  
  // Relations
  customer?: Customer;
}

// =====================================================
// DELIVERY MODULE
// =====================================================
export interface Delivery {
  id: string;
  company_id: string;
  warehouse_id?: string;
  delivery_number: string;
  delivery_date: string;
  driver_id?: string;
  helper_id?: string;
  vehicle?: string;
  vehicle_plate?: string;
  route_name?: string;
  planned_stops: number;
  completed_stops: number;
  failed_stops: number;
  total_orders: number;
  total_items: number;
  total_amount: number;
  collected_amount: number;
  planned_distance?: number;
  actual_distance?: number;
  status: 'planned' | 'loading' | 'in_progress' | 'completed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  start_lat?: number;
  start_lng?: number;
  end_lat?: number;
  end_lng?: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  
  // Relations
  driver?: { id: string; full_name: string };
  items?: DeliveryItem[];
}

export interface DeliveryItem {
  id: string;
  delivery_id: string;
  order_id: string;
  sequence: number;
  customer_name: string;
  customer_phone?: string;
  customer_address?: string;
  customer_lat?: number;
  customer_lng?: number;
  order_amount: number;
  collected_amount: number;
  status: 'pending' | 'in_transit' | 'delivered' | 'partial' | 'failed' | 'returned' | 'rescheduled';
  delivered_at?: string;
  delivery_lat?: number;
  delivery_lng?: number;
  receiver_name?: string;
  signature_url?: string;
  photos?: string[];
  failure_reason?: string;
  failure_notes?: string;
  reschedule_date?: string;
  notes?: string;
  
  // Relations
  order?: SalesOrder;
}

export interface DeliveryTracking {
  id: string;
  delivery_id: string;
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  recorded_at: string;
}

// =====================================================
// DEPARTMENT & PERMISSIONS
// =====================================================
export interface Department {
  id: string;
  company_id: string;
  code: string;
  name: string;
  description?: string;
  default_permissions?: Record<string, boolean | number>;
  parent_id?: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export type DepartmentCode = 
  | 'sales'
  | 'warehouse'
  | 'delivery'
  | 'customer_service'
  | 'finance'
  | 'production'
  | 'hr'
  | 'admin'
  | 'management'
  | 'other';

export interface EmployeePermissions {
  can_create_orders?: boolean;
  can_approve_orders?: boolean;
  can_view_all_customers?: boolean;
  can_collect_payments?: boolean;
  can_view_reports?: boolean;
  can_manage_inventory?: boolean;
  can_manage_deliveries?: boolean;
  max_discount_percent?: number;
  max_credit_limit?: number;
  [key: string]: boolean | number | undefined;
}
