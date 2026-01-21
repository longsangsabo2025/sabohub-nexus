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
  created_by UUID REFERENCES public.users(id)
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
-- =============================================
-- Migration: Sell-In / Sell-Out Tracking
-- Purpose: Track primary (sell-in) and secondary (sell-out) sales
-- Created: 2026-01-15
-- =============================================

-- =============================================
-- 1. SELL-IN TRANSACTIONS (Primary Sales: Company → Distributor)
-- =============================================
CREATE TABLE IF NOT EXISTS public.sell_in_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Transaction Info
  transaction_number VARCHAR(50) UNIQUE NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Parties
  distributor_id UUID NOT NULL REFERENCES public.customers(id), -- NPP/Distributor
  sales_rep_id UUID REFERENCES public.users(id),
  
  -- Related Documents
  sales_order_id UUID REFERENCES public.sales_orders(id),
  delivery_id UUID REFERENCES public.deliveries(id),
  invoice_number VARCHAR(100),
  
  -- Products & Values
  items JSONB NOT NULL DEFAULT '[]'::JSONB,
  total_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  tax DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Channel & Region
  channel VARCHAR(50), -- 'gt', 'mt', 'horeca'
  region VARCHAR(100),
  territory VARCHAR(100),
  
  -- Status
  status VARCHAR(50) DEFAULT 'completed', -- 'completed', 'returned', 'cancelled'
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sell_in_company ON public.sell_in_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_sell_in_distributor ON public.sell_in_transactions(distributor_id);
CREATE INDEX IF NOT EXISTS idx_sell_in_date ON public.sell_in_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_sell_in_channel ON public.sell_in_transactions(channel);
CREATE INDEX IF NOT EXISTS idx_sell_in_sales_rep ON public.sell_in_transactions(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_sell_in_status ON public.sell_in_transactions(status);

-- =============================================
-- 2. SELL-OUT TRANSACTIONS (Secondary Sales: Distributor → Retail)
-- =============================================
CREATE TABLE IF NOT EXISTS public.sell_out_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Transaction Info
  transaction_number VARCHAR(50) UNIQUE NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Parties
  distributor_id UUID NOT NULL REFERENCES public.customers(id), -- NPP reporting sell-out
  outlet_id UUID, -- Retail outlet (can be null if not in our system)
  outlet_name VARCHAR(200),
  outlet_type VARCHAR(50), -- 'retail', 'horeca', 'gt', 'mt'
  
  -- Related Sell-In
  sell_in_transaction_id UUID REFERENCES public.sell_in_transactions(id),
  
  -- Products & Values
  items JSONB NOT NULL DEFAULT '[]'::JSONB,
  total_quantity DECIMAL(15,3) NOT NULL DEFAULT 0,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Location
  channel VARCHAR(50), -- 'gt', 'mt', 'horeca'
  region VARCHAR(100),
  territory VARCHAR(100),
  city VARCHAR(100),
  
  -- Status
  status VARCHAR(50) DEFAULT 'completed', -- 'completed', 'returned', 'cancelled'
  
  -- Data Source
  source VARCHAR(50) DEFAULT 'manual', -- 'manual', 'pos', 'api', 'import'
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  reported_by VARCHAR(200) -- Who reported this (distributor name/user)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sell_out_company ON public.sell_out_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_sell_out_distributor ON public.sell_out_transactions(distributor_id);
CREATE INDEX IF NOT EXISTS idx_sell_out_date ON public.sell_out_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_sell_out_channel ON public.sell_out_transactions(channel);
CREATE INDEX IF NOT EXISTS idx_sell_out_outlet_type ON public.sell_out_transactions(outlet_type);
CREATE INDEX IF NOT EXISTS idx_sell_out_status ON public.sell_out_transactions(status);

-- =============================================
-- 3. DISTRIBUTOR INVENTORY (Stock at Distributor)
-- =============================================
CREATE TABLE IF NOT EXISTS public.distributor_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  distributor_id UUID NOT NULL REFERENCES public.customers(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  
  -- Stock Levels
  opening_stock DECIMAL(15,3) DEFAULT 0,
  current_stock DECIMAL(15,3) DEFAULT 0,
  committed_stock DECIMAL(15,3) DEFAULT 0,
  available_stock DECIMAL(15,3) GENERATED ALWAYS AS (current_stock - committed_stock) STORED,
  
  -- Reorder Levels
  min_stock DECIMAL(15,3) DEFAULT 0,
  max_stock DECIMAL(15,3),
  reorder_point DECIMAL(15,3),
  
  -- Valuation
  average_cost DECIMAL(15,2),
  total_value DECIMAL(15,2),
  
  -- Last Transaction
  last_sell_in_date DATE,
  last_sell_out_date DATE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT distributor_inventory_unique UNIQUE(distributor_id, product_id),
  CONSTRAINT distributor_inventory_stocks_check CHECK (
    opening_stock >= 0 AND 
    current_stock >= 0 AND 
    committed_stock >= 0 AND
    available_stock >= 0
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_distributor_inventory_company ON public.distributor_inventory(company_id);
CREATE INDEX IF NOT EXISTS idx_distributor_inventory_distributor ON public.distributor_inventory(distributor_id);
CREATE INDEX IF NOT EXISTS idx_distributor_inventory_product ON public.distributor_inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_distributor_inventory_low_stock ON public.distributor_inventory(distributor_id, product_id) 
  WHERE current_stock <= reorder_point;

-- =============================================
-- 4. SELL-THROUGH ANALYTICS (Calculated Metrics)
-- =============================================
CREATE TABLE IF NOT EXISTS public.sell_through_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Period
  period_type VARCHAR(20) NOT NULL, -- 'daily', 'weekly', 'monthly', 'quarterly'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Dimensions
  distributor_id UUID REFERENCES public.customers(id),
  product_id UUID REFERENCES public.products(id),
  channel VARCHAR(50),
  region VARCHAR(100),
  
  -- Sell-In Metrics
  sell_in_quantity DECIMAL(15,3) DEFAULT 0,
  sell_in_value DECIMAL(15,2) DEFAULT 0,
  
  -- Sell-Out Metrics
  sell_out_quantity DECIMAL(15,3) DEFAULT 0,
  sell_out_value DECIMAL(15,2) DEFAULT 0,
  
  -- Inventory Metrics
  opening_inventory DECIMAL(15,3) DEFAULT 0,
  closing_inventory DECIMAL(15,3) DEFAULT 0,
  average_inventory DECIMAL(15,3) DEFAULT 0,
  
  -- Calculated KPIs
  sell_through_rate DECIMAL(5,2), -- (Sell-out / Opening + Sell-in) * 100
  inventory_turnover DECIMAL(10,2), -- Sell-out / Average Inventory
  days_of_inventory DECIMAL(10,2), -- (Average Inventory / Sell-out) * Days in Period
  stock_cover_days INTEGER, -- Days until out of stock
  
  -- Metadata
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT sell_through_analytics_period_check CHECK (period_start <= period_end),
  CONSTRAINT sell_through_analytics_unique UNIQUE(
    period_type, period_start, period_end, 
    distributor_id, product_id, channel, region
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sell_through_company ON public.sell_through_analytics(company_id);
CREATE INDEX IF NOT EXISTS idx_sell_through_period ON public.sell_through_analytics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_sell_through_distributor ON public.sell_through_analytics(distributor_id);
CREATE INDEX IF NOT EXISTS idx_sell_through_product ON public.sell_through_analytics(product_id);
CREATE INDEX IF NOT EXISTS idx_sell_through_channel ON public.sell_through_analytics(channel);

-- =============================================
-- FUNCTIONS FOR AUTO-NUMBERING
-- =============================================
CREATE OR REPLACE FUNCTION generate_sell_in_number(p_company_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR := 'SI';
  v_date VARCHAR := TO_CHAR(CURRENT_DATE, 'YYYYMM');
  v_sequence INTEGER;
  v_number VARCHAR;
BEGIN
  -- Get max sequence for this month
  SELECT COALESCE(MAX(
    CAST(NULLIF(SUBSTRING(transaction_number FROM LENGTH(v_prefix) + 7), '') AS INTEGER)
  ), 0) + 1 INTO v_sequence
  FROM public.sell_in_transactions
  WHERE company_id = p_company_id
    AND transaction_number LIKE v_prefix || v_date || '%';
  
  v_number := v_prefix || v_date || LPAD(v_sequence::TEXT, 4, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_sell_out_number(p_company_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR := 'SO';
  v_date VARCHAR := TO_CHAR(CURRENT_DATE, 'YYYYMM');
  v_sequence INTEGER;
  v_number VARCHAR;
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(SUBSTRING(transaction_number FROM LENGTH(v_prefix) + 7), '') AS INTEGER)
  ), 0) + 1 INTO v_sequence
  FROM public.sell_out_transactions
  WHERE company_id = p_company_id
    AND transaction_number LIKE v_prefix || v_date || '%';
  
  v_number := v_prefix || v_date || LPAD(v_sequence::TEXT, 4, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS FOR INVENTORY UPDATE
-- =============================================
CREATE OR REPLACE FUNCTION update_distributor_inventory_on_sell_in()
RETURNS TRIGGER AS $$
DECLARE
  v_item JSONB;
  v_product_id UUID;
  v_quantity DECIMAL;
BEGIN
  -- Loop through items and update inventory
  FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::DECIMAL;
    
    INSERT INTO public.distributor_inventory (
      company_id, distributor_id, product_id, 
      opening_stock, current_stock, last_sell_in_date
    ) VALUES (
      NEW.company_id, NEW.distributor_id, v_product_id,
      v_quantity, v_quantity, NEW.transaction_date
    )
    ON CONFLICT (distributor_id, product_id) 
    DO UPDATE SET
      current_stock = distributor_inventory.current_stock + v_quantity,
      last_sell_in_date = NEW.transaction_date,
      updated_at = NOW();
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_sell_in
  AFTER INSERT ON public.sell_in_transactions
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_distributor_inventory_on_sell_in();

-- Similar trigger for sell-out
CREATE OR REPLACE FUNCTION update_distributor_inventory_on_sell_out()
RETURNS TRIGGER AS $$
DECLARE
  v_item JSONB;
  v_product_id UUID;
  v_quantity DECIMAL;
BEGIN
  FOR v_item IN SELECT * FROM jsonb_array_elements(NEW.items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_quantity := (v_item->>'quantity')::DECIMAL;
    
    UPDATE public.distributor_inventory
    SET 
      current_stock = current_stock - v_quantity,
      last_sell_out_date = NEW.transaction_date,
      updated_at = NOW()
    WHERE distributor_id = NEW.distributor_id 
      AND product_id = v_product_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inventory_sell_out
  AFTER INSERT ON public.sell_out_transactions
  FOR EACH ROW
  WHEN (NEW.status = 'completed')
  EXECUTE FUNCTION update_distributor_inventory_on_sell_out();

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.sell_in_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sell_out_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distributor_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sell_through_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY sell_in_isolation ON public.sell_in_transactions
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY sell_out_isolation ON public.sell_out_transactions
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY distributor_inventory_isolation ON public.distributor_inventory
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY sell_through_analytics_isolation ON public.sell_through_analytics
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

-- Comments
COMMENT ON TABLE public.sell_in_transactions IS 'Primary sales: Company → Distributor (Sell-In)';
COMMENT ON TABLE public.sell_out_transactions IS 'Secondary sales: Distributor → Retail (Sell-Out)';
COMMENT ON TABLE public.distributor_inventory IS 'Stock levels at distributor warehouses';
COMMENT ON TABLE public.sell_through_analytics IS 'Calculated sell-through metrics and KPIs';
-- =============================================
-- Migration: Sales Route Management
-- Purpose: Route planning, journey tracking, visit management
-- Created: 2026-01-15
-- =============================================

-- =============================================
-- 1. SALES ROUTES (Route Master Data)
-- =============================================
CREATE TABLE IF NOT EXISTS public.sales_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Route Info
  route_code VARCHAR(50) UNIQUE NOT NULL,
  route_name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Assignment
  assigned_to UUID REFERENCES public.users(id),
  backup_rep UUID REFERENCES public.users(id),
  
  -- Territory
  region VARCHAR(100),
  territory VARCHAR(100),
  channel VARCHAR(50), -- 'gt', 'mt', 'horeca'
  
  -- Schedule
  frequency VARCHAR(50) DEFAULT 'weekly', -- 'daily', 'weekly', 'biweekly', 'monthly'
  visit_days JSONB DEFAULT '[]'::JSONB, -- ['monday', 'wednesday', 'friday']
  
  -- Route Metrics
  total_customers INTEGER DEFAULT 0,
  active_customers INTEGER DEFAULT 0,
  estimated_duration_minutes INTEGER,
  total_distance_km DECIMAL(10,2),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_routes_company ON public.sales_routes(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_routes_assigned ON public.sales_routes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sales_routes_channel ON public.sales_routes(channel);
CREATE INDEX IF NOT EXISTS idx_sales_routes_active ON public.sales_routes(is_active);

-- =============================================
-- 2. ROUTE CUSTOMERS (Customers on Routes)
-- =============================================
CREATE TABLE IF NOT EXISTS public.route_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.sales_routes(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  
  -- Visit Schedule
  visit_sequence INTEGER NOT NULL, -- Order of visit on route
  preferred_visit_time TIME,
  estimated_duration_minutes INTEGER DEFAULT 30,
  
  -- Visit Frequency
  visit_frequency VARCHAR(50) DEFAULT 'every_visit', -- 'every_visit', 'weekly', 'biweekly', 'monthly'
  visit_days JSONB, -- Override route visit days if needed
  
  -- Location
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  address TEXT,
  
  -- Visit Requirements
  must_take_order BOOLEAN DEFAULT false,
  must_take_photo BOOLEAN DEFAULT false,
  must_check_inventory BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT route_customers_unique UNIQUE(route_id, customer_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_route_customers_route ON public.route_customers(route_id);
CREATE INDEX IF NOT EXISTS idx_route_customers_customer ON public.route_customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_route_customers_sequence ON public.route_customers(route_id, visit_sequence);

-- =============================================
-- 3. JOURNEY PLANS (Scheduled Route Execution)
-- =============================================
CREATE TABLE IF NOT EXISTS public.journey_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.sales_routes(id) ON DELETE CASCADE,
  
  -- Plan Info
  plan_number VARCHAR(50) UNIQUE NOT NULL,
  plan_date DATE NOT NULL,
  
  -- Assignment
  sales_rep_id UUID NOT NULL REFERENCES public.users(id),
  supervisor_id UUID REFERENCES public.users(id),
  
  -- Schedule
  planned_start_time TIMESTAMPTZ NOT NULL,
  planned_end_time TIMESTAMPTZ NOT NULL,
  
  -- Actual Execution
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  
  -- Customers
  planned_customers JSONB NOT NULL DEFAULT '[]'::JSONB,
  total_planned_visits INTEGER DEFAULT 0,
  completed_visits INTEGER DEFAULT 0,
  
  -- Metrics
  planned_distance_km DECIMAL(10,2),
  actual_distance_km DECIMAL(10,2),
  
  -- Status
  status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'in_progress', 'completed', 'cancelled'
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_journey_plans_company ON public.journey_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_journey_plans_route ON public.journey_plans(route_id);
CREATE INDEX IF NOT EXISTS idx_journey_plans_date ON public.journey_plans(plan_date);
CREATE INDEX IF NOT EXISTS idx_journey_plans_sales_rep ON public.journey_plans(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_journey_plans_status ON public.journey_plans(status);

-- =============================================
-- 4. JOURNEY CHECKINS (Real-time Visit Tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS public.journey_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  journey_plan_id UUID NOT NULL REFERENCES public.journey_plans(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  
  -- Check-in Info
  checkin_number VARCHAR(50) UNIQUE NOT NULL,
  visit_sequence INTEGER,
  
  -- Location (Check-in)
  checkin_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checkin_latitude DECIMAL(10,8) NOT NULL,
  checkin_longitude DECIMAL(11,8) NOT NULL,
  checkin_address TEXT,
  checkin_photo_url TEXT,
  
  -- Location (Check-out)
  checkout_time TIMESTAMPTZ,
  checkout_latitude DECIMAL(10,8),
  checkout_longitude DECIMAL(11,8),
  checkout_address TEXT,
  checkout_photo_url TEXT,
  
  -- Visit Details
  visit_duration_minutes INTEGER,
  distance_from_customer_m DECIMAL(10,2), -- Distance from actual customer location
  
  -- Visit Activities
  activities_completed JSONB DEFAULT '[]'::JSONB, -- ['took_order', 'checked_inventory', 'took_photo']
  
  -- Visit Type
  visit_type VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'unscheduled', 'emergency'
  visit_purpose VARCHAR(100),
  
  -- Status
  status VARCHAR(50) DEFAULT 'checked_in', -- 'checked_in', 'checked_out', 'cancelled'
  
  -- Notes & Issues
  notes TEXT,
  issues TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_journey_checkins_company ON public.journey_checkins(company_id);
CREATE INDEX IF NOT EXISTS idx_journey_checkins_journey ON public.journey_checkins(journey_plan_id);
CREATE INDEX IF NOT EXISTS idx_journey_checkins_customer ON public.journey_checkins(customer_id);
CREATE INDEX IF NOT EXISTS idx_journey_checkins_time ON public.journey_checkins(checkin_time);
CREATE INDEX IF NOT EXISTS idx_journey_checkins_status ON public.journey_checkins(status);

-- =============================================
-- 5. ROUTE OPTIMIZATION LOGS
-- =============================================
CREATE TABLE IF NOT EXISTS public.route_optimization_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  route_id UUID REFERENCES public.sales_routes(id) ON DELETE CASCADE,
  
  -- Optimization Info
  optimization_date DATE NOT NULL DEFAULT CURRENT_DATE,
  algorithm VARCHAR(50), -- 'google_maps', 'manual', 'genetic_algorithm'
  
  -- Before Optimization
  original_sequence JSONB,
  original_distance_km DECIMAL(10,2),
  original_duration_minutes INTEGER,
  
  -- After Optimization
  optimized_sequence JSONB,
  optimized_distance_km DECIMAL(10,2),
  optimized_duration_minutes INTEGER,
  
  -- Improvements
  distance_saved_km DECIMAL(10,2),
  time_saved_minutes INTEGER,
  improvement_percent DECIMAL(5,2),
  
  -- Status
  is_applied BOOLEAN DEFAULT false,
  applied_by UUID REFERENCES public.users(id),
  applied_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_route_optimization_company ON public.route_optimization_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_route_optimization_route ON public.route_optimization_logs(route_id);
CREATE INDEX IF NOT EXISTS idx_route_optimization_date ON public.route_optimization_logs(optimization_date);

-- =============================================
-- 6. SALES REP LOCATIONS (Real-time GPS Tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS public.sales_rep_locations (
  id UUID DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sales_rep_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  journey_plan_id UUID REFERENCES public.journey_plans(id),
  
  -- Location
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  accuracy_meters DECIMAL(10,2),
  altitude_meters DECIMAL(10,2),
  
  -- Speed & Heading
  speed_kmh DECIMAL(10,2),
  heading_degrees DECIMAL(5,2),
  
  -- Activity
  activity_type VARCHAR(50), -- 'moving', 'stationary', 'in_vehicle'
  
  -- Battery & Network
  battery_level INTEGER,
  network_type VARCHAR(50),
  
  -- Timestamp
  recorded_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  PRIMARY KEY (id, recorded_at)
) PARTITION BY RANGE (recorded_at);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_rep_locations_rep ON public.sales_rep_locations(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_sales_rep_locations_journey ON public.sales_rep_locations(journey_plan_id);
CREATE INDEX IF NOT EXISTS idx_sales_rep_locations_time ON public.sales_rep_locations(recorded_at);

-- Partition by month for performance
CREATE TABLE IF NOT EXISTS public.sales_rep_locations_2026_01 PARTITION OF public.sales_rep_locations
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- =============================================
-- FUNCTIONS FOR AUTO-NUMBERING
-- =============================================
CREATE OR REPLACE FUNCTION generate_journey_plan_number(p_company_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR := 'JP';
  v_date VARCHAR := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  v_sequence INTEGER;
  v_number VARCHAR;
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(SUBSTRING(plan_number FROM LENGTH(v_prefix) + 9), '') AS INTEGER)
  ), 0) + 1 INTO v_sequence
  FROM public.journey_plans
  WHERE company_id = p_company_id
    AND plan_number LIKE v_prefix || v_date || '%';
  
  v_number := v_prefix || v_date || LPAD(v_sequence::TEXT, 3, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_checkin_number(p_company_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR := 'CK';
  v_date VARCHAR := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  v_sequence INTEGER;
  v_number VARCHAR;
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(SUBSTRING(checkin_number FROM LENGTH(v_prefix) + 9), '') AS INTEGER)
  ), 0) + 1 INTO v_sequence
  FROM public.journey_checkins
  WHERE company_id = p_company_id
    AND checkin_number LIKE v_prefix || v_date || '%';
  
  v_number := v_prefix || v_date || LPAD(v_sequence::TEXT, 4, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_sales_route_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sales_routes_timestamp
  BEFORE UPDATE ON public.sales_routes
  FOR EACH ROW EXECUTE FUNCTION update_sales_route_timestamp();

CREATE TRIGGER update_route_customers_timestamp
  BEFORE UPDATE ON public.route_customers
  FOR EACH ROW EXECUTE FUNCTION update_sales_route_timestamp();

CREATE TRIGGER update_journey_plans_timestamp
  BEFORE UPDATE ON public.journey_plans
  FOR EACH ROW EXECUTE FUNCTION update_sales_route_timestamp();

CREATE TRIGGER update_journey_checkins_timestamp
  BEFORE UPDATE ON public.journey_checkins
  FOR EACH ROW EXECUTE FUNCTION update_sales_route_timestamp();

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.sales_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_optimization_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_rep_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY sales_routes_isolation ON public.sales_routes
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY journey_plans_isolation ON public.journey_plans
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY journey_checkins_isolation ON public.journey_checkins
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY route_optimization_logs_isolation ON public.route_optimization_logs
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY sales_rep_locations_isolation ON public.sales_rep_locations
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

-- Comments
COMMENT ON TABLE public.sales_routes IS 'Sales route master data with assigned territories';
COMMENT ON TABLE public.route_customers IS 'Customers assigned to specific sales routes';
COMMENT ON TABLE public.journey_plans IS 'Scheduled route executions with planning details';
COMMENT ON TABLE public.journey_checkins IS 'Real-time visit tracking with GPS check-in/out';
COMMENT ON TABLE public.route_optimization_logs IS 'Route optimization history and improvements';
COMMENT ON TABLE public.sales_rep_locations IS 'Real-time GPS tracking of sales representatives';
-- =============================================
-- Migration: Store Visit Management
-- Purpose: Store visit checklists, photo capture, competitor tracking
-- Created: 2026-01-15
-- =============================================

-- =============================================
-- 1. VISIT CHECKLISTS (Template for Store Visits)
-- =============================================
CREATE TABLE IF NOT EXISTS public.visit_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Checklist Info
  checklist_code VARCHAR(50) UNIQUE NOT NULL,
  checklist_name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Applicability
  channel VARCHAR(50), -- 'gt', 'mt', 'horeca', 'all'
  customer_type VARCHAR(50), -- 'retail', 'wholesale', 'distributor', 'all'
  
  -- Checklist Items
  items JSONB NOT NULL DEFAULT '[]'::JSONB,
  /* Example structure:
  [
    {
      "id": "uuid",
      "category": "inventory",
      "question": "Check product availability",
      "type": "boolean|number|text|photo|multi_select",
      "required": true,
      "options": ["option1", "option2"],
      "scoring": {"yes": 10, "no": 0}
    }
  ]
  */
  
  -- Scoring
  max_score INTEGER DEFAULT 100,
  passing_score INTEGER DEFAULT 70,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_visit_checklists_company ON public.visit_checklists(company_id);
CREATE INDEX IF NOT EXISTS idx_visit_checklists_channel ON public.visit_checklists(channel);
CREATE INDEX IF NOT EXISTS idx_visit_checklists_active ON public.visit_checklists(is_active);

-- =============================================
-- 2. STORE VISITS (Actual Visit Records)
-- =============================================
CREATE TABLE IF NOT EXISTS public.store_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Visit Info
  visit_number VARCHAR(50) UNIQUE NOT NULL,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Customer & Location
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  store_name VARCHAR(200),
  store_address TEXT,
  
  -- Visited By
  sales_rep_id UUID NOT NULL REFERENCES public.users(id),
  supervisor_id UUID REFERENCES public.users(id),
  
  -- Related Journey
  journey_plan_id UUID REFERENCES public.journey_plans(id),
  checkin_id UUID REFERENCES public.journey_checkins(id),
  
  -- Visit Type & Purpose
  visit_type VARCHAR(50) DEFAULT 'routine', -- 'routine', 'survey', 'merchandising', 'complaint', 'collection'
  visit_purpose TEXT,
  
  -- Checklist
  checklist_id UUID REFERENCES public.visit_checklists(id),
  checklist_responses JSONB DEFAULT '{}'::JSONB,
  checklist_score INTEGER,
  checklist_max_score INTEGER,
  checklist_passed BOOLEAN,
  
  -- Visit Duration
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  
  -- Photos
  photos JSONB DEFAULT '[]'::JSONB, -- Array of {category, url, caption, timestamp}
  
  -- Observations
  observations TEXT,
  issues TEXT,
  recommendations TEXT,
  
  -- Follow-up
  requires_followup BOOLEAN DEFAULT false,
  followup_date DATE,
  followup_notes TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'completed', -- 'in_progress', 'completed', 'cancelled'
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_store_visits_company ON public.store_visits(company_id);
CREATE INDEX IF NOT EXISTS idx_store_visits_customer ON public.store_visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_visits_date ON public.store_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_store_visits_sales_rep ON public.store_visits(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_store_visits_status ON public.store_visits(status);
CREATE INDEX IF NOT EXISTS idx_store_visits_journey ON public.store_visits(journey_plan_id);

-- =============================================
-- 3. STORE INVENTORY CHECKS (Shelf Stock Tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS public.store_inventory_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_visit_id UUID NOT NULL REFERENCES public.store_visits(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  
  -- Stock Levels
  shelf_stock INTEGER DEFAULT 0,
  back_stock INTEGER DEFAULT 0,
  total_stock INTEGER GENERATED ALWAYS AS (shelf_stock + back_stock) STORED,
  
  -- Stock Status
  is_out_of_stock BOOLEAN DEFAULT false,
  is_low_stock BOOLEAN DEFAULT false,
  is_expired BOOLEAN DEFAULT false,
  expiry_date DATE,
  
  -- Shelf Visibility
  has_shelf_space BOOLEAN DEFAULT true,
  shelf_position VARCHAR(50), -- 'eye_level', 'top_shelf', 'bottom_shelf', 'end_cap'
  shelf_share INTEGER, -- Number of facings
  
  -- Pricing
  current_price DECIMAL(15,2),
  competitor_price DECIMAL(15,2),
  price_difference DECIMAL(15,2),
  on_promotion BOOLEAN DEFAULT false,
  promotion_details TEXT,
  
  -- Photos
  photo_url TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_store_inventory_checks_visit ON public.store_inventory_checks(store_visit_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_checks_product ON public.store_inventory_checks(product_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_checks_oos ON public.store_inventory_checks(store_visit_id) 
  WHERE is_out_of_stock = true;

-- =============================================
-- 4. COMPETITOR TRACKING
-- =============================================
CREATE TABLE IF NOT EXISTS public.competitor_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_visit_id UUID NOT NULL REFERENCES public.store_visits(id) ON DELETE CASCADE,
  
  -- Competitor Info
  competitor_name VARCHAR(200) NOT NULL,
  competitor_brand VARCHAR(200),
  competitor_product VARCHAR(200),
  
  -- Product Details
  product_category VARCHAR(100),
  product_description TEXT,
  package_size VARCHAR(100),
  
  -- Pricing
  price DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'VND',
  
  -- Shelf Presence
  shelf_position VARCHAR(50),
  shelf_share INTEGER, -- Number of facings
  display_type VARCHAR(50), -- 'shelf', 'end_cap', 'free_standing', 'counter'
  
  -- Promotion
  has_promotion BOOLEAN DEFAULT false,
  promotion_type VARCHAR(100),
  promotion_details TEXT,
  
  -- Stock
  stock_level VARCHAR(50), -- 'high', 'medium', 'low', 'out_of_stock'
  
  -- Photos
  photos JSONB DEFAULT '[]'::JSONB,
  
  -- Analysis
  threat_level VARCHAR(50), -- 'high', 'medium', 'low'
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_competitor_tracking_company ON public.competitor_tracking(company_id);
CREATE INDEX IF NOT EXISTS idx_competitor_tracking_visit ON public.competitor_tracking(store_visit_id);
CREATE INDEX IF NOT EXISTS idx_competitor_tracking_competitor ON public.competitor_tracking(competitor_name);
CREATE INDEX IF NOT EXISTS idx_competitor_tracking_threat ON public.competitor_tracking(threat_level);

-- =============================================
-- 5. POS MATERIALS (Point of Sale Materials Tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS public.pos_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Material Info
  material_code VARCHAR(50) UNIQUE NOT NULL,
  material_name VARCHAR(200) NOT NULL,
  material_type VARCHAR(50) NOT NULL, -- 'poster', 'wobbler', 'shelf_talker', 'standee', 'banner', 'cooler'
  description TEXT,
  
  -- Specifications
  size VARCHAR(50),
  quantity_in_stock INTEGER DEFAULT 0,
  cost_per_unit DECIMAL(15,2),
  
  -- Photo
  photo_url TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pos_materials_company ON public.pos_materials(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_materials_type ON public.pos_materials(material_type);
CREATE INDEX IF NOT EXISTS idx_pos_materials_active ON public.pos_materials(is_active);

-- =============================================
-- 6. POS MATERIAL DEPLOYMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.pos_material_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_visit_id UUID NOT NULL REFERENCES public.store_visits(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.pos_materials(id),
  
  -- Deployment Info
  quantity_deployed INTEGER NOT NULL,
  placement_location VARCHAR(100), -- 'window', 'entrance', 'shelf', 'counter', 'cooler'
  
  -- Condition
  condition VARCHAR(50) DEFAULT 'new', -- 'new', 'good', 'damaged', 'missing'
  
  -- Photos
  before_photo_url TEXT,
  after_photo_url TEXT,
  
  -- Tracking
  deployed_by UUID REFERENCES public.users(id),
  deployed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Follow-up
  next_check_date DATE,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pos_deployments_company ON public.pos_material_deployments(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_deployments_visit ON public.pos_material_deployments(store_visit_id);
CREATE INDEX IF NOT EXISTS idx_pos_deployments_material ON public.pos_material_deployments(material_id);

-- =============================================
-- FUNCTIONS FOR AUTO-NUMBERING
-- =============================================
CREATE OR REPLACE FUNCTION generate_visit_number(p_company_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR := 'SV';
  v_date VARCHAR := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  v_sequence INTEGER;
  v_number VARCHAR;
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(SUBSTRING(visit_number FROM LENGTH(v_prefix) + 9), '') AS INTEGER)
  ), 0) + 1 INTO v_sequence
  FROM public.store_visits
  WHERE company_id = p_company_id
    AND visit_number LIKE v_prefix || v_date || '%';
  
  v_number := v_prefix || v_date || LPAD(v_sequence::TEXT, 4, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_store_visit_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_visit_checklists_timestamp
  BEFORE UPDATE ON public.visit_checklists
  FOR EACH ROW EXECUTE FUNCTION update_store_visit_timestamp();

CREATE TRIGGER update_store_visits_timestamp
  BEFORE UPDATE ON public.store_visits
  FOR EACH ROW EXECUTE FUNCTION update_store_visit_timestamp();

CREATE TRIGGER update_competitor_tracking_timestamp
  BEFORE UPDATE ON public.competitor_tracking
  FOR EACH ROW EXECUTE FUNCTION update_store_visit_timestamp();

CREATE TRIGGER update_pos_materials_timestamp
  BEFORE UPDATE ON public.pos_materials
  FOR EACH ROW EXECUTE FUNCTION update_store_visit_timestamp();

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.visit_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_inventory_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_material_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY visit_checklists_isolation ON public.visit_checklists
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY store_visits_isolation ON public.store_visits
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY competitor_tracking_isolation ON public.competitor_tracking
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY pos_materials_isolation ON public.pos_materials
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY pos_deployments_isolation ON public.pos_material_deployments
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

-- Comments
COMMENT ON TABLE public.visit_checklists IS 'Checklist templates for store visits';
COMMENT ON TABLE public.store_visits IS 'Store visit records with observations and photos';
COMMENT ON TABLE public.store_inventory_checks IS 'Shelf stock tracking during visits';
COMMENT ON TABLE public.competitor_tracking IS 'Competitor product and pricing tracking';
COMMENT ON TABLE public.pos_materials IS 'Point of sale materials inventory';
COMMENT ON TABLE public.pos_material_deployments IS 'POS material deployment tracking';
-- =============================================
-- Migration: Full Accounting Module
-- Purpose: Chart of Accounts, General Ledger, Journal Entries, Financial Statements
-- Created: 2026-01-15
-- =============================================

-- =============================================
-- 1. CHART OF ACCOUNTS (Account Master Data)
-- =============================================
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Account Info
  account_code VARCHAR(50) UNIQUE NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  account_name_en VARCHAR(200),
  description TEXT,
  
  -- Account Classification
  account_type VARCHAR(50) NOT NULL, -- 'asset', 'liability', 'equity', 'revenue', 'expense'
  account_subtype VARCHAR(50), -- 'current_asset', 'fixed_asset', 'current_liability', 'long_term_liability', etc.
  account_category VARCHAR(100), -- 'cash', 'inventory', 'ar', 'ap', 'sales', 'cogs', 'operating_expense', etc.
  
  -- Hierarchy
  parent_account_id UUID REFERENCES public.chart_of_accounts(id),
  level INTEGER DEFAULT 1,
  path TEXT, -- Hierarchical path like '1000/1100/1110'
  
  -- Balance Type
  normal_balance VARCHAR(10) NOT NULL, -- 'debit', 'credit'
  
  -- Account Behavior
  is_header BOOLEAN DEFAULT false, -- Header accounts cannot have transactions
  is_control_account BOOLEAN DEFAULT false,
  is_reconcilable BOOLEAN DEFAULT false,
  
  -- Opening Balance
  opening_balance DECIMAL(15,2) DEFAULT 0,
  opening_balance_date DATE,
  
  -- Restrictions
  allow_manual_journal BOOLEAN DEFAULT true,
  currency VARCHAR(3) DEFAULT 'VND',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_system_account BOOLEAN DEFAULT false, -- System accounts cannot be deleted
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coa_company ON public.chart_of_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_coa_type ON public.chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_coa_parent ON public.chart_of_accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_coa_active ON public.chart_of_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_coa_path ON public.chart_of_accounts USING gin(to_tsvector('simple', path));

-- =============================================
-- 2. GENERAL LEDGER (Account Balances)
-- =============================================
CREATE TABLE IF NOT EXISTS public.general_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
  
  -- Period
  fiscal_year INTEGER NOT NULL,
  fiscal_period INTEGER NOT NULL, -- 1-12 for monthly, 1-4 for quarterly
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  
  -- Balances
  opening_balance_debit DECIMAL(15,2) DEFAULT 0,
  opening_balance_credit DECIMAL(15,2) DEFAULT 0,
  opening_balance DECIMAL(15,2) DEFAULT 0,
  
  period_debit DECIMAL(15,2) DEFAULT 0,
  period_credit DECIMAL(15,2) DEFAULT 0,
  period_net DECIMAL(15,2) DEFAULT 0,
  
  closing_balance_debit DECIMAL(15,2) DEFAULT 0,
  closing_balance_credit DECIMAL(15,2) DEFAULT 0,
  closing_balance DECIMAL(15,2) DEFAULT 0,
  
  -- Status
  is_closed BOOLEAN DEFAULT false,
  closed_by UUID REFERENCES public.users(id),
  closed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT gl_unique_period UNIQUE(company_id, account_id, fiscal_year, fiscal_period)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gl_company ON public.general_ledger(company_id);
CREATE INDEX IF NOT EXISTS idx_gl_account ON public.general_ledger(account_id);
CREATE INDEX IF NOT EXISTS idx_gl_period ON public.general_ledger(fiscal_year, fiscal_period);
CREATE INDEX IF NOT EXISTS idx_gl_dates ON public.general_ledger(period_start_date, period_end_date);

-- =============================================
-- 3. JOURNAL ENTRIES (Accounting Transactions)
-- =============================================
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Entry Info
  entry_number VARCHAR(50) UNIQUE NOT NULL,
  entry_date DATE NOT NULL,
  posting_date DATE NOT NULL,
  
  -- Period
  fiscal_year INTEGER NOT NULL,
  fiscal_period INTEGER NOT NULL,
  
  -- Entry Type
  entry_type VARCHAR(50) NOT NULL, -- 'manual', 'automatic', 'adjustment', 'closing', 'opening'
  source_module VARCHAR(50), -- 'sales', 'purchase', 'inventory', 'payroll', 'manual'
  source_document_type VARCHAR(50), -- 'invoice', 'payment', 'receipt', 'purchase_order'
  source_document_id UUID,
  
  -- Description
  description TEXT NOT NULL,
  reference VARCHAR(100),
  
  -- Totals (must balance)
  total_debit DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_credit DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'posted', 'voided', 'reversed'
  
  -- Posting
  posted_by UUID REFERENCES public.users(id),
  posted_at TIMESTAMPTZ,
  
  -- Reversal
  reversed_by UUID REFERENCES public.users(id),
  reversed_at TIMESTAMPTZ,
  reversal_entry_id UUID REFERENCES public.journal_entries(id),
  
  -- Approval
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Attachments
  attachments JSONB DEFAULT '[]'::JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  
  CONSTRAINT je_balance_check CHECK (total_debit = total_credit)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_je_company ON public.journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_je_date ON public.journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_je_period ON public.journal_entries(fiscal_year, fiscal_period);
CREATE INDEX IF NOT EXISTS idx_je_status ON public.journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_je_type ON public.journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_je_source ON public.journal_entries(source_module, source_document_id);

-- =============================================
-- 4. JOURNAL ENTRY LINES (JE Line Items)
-- =============================================
CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  
  -- Line Info
  line_number INTEGER NOT NULL,
  description TEXT,
  
  -- Amounts
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  
  -- Dimensions (Cost Centers, Projects, etc.)
  cost_center VARCHAR(100),
  department VARCHAR(100),
  project_id UUID,
  
  -- Analytics
  dimension1 VARCHAR(100), -- Flexible dimension
  dimension2 VARCHAR(100),
  dimension3 VARCHAR(100),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT jel_amount_check CHECK (
    (debit > 0 AND credit = 0) OR 
    (credit > 0 AND debit = 0) OR 
    (debit = 0 AND credit = 0)
  ),
  CONSTRAINT jel_unique_line UNIQUE(journal_entry_id, line_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jel_entry ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_jel_account ON public.journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_jel_cost_center ON public.journal_entry_lines(cost_center);

-- =============================================
-- 5. FISCAL PERIODS
-- =============================================
CREATE TABLE IF NOT EXISTS public.fiscal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Period Info
  fiscal_year INTEGER NOT NULL,
  period_number INTEGER NOT NULL, -- 1-12 for monthly
  period_name VARCHAR(50) NOT NULL, -- 'January 2026', 'Q1 2026'
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'closed', 'locked'
  
  -- Closing
  closed_by UUID REFERENCES public.users(id),
  closed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fiscal_periods_unique UNIQUE(company_id, fiscal_year, period_number),
  CONSTRAINT fiscal_periods_dates_check CHECK (start_date < end_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_company ON public.fiscal_periods(company_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_year ON public.fiscal_periods(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_dates ON public.fiscal_periods(start_date, end_date);

-- =============================================
-- 6. FINANCIAL STATEMENTS CACHE
-- =============================================
CREATE TABLE IF NOT EXISTS public.financial_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Statement Info
  statement_type VARCHAR(50) NOT NULL, -- 'balance_sheet', 'income_statement', 'cash_flow', 'trial_balance'
  
  -- Period
  fiscal_year INTEGER NOT NULL,
  fiscal_period INTEGER, -- NULL for annual statements
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Statement Data (JSON format for flexibility)
  statement_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  
  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES public.users(id)
);

-- Unique index instead of constraint to allow COALESCE expression
CREATE UNIQUE INDEX IF NOT EXISTS idx_fs_unique_statement 
ON public.financial_statements(
  company_id, statement_type, fiscal_year, 
  COALESCE(fiscal_period, 0), start_date, end_date
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fs_company ON public.financial_statements(company_id);
CREATE INDEX IF NOT EXISTS idx_fs_type ON public.financial_statements(statement_type);
CREATE INDEX IF NOT EXISTS idx_fs_period ON public.financial_statements(fiscal_year, fiscal_period);

-- =============================================
-- FUNCTIONS FOR AUTO-NUMBERING
-- =============================================
CREATE OR REPLACE FUNCTION generate_journal_entry_number(p_company_id UUID, p_entry_type VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR;
  v_date VARCHAR := TO_CHAR(CURRENT_DATE, 'YYYYMM');
  v_sequence INTEGER;
  v_number VARCHAR;
BEGIN
  -- Different prefixes for different entry types
  v_prefix := CASE p_entry_type
    WHEN 'manual' THEN 'JE'
    WHEN 'automatic' THEN 'AJ'
    WHEN 'adjustment' THEN 'ADJ'
    WHEN 'closing' THEN 'CL'
    WHEN 'opening' THEN 'OP'
    ELSE 'JE'
  END;
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(SUBSTRING(entry_number FROM LENGTH(v_prefix) + 7), '') AS INTEGER)
  ), 0) + 1 INTO v_sequence
  FROM public.journal_entries
  WHERE company_id = p_company_id
    AND entry_type = p_entry_type
    AND entry_number LIKE v_prefix || v_date || '%';
  
  v_number := v_prefix || v_date || LPAD(v_sequence::TEXT, 4, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Update General Ledger on Journal Post
-- =============================================
CREATE OR REPLACE FUNCTION update_general_ledger_on_post()
RETURNS TRIGGER AS $$
DECLARE
  v_line RECORD;
  v_account RECORD;
BEGIN
  -- Only process when status changes to 'posted'
  IF NEW.status = 'posted' AND (OLD.status IS NULL OR OLD.status != 'posted') THEN
    
    -- Loop through all journal entry lines
    FOR v_line IN 
      SELECT * FROM public.journal_entry_lines 
      WHERE journal_entry_id = NEW.id
    LOOP
      -- Get account info
      SELECT * INTO v_account 
      FROM public.chart_of_accounts 
      WHERE id = v_line.account_id;
      
      -- Update or insert GL record for this period
      INSERT INTO public.general_ledger (
        company_id, account_id, fiscal_year, fiscal_period,
        period_start_date, period_end_date,
        period_debit, period_credit, period_net
      )
      SELECT 
        NEW.company_id, 
        v_line.account_id,
        NEW.fiscal_year,
        NEW.fiscal_period,
        fp.start_date,
        fp.end_date,
        v_line.debit,
        v_line.credit,
        CASE 
          WHEN v_account.normal_balance = 'debit' THEN v_line.debit - v_line.credit
          ELSE v_line.credit - v_line.debit
        END
      FROM public.fiscal_periods fp
      WHERE fp.company_id = NEW.company_id
        AND fp.fiscal_year = NEW.fiscal_year
        AND fp.period_number = NEW.fiscal_period
      
      ON CONFLICT (company_id, account_id, fiscal_year, fiscal_period)
      DO UPDATE SET
        period_debit = general_ledger.period_debit + v_line.debit,
        period_credit = general_ledger.period_credit + v_line.credit,
        period_net = general_ledger.period_net + CASE 
          WHEN v_account.normal_balance = 'debit' THEN v_line.debit - v_line.credit
          ELSE v_line.credit - v_line.debit
        END,
        updated_at = NOW();
        
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_gl_on_post
  AFTER INSERT OR UPDATE ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_general_ledger_on_post();

-- =============================================
-- FUNCTION: Seed Standard Chart of Accounts
-- =============================================
CREATE OR REPLACE FUNCTION seed_standard_chart_of_accounts(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
  -- ASSETS
  INSERT INTO public.chart_of_accounts (company_id, account_code, account_name, account_type, account_category, normal_balance, is_header, level) VALUES
  (p_company_id, '1000', 'ASSETS', 'asset', 'header', 'debit', true, 1),
  (p_company_id, '1100', 'Current Assets', 'asset', 'current_asset', 'debit', true, 2),
  (p_company_id, '1110', 'Cash & Bank', 'asset', 'cash', 'debit', false, 3),
  (p_company_id, '1120', 'Accounts Receivable', 'asset', 'ar', 'debit', false, 3),
  (p_company_id, '1130', 'Inventory', 'asset', 'inventory', 'debit', false, 3),
  (p_company_id, '1200', 'Fixed Assets', 'asset', 'fixed_asset', 'debit', true, 2),
  (p_company_id, '1210', 'Property & Equipment', 'asset', 'fixed_asset', 'debit', false, 3),
  (p_company_id, '1220', 'Accumulated Depreciation', 'asset', 'accumulated_depreciation', 'credit', false, 3),
  
  -- LIABILITIES
  (p_company_id, '2000', 'LIABILITIES', 'liability', 'header', 'credit', true, 1),
  (p_company_id, '2100', 'Current Liabilities', 'liability', 'current_liability', 'credit', true, 2),
  (p_company_id, '2110', 'Accounts Payable', 'liability', 'ap', 'credit', false, 3),
  (p_company_id, '2120', 'Accrued Expenses', 'liability', 'accrued', 'credit', false, 3),
  (p_company_id, '2200', 'Long-term Liabilities', 'liability', 'long_term_liability', 'credit', true, 2),
  (p_company_id, '2210', 'Long-term Debt', 'liability', 'debt', 'credit', false, 3),
  
  -- EQUITY
  (p_company_id, '3000', 'EQUITY', 'equity', 'header', 'credit', true, 1),
  (p_company_id, '3100', 'Owner''s Equity', 'equity', 'capital', 'credit', false, 2),
  (p_company_id, '3200', 'Retained Earnings', 'equity', 'retained_earnings', 'credit', false, 2),
  
  -- REVENUE
  (p_company_id, '4000', 'REVENUE', 'revenue', 'header', 'credit', true, 1),
  (p_company_id, '4100', 'Sales Revenue', 'revenue', 'sales', 'credit', false, 2),
  (p_company_id, '4200', 'Other Income', 'revenue', 'other_income', 'credit', false, 2),
  
  -- EXPENSES
  (p_company_id, '5000', 'COST OF GOODS SOLD', 'expense', 'cogs', 'debit', false, 1),
  (p_company_id, '6000', 'OPERATING EXPENSES', 'expense', 'header', 'debit', true, 1),
  (p_company_id, '6100', 'Salaries & Wages', 'expense', 'payroll', 'debit', false, 2),
  (p_company_id, '6200', 'Rent & Utilities', 'expense', 'overhead', 'debit', false, 2),
  (p_company_id, '6300', 'Marketing & Advertising', 'expense', 'marketing', 'debit', false, 2),
  (p_company_id, '6400', 'Depreciation', 'expense', 'depreciation', 'debit', false, 2);
  
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_accounting_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coa_timestamp
  BEFORE UPDATE ON public.chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION update_accounting_timestamp();

CREATE TRIGGER update_gl_timestamp
  BEFORE UPDATE ON public.general_ledger
  FOR EACH ROW EXECUTE FUNCTION update_accounting_timestamp();

CREATE TRIGGER update_je_timestamp
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_accounting_timestamp();

CREATE TRIGGER update_fiscal_periods_timestamp
  BEFORE UPDATE ON public.fiscal_periods
  FOR EACH ROW EXECUTE FUNCTION update_accounting_timestamp();

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY coa_isolation ON public.chart_of_accounts
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY gl_isolation ON public.general_ledger
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY je_isolation ON public.journal_entries
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY fiscal_periods_isolation ON public.fiscal_periods
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY fs_isolation ON public.financial_statements
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

-- Comments
COMMENT ON TABLE public.chart_of_accounts IS 'Master chart of accounts with hierarchical structure';
COMMENT ON TABLE public.general_ledger IS 'General ledger with period balances per account';
COMMENT ON TABLE public.journal_entries IS 'Accounting journal entries (header)';
COMMENT ON TABLE public.journal_entry_lines IS 'Journal entry line items (detail)';
COMMENT ON TABLE public.fiscal_periods IS 'Fiscal year periods and closing status';
COMMENT ON TABLE public.financial_statements IS 'Cached financial statements (P&L, Balance Sheet, Cash Flow)';
