-- =====================================================
-- Migration: 022_sales_orders_module.sql
-- Description: B2B Sales Orders
-- Reusable: Yes (multi-tenant via company_id)
-- =====================================================

-- =====================================================
-- TABLE: sales_orders
-- Purpose: B2B sales orders (đơn đặt hàng)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  
  -- Order info
  order_number VARCHAR(50) NOT NULL,
  order_date DATE DEFAULT CURRENT_DATE,
  
  -- Customer
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  customer_name VARCHAR(255),
  customer_address TEXT,
  customer_phone VARCHAR(20),
  
  -- Salesperson
  sale_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  
  -- Warehouse for fulfillment
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  
  -- Amounts
  subtotal DECIMAL(15, 2) DEFAULT 0,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  tax_percent DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  shipping_amount DECIMAL(15, 2) DEFAULT 0,
  total DECIMAL(15, 2) DEFAULT 0,
  
  -- Payment
  payment_method VARCHAR(50),
  payment_status VARCHAR(20) DEFAULT 'unpaid',
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  due_date DATE,
  
  -- Delivery
  delivery_status VARCHAR(20) DEFAULT 'pending',
  delivery_date DATE,
  delivery_address TEXT,
  delivery_notes TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft',
  priority VARCHAR(20) DEFAULT 'normal',
  
  -- Source
  source VARCHAR(50) DEFAULT 'app',
  visit_id UUID REFERENCES public.customer_visits(id) ON DELETE SET NULL,
  
  -- Notes
  notes TEXT,
  internal_notes TEXT,
  
  -- Approval
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID,  -- User who approved
  approved_at TIMESTAMPTZ,
  rejected_by UUID,  -- User who rejected
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  -- Audit
  created_by UUID,  -- User who created
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,  -- User who cancelled
  cancellation_reason TEXT,
  
  -- Constraints
  CONSTRAINT sales_orders_status_check CHECK (status IN ('draft', 'pending_approval', 'confirmed', 'processing', 'ready', 'completed', 'cancelled')),
  CONSTRAINT sales_orders_payment_status_check CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded')),
  CONSTRAINT sales_orders_delivery_status_check CHECK (delivery_status IN ('pending', 'scheduled', 'picking', 'packed', 'delivering', 'delivered', 'failed', 'returned')),
  CONSTRAINT sales_orders_priority_check CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  CONSTRAINT sales_orders_source_check CHECK (source IN ('app', 'web', 'zalo', 'phone', 'email', 'walk_in', 'other'))
);

