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
  created_by UUID REFERENCES public.users(id),
  
  CONSTRAINT sell_in_distributor_type_check 
    CHECK ((SELECT type FROM public.customers WHERE id = distributor_id) IN ('distributor', 'wholesale'))
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
