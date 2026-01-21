// Types for Sell-In / Sell-Out Tracking Module
// Matches database schema from migration 034

export interface SellInTransaction {
  id: string;
  company_id: string;
  transaction_number: string;
  transaction_date: string;
  distributor_id: string;
  sales_rep_id?: string;
  sales_order_id?: string;
  delivery_id?: string;
  invoice_number?: string;
  items: SellInOutItem[];
  total_quantity: number;
  subtotal: number;
  discount: number;
  tax: number;
  total_amount: number;
  channel?: 'gt' | 'mt' | 'horeca';
  region?: string;
  territory?: string;
  status: 'completed' | 'returned' | 'cancelled';
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface SellOutTransaction {
  id: string;
  company_id: string;
  transaction_number: string;
  transaction_date: string;
  distributor_id: string;
  outlet_id?: string;
  outlet_name?: string;
  outlet_type?: 'retail' | 'horeca' | 'gt' | 'mt';
  sell_in_transaction_id?: string;
  items: SellInOutItem[];
  total_quantity: number;
  subtotal: number;
  discount: number;
  total_amount: number;
  channel?: 'gt' | 'mt' | 'horeca';
  region?: string;
  territory?: string;
  city?: string;
  status: 'completed' | 'returned' | 'cancelled';
  source: 'manual' | 'pos' | 'api' | 'import';
  reported_by?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface SellInOutItem {
  product_id: string;
  product_name?: string;
  product_sku?: string;
  quantity: number;
  unit?: string;
  unit_price: number;
  discount?: number;
  total: number;
}

export interface DistributorInventory {
  id: string;
  company_id: string;
  distributor_id: string;
  product_id: string;
  opening_stock: number;
  current_stock: number;
  committed_stock: number;
  available_stock: number;
  min_stock: number;
  max_stock?: number;
  reorder_point?: number;
  average_cost?: number;
  total_value?: number;
  last_sell_in_date?: string;
  last_sell_out_date?: string;
  created_at: string;
  updated_at: string;
}

export interface SellThroughAnalytics {
  id: string;
  company_id: string;
  period_type: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  period_start: string;
  period_end: string;
  distributor_id?: string;
  product_id?: string;
  channel?: string;
  region?: string;
  sell_in_quantity: number;
  sell_in_value: number;
  sell_out_quantity: number;
  sell_out_value: number;
  opening_inventory: number;
  closing_inventory: number;
  average_inventory: number;
  sell_through_rate?: number; // (Sell-out / (Opening + Sell-in)) * 100
  inventory_turnover?: number; // Sell-out / Average Inventory
  days_of_inventory?: number; // (Average Inventory / Sell-out) * Days
  stock_cover_days?: number;
  calculated_at: string;
}

// ===== INPUT TYPES FOR API =====

export interface CreateSellInInput {
  transaction_date: string;
  distributor_id: string;
  sales_rep_id?: string;
  sales_order_id?: string;
  delivery_id?: string;
  invoice_number?: string;
  items: Array<{
    product_id: string;
    product_name?: string;
    product_sku?: string;
    quantity: number;
    unit?: string;
    unit_price: number;
    discount?: number;
  }>;
  channel?: 'gt' | 'mt' | 'horeca';
  region?: string;
  territory?: string;
  notes?: string;
}

export interface CreateSellOutInput {
  transaction_date: string;
  distributor_id: string;
  outlet_id?: string;
  outlet_name?: string;
  outlet_type?: 'retail' | 'horeca' | 'gt' | 'mt';
  sell_in_transaction_id?: string;
  items: Array<{
    product_id: string;
    product_name?: string;
    product_sku?: string;
    quantity: number;
    unit?: string;
    unit_price: number;
    discount?: number;
  }>;
  channel?: 'gt' | 'mt' | 'horeca';
  region?: string;
  territory?: string;
  city?: string;
  source?: 'manual' | 'pos' | 'api' | 'import';
  reported_by?: string;
  notes?: string;
}

export interface SellInFilters {
  distributor_id?: string;
  sales_rep_id?: string;
  channel?: string;
  region?: string;
  from_date?: string;
  to_date?: string;
  status?: string;
}

export interface SellOutFilters {
  distributor_id?: string;
  outlet_type?: string;
  channel?: string;
  region?: string;
  from_date?: string;
  to_date?: string;
  status?: string;
  source?: string;
}

export interface DistributorInventoryFilters {
  distributor_id?: string;
  product_id?: string;
  low_stock_only?: boolean;
}

export interface AnalyticsFilters {
  period_type: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  period_start: string;
  period_end: string;
  distributor_id?: string;
  product_id?: string;
  channel?: string;
  region?: string;
}

export interface SellThroughMetrics {
  sell_in_total: number;
  sell_out_total: number;
  inventory_value: number;
  sell_through_rate: number;
  top_distributors: Array<{
    distributor_id: string;
    distributor_name: string;
    sell_in: number;
    sell_out: number;
    sell_through_rate: number;
  }>;
  top_products: Array<{
    product_id: string;
    product_name: string;
    sell_in: number;
    sell_out: number;
    sell_through_rate: number;
  }>;
  by_channel: Array<{
    channel: string;
    sell_in: number;
    sell_out: number;
    sell_through_rate: number;
  }>;
}