-- Unique constraint: order_number per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_sales_orders_number_company 
  ON public.sales_orders(company_id, order_number);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_orders_company ON public.sales_orders(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_branch ON public.sales_orders(branch_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_customer ON public.sales_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_sale ON public.sales_orders(sale_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_date ON public.sales_orders(order_date);
CREATE INDEX IF NOT EXISTS idx_sales_orders_status ON public.sales_orders(status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_payment_status ON public.sales_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_delivery_status ON public.sales_orders(delivery_status);
CREATE INDEX IF NOT EXISTS idx_sales_orders_delivery_date ON public.sales_orders(delivery_date);

-- =====================================================
-- TABLE: sales_order_items
-- Purpose: Line items in sales order
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sales_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  
  -- Snapshot product info (in case product changes later)
  product_sku VARCHAR(100),
  product_name VARCHAR(255),
  unit VARCHAR(50),
  
  -- Quantities
  quantity INTEGER NOT NULL,
  delivered_quantity INTEGER DEFAULT 0,
  returned_quantity INTEGER DEFAULT 0,
  
  -- Pricing
  unit_price DECIMAL(15, 2) NOT NULL,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  tax_percent DECIMAL(5, 2) DEFAULT 0,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  line_total DECIMAL(15, 2) NOT NULL,
  
  -- Cost (for margin calculation)
  unit_cost DECIMAL(15, 2) DEFAULT 0,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT sales_order_items_quantity_check CHECK (quantity > 0),
  CONSTRAINT sales_order_items_price_check CHECK (unit_price >= 0 AND line_total >= 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_order_items_order ON public.sales_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_sales_order_items_product ON public.sales_order_items(product_id);

-- =====================================================
-- TABLE: sales_order_history
-- Purpose: Track status changes
-- =====================================================
CREATE TABLE IF NOT EXISTS public.sales_order_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  
  from_status VARCHAR(50),
  to_status VARCHAR(50) NOT NULL,
  
  action VARCHAR(100) NOT NULL,
  notes TEXT,
  
  created_by UUID,  -- User who made the change
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_order_history_order ON public.sales_order_history(order_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update sales_orders updated_at
DROP TRIGGER IF EXISTS sales_orders_updated_at ON public.sales_orders;
CREATE TRIGGER sales_orders_updated_at
  BEFORE UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number(p_company_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_prefix VARCHAR(10);
  v_date_part VARCHAR(10);
  v_next_num INTEGER;
  v_order_number VARCHAR(50);
BEGIN
  v_prefix := 'SO';
  v_date_part := TO_CHAR(CURRENT_DATE, 'YYMMDD');
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(SUBSTRING(order_number FROM LENGTH(v_prefix) + 7), '') AS INTEGER)
  ), 0) + 1
  INTO v_next_num
  FROM public.sales_orders
  WHERE company_id = p_company_id 
    AND order_number LIKE v_prefix || v_date_part || '%';
  
  v_order_number := v_prefix || v_date_part || LPAD(v_next_num::TEXT, 4, '0');
  RETURN v_order_number;
END;
$$ LANGUAGE plpgsql;

-- Calculate order totals
CREATE OR REPLACE FUNCTION public.calculate_order_totals(p_order_id UUID)
RETURNS void AS $$
DECLARE
  v_subtotal DECIMAL(15, 2);
  v_tax_amount DECIMAL(15, 2);
  v_discount_amount DECIMAL(15, 2);
  v_total DECIMAL(15, 2);
  v_order RECORD;
BEGIN
  -- Get order info
  SELECT * INTO v_order FROM public.sales_orders WHERE id = p_order_id;
  
  -- Calculate subtotal from items
  SELECT COALESCE(SUM(line_total), 0) INTO v_subtotal
  FROM public.sales_order_items WHERE order_id = p_order_id;
  
  -- Calculate discounts
  IF v_order.discount_percent > 0 THEN
    v_discount_amount := v_subtotal * v_order.discount_percent / 100;
  ELSE
    v_discount_amount := COALESCE(v_order.discount_amount, 0);
  END IF;
  
  -- Calculate tax
  IF v_order.tax_percent > 0 THEN
    v_tax_amount := (v_subtotal - v_discount_amount) * v_order.tax_percent / 100;
  ELSE
    v_tax_amount := 0;
  END IF;
  
  -- Calculate total
  v_total := v_subtotal - v_discount_amount + v_tax_amount + COALESCE(v_order.shipping_amount, 0);
  
  -- Update order
  UPDATE public.sales_orders
  SET subtotal = v_subtotal,
      discount_amount = v_discount_amount,
      tax_amount = v_tax_amount,
      total = v_total,
      updated_at = now()
  WHERE id = p_order_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger to recalculate on item changes
CREATE OR REPLACE FUNCTION public.sales_order_items_recalculate()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.calculate_order_totals(OLD.order_id);
    RETURN OLD;
  ELSE
    PERFORM public.calculate_order_totals(NEW.order_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sales_order_items_recalculate ON public.sales_order_items;
CREATE TRIGGER sales_order_items_recalculate
  AFTER INSERT OR UPDATE OR DELETE ON public.sales_order_items
  FOR EACH ROW EXECUTE FUNCTION public.sales_order_items_recalculate();

-- Track order status changes
CREATE OR REPLACE FUNCTION public.track_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.sales_order_history (order_id, from_status, to_status, action, created_by)
    VALUES (NEW.id, OLD.status, NEW.status, 'status_change', auth.uid());
  END IF;
  
  IF OLD.payment_status IS DISTINCT FROM NEW.payment_status THEN
    INSERT INTO public.sales_order_history (order_id, from_status, to_status, action, created_by)
    VALUES (NEW.id, OLD.payment_status, NEW.payment_status, 'payment_status_change', auth.uid());
  END IF;
  
  IF OLD.delivery_status IS DISTINCT FROM NEW.delivery_status THEN
    INSERT INTO public.sales_order_history (order_id, from_status, to_status, action, created_by)
    VALUES (NEW.id, OLD.delivery_status, NEW.delivery_status, 'delivery_status_change', auth.uid());
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS track_order_status ON public.sales_orders;
CREATE TRIGGER track_order_status
  AFTER UPDATE ON public.sales_orders
  FOR EACH ROW EXECUTE FUNCTION public.track_order_status_change();

-- Update customer last_order_date
CREATE OR REPLACE FUNCTION public.update_customer_last_order()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.customers
  SET last_order_date = NEW.order_date
  WHERE id = NEW.customer_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_customer_last_order ON public.sales_orders;
CREATE TRIGGER update_customer_last_order
  AFTER INSERT ON public.sales_orders
  FOR EACH ROW 
  WHEN (NEW.status != 'draft' AND NEW.status != 'cancelled')
  EXECUTE FUNCTION public.update_customer_last_order();

-- =====================================================
-- RLS: Row Level Security
-- =====================================================
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_history ENABLE ROW LEVEL SECURITY;

-- Sales Orders RLS
DROP POLICY IF EXISTS "sales_orders_select_company" ON public.sales_orders;
CREATE POLICY "sales_orders_select_company" ON public.sales_orders
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sales_orders_insert_company" ON public.sales_orders;
CREATE POLICY "sales_orders_insert_company" ON public.sales_orders
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sales_orders_update_company" ON public.sales_orders;
CREATE POLICY "sales_orders_update_company" ON public.sales_orders
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "sales_orders_delete_managers" ON public.sales_orders;
CREATE POLICY "sales_orders_delete_managers" ON public.sales_orders
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM public.users 
      WHERE id = auth.uid() AND role IN ('ceo', 'manager')
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

-- Sales Order Items RLS (inherit from order via join)
DROP POLICY IF EXISTS "sales_order_items_select" ON public.sales_order_items;
CREATE POLICY "sales_order_items_select" ON public.sales_order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.sales_orders)
  );

DROP POLICY IF EXISTS "sales_order_items_insert" ON public.sales_order_items;
CREATE POLICY "sales_order_items_insert" ON public.sales_order_items
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM public.sales_orders)
  );

DROP POLICY IF EXISTS "sales_order_items_update" ON public.sales_order_items;
CREATE POLICY "sales_order_items_update" ON public.sales_order_items
  FOR UPDATE USING (
    order_id IN (SELECT id FROM public.sales_orders)
  );

DROP POLICY IF EXISTS "sales_order_items_delete" ON public.sales_order_items;
CREATE POLICY "sales_order_items_delete" ON public.sales_order_items
  FOR DELETE USING (
    order_id IN (SELECT id FROM public.sales_orders)
  );

-- Sales Order History RLS
DROP POLICY IF EXISTS "sales_order_history_select" ON public.sales_order_history;
CREATE POLICY "sales_order_history_select" ON public.sales_order_history
  FOR SELECT USING (
    order_id IN (SELECT id FROM public.sales_orders)
  );

DROP POLICY IF EXISTS "sales_order_history_insert" ON public.sales_order_history;
CREATE POLICY "sales_order_history_insert" ON public.sales_order_history
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM public.sales_orders)
  );

