// Types for Distributor Portal Module
// Matches database schema from migration 033

export interface DistributorPortal {
  id: string;
  company_id: string;
  customer_id: string;
  portal_code: string;
  portal_name: string;
  logo_url?: string;
  theme_config?: Record<string, any>;
  is_active: boolean;
  allowed_features: string[];
  default_payment_method?: string;
  auto_approve_orders: boolean;
  max_order_amount?: number;
  min_order_amount?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface DistributorPriceList {
  id: string;
  company_id: string;
  portal_id: string;
  name: string;
  code: string;
  description?: string;
  currency: string;
  valid_from: string;
  valid_to?: string;
  is_active: boolean;
  base_discount_percent: number;
  volume_discount_rules?: VolumeDiscountRule[];
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface VolumeDiscountRule {
  min_quantity: number;
  discount_percent: number;
}

export interface DistributorPriceListItem {
  id: string;
  price_list_id: string;
  product_id: string;
  unit_price: number;
  discount_percent: number;
  final_price: number;
  min_quantity: number;
  max_quantity?: number;
  created_at: string;
  updated_at: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    unit: string;
  };
}

export interface DistributorPromotion {
  id: string;
  company_id: string;
  portal_id?: string;
  code: string;
  name: string;
  description?: string;
  promotion_type: 'discount' | 'buy_x_get_y' | 'bundle' | 'free_shipping' | 'volume_discount';
  start_date: string;
  end_date: string;
  is_active: boolean;
  conditions: PromotionConditions;
  benefits: PromotionBenefits;
  max_uses?: number;
  max_uses_per_customer?: number;
  current_uses: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface PromotionConditions {
  min_amount?: number;
  min_quantity?: number;
  specific_products?: string[];
  specific_categories?: string[];
}

export interface PromotionBenefits {
  discount_amount?: number;
  discount_percent?: number;
  free_items?: Array<{ product_id: string; quantity: number }>;
  free_shipping?: boolean;
}

export interface QuickOrderTemplate {
  id: string;
  company_id: string;
  portal_id: string;
  name: string;
  description?: string;
  is_default: boolean;
  items: QuickOrderItem[];
  times_used: number;
  last_used_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

export interface QuickOrderItem {
  product_id: string;
  product_name?: string;
  quantity: number;
}

export interface DistributorLoyaltyPoints {
  id: string;
  company_id: string;
  portal_id: string;
  total_earned: number;
  total_redeemed: number;
  current_balance: number;
  loyalty_tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  created_at: string;
  updated_at: string;
}

export interface DistributorLoyaltyTransaction {
  id: string;
  loyalty_account_id: string;
  transaction_type: 'earn' | 'redeem' | 'expire' | 'adjustment';
  points: number;
  balance_after: number;
  reference_type?: 'order' | 'payment' | 'promotion';
  reference_id?: string;
  description?: string;
  created_at: string;
  created_by?: string;
}

export interface DistributorPortalUser {
  id: string;
  portal_id: string;
  email: string;
  full_name: string;
  phone?: string;
  password_hash: string;
  role: 'admin' | 'user' | 'viewer';
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
}

// ===== INPUT TYPES FOR API =====

export interface CreatePortalInput {
  customer_id: string;
  portal_name: string;
  logo_url?: string;
  theme_config?: Record<string, any>;
  allowed_features?: string[];
  default_payment_method?: string;
  auto_approve_orders?: boolean;
  max_order_amount?: number;
  min_order_amount?: number;
}

export interface UpdatePortalInput {
  portal_name?: string;
  logo_url?: string;
  theme_config?: Record<string, any>;
  is_active?: boolean;
  allowed_features?: string[];
  default_payment_method?: string;
  auto_approve_orders?: boolean;
  max_order_amount?: number;
  min_order_amount?: number;
}

export interface CreatePriceListInput {
  portal_id: string;
  name: string;
  description?: string;
  valid_from: string;
  valid_to?: string;
  base_discount_percent?: number;
  volume_discount_rules?: VolumeDiscountRule[];
  items: Array<{
    product_id: string;
    unit_price: number;
    discount_percent?: number;
    min_quantity?: number;
    max_quantity?: number;
  }>;
}

export interface CreatePromotionInput {
  portal_id?: string;
  name: string;
  description?: string;
  promotion_type: 'discount' | 'buy_x_get_y' | 'bundle' | 'free_shipping' | 'volume_discount';
  start_date: string;
  end_date: string;
  conditions: PromotionConditions;
  benefits: PromotionBenefits;
  max_uses?: number;
  max_uses_per_customer?: number;
}

export interface CreateQuickOrderTemplateInput {
  portal_id: string;
  name: string;
  description?: string;
  is_default?: boolean;
  items: QuickOrderItem[];
}

export interface QuickOrderInput {
  portal_id: string;
  template_id?: string;
  items: Array<{
    product_id: string;
    quantity: number;
  }>;
  notes?: string;
}

export interface PortalFilters {
  customer_id?: string;
  is_active?: boolean;
  search?: string;
}

export interface PriceListFilters {
  portal_id?: string;
  is_active?: boolean;
  valid_on_date?: string;
}

export interface PromotionFilters {
  portal_id?: string;
  is_active?: boolean;
  active_on_date?: string;
  promotion_type?: string;
}
