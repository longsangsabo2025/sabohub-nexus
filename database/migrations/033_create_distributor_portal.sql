-- =============================================
-- Migration: Distributor Portal Foundation
-- Purpose: Self-service portal for distributors (NPP)
-- Created: 2026-01-15
-- =============================================

-- =============================================
-- 1. DISTRIBUTOR PORTALS
-- =============================================
CREATE TABLE IF NOT EXISTS public.distributor_portals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  
  -- Portal Configuration
  portal_code VARCHAR(50) UNIQUE NOT NULL,
  portal_name VARCHAR(200) NOT NULL,
  logo_url TEXT,
  theme_config JSONB DEFAULT '{}'::JSONB,
  
  -- Access Control
  is_active BOOLEAN DEFAULT true,
  allowed_features JSONB DEFAULT '["quick_order", "order_history", "invoices", "payments", "inventory", "promotions"]'::JSONB,
  
  -- Settings
  default_payment_method VARCHAR(50),
  auto_approve_orders BOOLEAN DEFAULT false,
  max_order_amount DECIMAL(15,2),
  min_order_amount DECIMAL(15,2),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  
  CONSTRAINT distributor_portals_customer_type_check 
    CHECK ((SELECT type FROM public.customers WHERE id = customer_id) IN ('distributor', 'wholesale'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_distributor_portals_company ON public.distributor_portals(company_id);
CREATE INDEX IF NOT EXISTS idx_distributor_portals_customer ON public.distributor_portals(customer_id);
CREATE INDEX IF NOT EXISTS idx_distributor_portals_active ON public.distributor_portals(is_active);

-- =============================================
-- 2. DISTRIBUTOR PRICE LISTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.distributor_price_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  portal_id UUID NOT NULL REFERENCES public.distributor_portals(id) ON DELETE CASCADE,
  
  -- Price List Info
  name VARCHAR(200) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  currency VARCHAR(3) DEFAULT 'VND',
  
  -- Validity
  valid_from DATE NOT NULL,
  valid_to DATE,
  is_active BOOLEAN DEFAULT true,
  
  -- Pricing Rules
  base_discount_percent DECIMAL(5,2) DEFAULT 0,
  volume_discount_rules JSONB DEFAULT '[]'::JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_distributor_price_lists_company ON public.distributor_price_lists(company_id);
CREATE INDEX IF NOT EXISTS idx_distributor_price_lists_portal ON public.distributor_price_lists(portal_id);
CREATE INDEX IF NOT EXISTS idx_distributor_price_lists_active ON public.distributor_price_lists(is_active);

-- =============================================
-- 3. DISTRIBUTOR PRICE LIST ITEMS
-- =============================================
CREATE TABLE IF NOT EXISTS public.distributor_price_list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  price_list_id UUID NOT NULL REFERENCES public.distributor_price_lists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Pricing
  unit_price DECIMAL(15,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  final_price DECIMAL(15,2) NOT NULL,
  
  -- Quantity Rules
  min_quantity INTEGER DEFAULT 1,
  max_quantity INTEGER,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT distributor_price_list_items_prices_check 
    CHECK (unit_price >= 0 AND final_price >= 0 AND discount_percent >= 0 AND discount_percent <= 100)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_distributor_price_list_items_list ON public.distributor_price_list_items(price_list_id);
CREATE INDEX IF NOT EXISTS idx_distributor_price_list_items_product ON public.distributor_price_list_items(product_id);

-- =============================================
-- 4. DISTRIBUTOR PROMOTIONS
-- =============================================
CREATE TABLE IF NOT EXISTS public.distributor_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  portal_id UUID REFERENCES public.distributor_portals(id) ON DELETE CASCADE,
  
  -- Promotion Info
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  promotion_type VARCHAR(50) NOT NULL, -- 'discount', 'buy_x_get_y', 'bundle', 'free_shipping', 'volume_discount'
  
  -- Validity
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  
  -- Rules
  conditions JSONB DEFAULT '{}'::JSONB, -- min_amount, min_quantity, specific_products, etc.
  benefits JSONB DEFAULT '{}'::JSONB,   -- discount_amount, discount_percent, free_items, etc.
  
  -- Usage Limits
  max_uses INTEGER,
  max_uses_per_customer INTEGER,
  current_uses INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  
  CONSTRAINT distributor_promotions_dates_check CHECK (start_date < end_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_distributor_promotions_company ON public.distributor_promotions(company_id);
CREATE INDEX IF NOT EXISTS idx_distributor_promotions_portal ON public.distributor_promotions(portal_id);
CREATE INDEX IF NOT EXISTS idx_distributor_promotions_active ON public.distributor_promotions(is_active);
CREATE INDEX IF NOT EXISTS idx_distributor_promotions_dates ON public.distributor_promotions(start_date, end_date);

-- =============================================
-- 5. QUICK ORDER TEMPLATES
-- =============================================
CREATE TABLE IF NOT EXISTS public.quick_order_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  portal_id UUID NOT NULL REFERENCES public.distributor_portals(id) ON DELETE CASCADE,
  
  -- Template Info
  name VARCHAR(200) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  
  -- Template Items (Product IDs + Quantities)
  items JSONB NOT NULL DEFAULT '[]'::JSONB,
  
  -- Usage Stats
  times_used INTEGER DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quick_order_templates_company ON public.quick_order_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_quick_order_templates_portal ON public.quick_order_templates(portal_id);

-- =============================================
-- 6. DISTRIBUTOR LOYALTY POINTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.distributor_loyalty_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  portal_id UUID NOT NULL REFERENCES public.distributor_portals(id) ON DELETE CASCADE,
  
  -- Points Balance
  total_earned DECIMAL(15,2) DEFAULT 0,
  total_redeemed DECIMAL(15,2) DEFAULT 0,
  current_balance DECIMAL(15,2) DEFAULT 0,
  
  -- Tier
  loyalty_tier VARCHAR(50) DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_distributor_loyalty_company ON public.distributor_loyalty_points(company_id);
CREATE INDEX IF NOT EXISTS idx_distributor_loyalty_portal ON public.distributor_loyalty_points(portal_id);

-- =============================================
-- 7. DISTRIBUTOR LOYALTY TRANSACTIONS
-- =============================================
CREATE TABLE IF NOT EXISTS public.distributor_loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  loyalty_account_id UUID NOT NULL REFERENCES public.distributor_loyalty_points(id) ON DELETE CASCADE,
  
  -- Transaction Info
  transaction_type VARCHAR(50) NOT NULL, -- 'earn', 'redeem', 'expire', 'adjustment'
  points DECIMAL(15,2) NOT NULL,
  balance_after DECIMAL(15,2) NOT NULL,
  
  -- Reference
  reference_type VARCHAR(50), -- 'order', 'payment', 'promotion'
  reference_id UUID,
  
  -- Notes
  description TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_distributor_loyalty_transactions_account ON public.distributor_loyalty_transactions(loyalty_account_id);
CREATE INDEX IF NOT EXISTS idx_distributor_loyalty_transactions_type ON public.distributor_loyalty_transactions(transaction_type);

-- =============================================
-- 8. DISTRIBUTOR PORTAL USERS
-- =============================================
CREATE TABLE IF NOT EXISTS public.distributor_portal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  portal_id UUID NOT NULL REFERENCES public.distributor_portals(id) ON DELETE CASCADE,
  
  -- User Info
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  phone VARCHAR(50),
  password_hash TEXT NOT NULL,
  
  -- Role
  role VARCHAR(50) DEFAULT 'user', -- 'admin', 'user', 'viewer'
  
  -- Access
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_distributor_portal_users_portal ON public.distributor_portal_users(portal_id);
CREATE INDEX IF NOT EXISTS idx_distributor_portal_users_email ON public.distributor_portal_users(email);
CREATE INDEX IF NOT EXISTS idx_distributor_portal_users_active ON public.distributor_portal_users(is_active);

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_distributor_portal_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_distributor_portals_timestamp
  BEFORE UPDATE ON public.distributor_portals
  FOR EACH ROW EXECUTE FUNCTION update_distributor_portal_timestamp();

CREATE TRIGGER update_distributor_price_lists_timestamp
  BEFORE UPDATE ON public.distributor_price_lists
  FOR EACH ROW EXECUTE FUNCTION update_distributor_portal_timestamp();

CREATE TRIGGER update_distributor_price_list_items_timestamp
  BEFORE UPDATE ON public.distributor_price_list_items
  FOR EACH ROW EXECUTE FUNCTION update_distributor_portal_timestamp();

CREATE TRIGGER update_distributor_promotions_timestamp
  BEFORE UPDATE ON public.distributor_promotions
  FOR EACH ROW EXECUTE FUNCTION update_distributor_portal_timestamp();

CREATE TRIGGER update_quick_order_templates_timestamp
  BEFORE UPDATE ON public.quick_order_templates
  FOR EACH ROW EXECUTE FUNCTION update_distributor_portal_timestamp();

CREATE TRIGGER update_distributor_loyalty_points_timestamp
  BEFORE UPDATE ON public.distributor_loyalty_points
  FOR EACH ROW EXECUTE FUNCTION update_distributor_portal_timestamp();

CREATE TRIGGER update_distributor_portal_users_timestamp
  BEFORE UPDATE ON public.distributor_portal_users
  FOR EACH ROW EXECUTE FUNCTION update_distributor_portal_timestamp();

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.distributor_portals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_price_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quick_order_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_loyalty_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_loyalty_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_portal_users ENABLE ROW LEVEL SECURITY;

-- Policies for distributor_portals
CREATE POLICY distributor_portals_isolation ON public.distributor_portals
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY distributor_price_lists_isolation ON public.distributor_price_lists
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY distributor_promotions_isolation ON public.distributor_promotions
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY quick_order_templates_isolation ON public.quick_order_templates
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY distributor_loyalty_points_isolation ON public.distributor_loyalty_points
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

-- Comments
COMMENT ON TABLE public.distributor_portals IS 'Self-service portals for distributors (NPP)';
COMMENT ON TABLE public.distributor_price_lists IS 'Custom price lists per distributor';
COMMENT ON TABLE public.distributor_promotions IS 'Promotions and special offers for distributors';
COMMENT ON TABLE public.quick_order_templates IS 'Saved order templates for quick reordering';
COMMENT ON TABLE public.distributor_loyalty_points IS 'Loyalty points program for distributors';
COMMENT ON TABLE public.distributor_portal_users IS 'Users who can access distributor portals';