-- =====================================================
-- VIEWS: Reporting
-- =====================================================

-- Sales by customer
CREATE OR REPLACE VIEW public.v_sales_by_customer AS
SELECT 
  c.id as customer_id,
  c.company_id,
  c.name as customer_name,
  c.type as customer_type,
  c.channel,
  c.assigned_sale_id,
  COUNT(o.id) as total_orders,
  SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
  SUM(CASE WHEN o.status = 'completed' THEN o.total ELSE 0 END) as total_revenue,
  SUM(CASE WHEN o.payment_status = 'paid' THEN o.total ELSE 0 END) as paid_amount,
  SUM(CASE WHEN o.payment_status IN ('unpaid', 'partial') THEN o.total - o.paid_amount ELSE 0 END) as outstanding_amount,
  MAX(o.order_date) as last_order_date
FROM public.customers c
LEFT JOIN public.sales_orders o ON o.customer_id = c.id AND o.status != 'cancelled'
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.company_id, c.name, c.type, c.channel, c.assigned_sale_id;

-- Sales by salesperson
CREATE OR REPLACE VIEW public.v_sales_by_salesperson AS
SELECT 
  e.id as employee_id,
  e.company_id,
  e.full_name as salesperson_name,
  e.branch_id,
  COUNT(o.id) as total_orders,
  SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) as completed_orders,
  SUM(CASE WHEN o.status = 'completed' THEN o.total ELSE 0 END) as total_revenue,
  COUNT(DISTINCT o.customer_id) as unique_customers,
  AVG(o.total) as avg_order_value
FROM public.employees e
LEFT JOIN public.sales_orders o ON o.sale_id = e.id AND o.status != 'cancelled'
GROUP BY e.id, e.company_id, e.full_name, e.branch_id;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.sales_orders IS 'B2B sales orders - supports approval workflow, delivery tracking';
COMMENT ON TABLE public.sales_order_items IS 'Line items in sales order with product snapshot';
COMMENT ON TABLE public.sales_order_history IS 'Audit trail of order status changes';
COMMENT ON COLUMN public.sales_orders.order_number IS 'Auto-generated: SO + YYMMDD + sequence';
COMMENT ON COLUMN public.sales_order_items.product_sku IS 'Snapshot of product SKU at order time';
