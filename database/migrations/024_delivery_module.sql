-- =====================================================
-- Migration: 024_delivery_module.sql
-- Description: Delivery & Logistics management
-- Reusable: Yes (multi-tenant via company_id)
-- =====================================================

-- =====================================================
-- TABLE: deliveries
-- Purpose: Delivery trips/routes
-- =====================================================
CREATE TABLE IF NOT EXISTS public.deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  
  delivery_number VARCHAR(50) NOT NULL,
  delivery_date DATE NOT NULL,
  
  -- Driver/Vehicle
  driver_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  helper_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  vehicle VARCHAR(100),
  vehicle_plate VARCHAR(20),
  
  -- Route info
  route_name VARCHAR(255),
  planned_stops INTEGER DEFAULT 0,
  completed_stops INTEGER DEFAULT 0,
  failed_stops INTEGER DEFAULT 0,
  
  -- Totals
  total_orders INTEGER DEFAULT 0,
  total_items INTEGER DEFAULT 0,
  total_amount DECIMAL(15, 2) DEFAULT 0,
  collected_amount DECIMAL(15, 2) DEFAULT 0,
  
  -- Distance/Time
  planned_distance DECIMAL(10, 2),
  actual_distance DECIMAL(10, 2),
  planned_duration INTEGER,
  actual_duration INTEGER,
  
  -- Status
  status VARCHAR(20) DEFAULT 'planned',
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  -- Start/End location
  start_lat DECIMAL(10, 8),
  start_lng DECIMAL(11, 8),
  end_lat DECIMAL(10, 8),
  end_lng DECIMAL(11, 8),
  
  notes TEXT,
  
  created_by UUID,  -- User who created
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT deliveries_status_check CHECK (status IN ('planned', 'loading', 'in_progress', 'completed', 'cancelled'))
);

-- Unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_deliveries_number_company 
  ON public.deliveries(company_id, delivery_number);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_deliveries_company ON public.deliveries(company_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_date ON public.deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver ON public.deliveries(driver_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_status ON public.deliveries(status);
CREATE INDEX IF NOT EXISTS idx_deliveries_warehouse ON public.deliveries(warehouse_id);

-- =====================================================
-- TABLE: delivery_items
-- Purpose: Orders in a delivery
-- =====================================================
CREATE TABLE IF NOT EXISTS public.delivery_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  
  -- Sequence in route
  sequence INTEGER,
  
  -- Customer snapshot (for driver reference)
  customer_name VARCHAR(255),
  customer_phone VARCHAR(20),
  customer_address TEXT,
  customer_lat DECIMAL(10, 8),
  customer_lng DECIMAL(11, 8),
  
  -- Amounts
  order_amount DECIMAL(15, 2),
  collected_amount DECIMAL(15, 2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending',
  
  -- Delivery details
  delivered_at TIMESTAMPTZ,
  delivery_lat DECIMAL(10, 8),
  delivery_lng DECIMAL(11, 8),
  
  -- Proof of delivery
  receiver_name VARCHAR(255),
  signature_url TEXT,
  photos JSONB DEFAULT '[]',
  
  -- Failure details
  failure_reason VARCHAR(255),
  failure_notes TEXT,
  reschedule_date DATE,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT delivery_items_status_check CHECK (status IN ('pending', 'in_transit', 'delivered', 'partial', 'failed', 'returned', 'rescheduled'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery ON public.delivery_items(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_order ON public.delivery_items(order_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_status ON public.delivery_items(status);

-- =====================================================
-- TABLE: delivery_item_products
-- Purpose: Track which products were actually delivered
-- =====================================================
CREATE TABLE IF NOT EXISTS public.delivery_item_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_item_id UUID NOT NULL REFERENCES public.delivery_items(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.sales_order_items(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  
  ordered_quantity INTEGER NOT NULL,
  delivered_quantity INTEGER DEFAULT 0,
  returned_quantity INTEGER DEFAULT 0,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_item_products_delivery_item ON public.delivery_item_products(delivery_item_id);

-- =====================================================
-- TABLE: delivery_tracking
-- Purpose: Real-time GPS tracking of deliveries
-- =====================================================
CREATE TABLE IF NOT EXISTS public.delivery_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id UUID NOT NULL REFERENCES public.deliveries(id) ON DELETE CASCADE,
  
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  
  speed DECIMAL(6, 2),
  heading INTEGER,
  accuracy DECIMAL(6, 2),
  
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_delivery ON public.delivery_tracking(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_tracking_time ON public.delivery_tracking(recorded_at);

-- Partition by time for performance (optional, enable if high volume)
-- Consider partitioning this table monthly if tracking data grows large

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update deliveries updated_at
DROP TRIGGER IF EXISTS deliveries_updated_at ON public.deliveries;
CREATE TRIGGER deliveries_updated_at
  BEFORE UPDATE ON public.deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update delivery_items updated_at
DROP TRIGGER IF EXISTS delivery_items_updated_at ON public.delivery_items;
CREATE TRIGGER delivery_items_updated_at
  BEFORE UPDATE ON public.delivery_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Generate delivery number
CREATE OR REPLACE FUNCTION public.generate_delivery_number(p_company_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_prefix VARCHAR(10) := 'DLV';
  v_date_part VARCHAR(10);
  v_next_num INTEGER;
BEGIN
  v_date_part := TO_CHAR(CURRENT_DATE, 'YYMMDD');
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(SUBSTRING(delivery_number FROM LENGTH(v_prefix) + 7), '') AS INTEGER)
  ), 0) + 1
  INTO v_next_num
  FROM public.deliveries
  WHERE company_id = p_company_id 
    AND delivery_number LIKE v_prefix || v_date_part || '%';
  
  RETURN v_prefix || v_date_part || LPAD(v_next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Update delivery stats when items change
CREATE OR REPLACE FUNCTION public.update_delivery_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_delivery_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_delivery_id := OLD.delivery_id;
  ELSE
    v_delivery_id := NEW.delivery_id;
  END IF;
  
  UPDATE public.deliveries
  SET 
    total_orders = (SELECT COUNT(*) FROM public.delivery_items WHERE delivery_id = v_delivery_id),
    completed_stops = (SELECT COUNT(*) FROM public.delivery_items WHERE delivery_id = v_delivery_id AND status = 'delivered'),
    failed_stops = (SELECT COUNT(*) FROM public.delivery_items WHERE delivery_id = v_delivery_id AND status IN ('failed', 'returned')),
    total_amount = (SELECT COALESCE(SUM(order_amount), 0) FROM public.delivery_items WHERE delivery_id = v_delivery_id),
    collected_amount = (SELECT COALESCE(SUM(collected_amount), 0) FROM public.delivery_items WHERE delivery_id = v_delivery_id),
    updated_at = now()
  WHERE id = v_delivery_id;
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_delivery_stats ON public.delivery_items;
CREATE TRIGGER update_delivery_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.delivery_items
  FOR EACH ROW EXECUTE FUNCTION public.update_delivery_stats();

-- Update order delivery status when delivery item changes
CREATE OR REPLACE FUNCTION public.sync_order_delivery_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' THEN
    UPDATE public.sales_orders
    SET delivery_status = 'delivered',
        updated_at = now()
    WHERE id = NEW.order_id;
    
    -- Update order items delivered quantity
    UPDATE public.sales_order_items soi
    SET delivered_quantity = dip.delivered_quantity
    FROM public.delivery_item_products dip
    WHERE dip.order_item_id = soi.id
      AND dip.delivery_item_id = NEW.id;
      
  ELSIF NEW.status = 'failed' OR NEW.status = 'returned' THEN
    UPDATE public.sales_orders
    SET delivery_status = 'failed',
        updated_at = now()
    WHERE id = NEW.order_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_order_delivery_status ON public.delivery_items;
CREATE TRIGGER sync_order_delivery_status
  AFTER UPDATE ON public.delivery_items
  FOR EACH ROW 
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.sync_order_delivery_status();

-- =====================================================
-- RLS: Row Level Security
-- =====================================================
ALTER TABLE public.deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_item_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_tracking ENABLE ROW LEVEL SECURITY;

-- Deliveries RLS
DROP POLICY IF EXISTS "deliveries_select_company" ON public.deliveries;
CREATE POLICY "deliveries_select_company" ON public.deliveries
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "deliveries_all_company" ON public.deliveries;
CREATE POLICY "deliveries_all_company" ON public.deliveries
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

-- Delivery Items RLS (via delivery)
DROP POLICY IF EXISTS "delivery_items_select" ON public.delivery_items;
CREATE POLICY "delivery_items_select" ON public.delivery_items
  FOR SELECT USING (
    delivery_id IN (SELECT id FROM public.deliveries)
  );

DROP POLICY IF EXISTS "delivery_items_all" ON public.delivery_items;
CREATE POLICY "delivery_items_all" ON public.delivery_items
  FOR ALL USING (
    delivery_id IN (SELECT id FROM public.deliveries)
  );

-- Delivery Item Products RLS (via delivery_items)
DROP POLICY IF EXISTS "delivery_item_products_select" ON public.delivery_item_products;
CREATE POLICY "delivery_item_products_select" ON public.delivery_item_products
  FOR SELECT USING (
    delivery_item_id IN (SELECT id FROM public.delivery_items)
  );

DROP POLICY IF EXISTS "delivery_item_products_all" ON public.delivery_item_products;
CREATE POLICY "delivery_item_products_all" ON public.delivery_item_products
  FOR ALL USING (
    delivery_item_id IN (SELECT id FROM public.delivery_items)
  );

-- Delivery Tracking RLS (via delivery)
DROP POLICY IF EXISTS "delivery_tracking_select" ON public.delivery_tracking;
CREATE POLICY "delivery_tracking_select" ON public.delivery_tracking
  FOR SELECT USING (
    delivery_id IN (SELECT id FROM public.deliveries)
  );

DROP POLICY IF EXISTS "delivery_tracking_insert" ON public.delivery_tracking;
CREATE POLICY "delivery_tracking_insert" ON public.delivery_tracking
  FOR INSERT WITH CHECK (
    delivery_id IN (SELECT id FROM public.deliveries)
  );

-- =====================================================
-- VIEWS: Reporting
-- =====================================================

-- Driver performance
CREATE OR REPLACE VIEW public.v_driver_performance AS
SELECT 
  d.driver_id,
  e.full_name as driver_name,
  d.company_id,
  COUNT(d.id) as total_deliveries,
  SUM(d.completed_stops) as total_delivered,
  SUM(d.failed_stops) as total_failed,
  ROUND(SUM(d.completed_stops)::DECIMAL / NULLIF(SUM(d.planned_stops), 0) * 100, 2) as success_rate,
  SUM(d.collected_amount) as total_collected,
  AVG(d.actual_duration) as avg_duration_minutes
FROM public.deliveries d
JOIN public.employees e ON e.id = d.driver_id
WHERE d.status = 'completed'
  AND d.delivery_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY d.driver_id, e.full_name, d.company_id;

-- Daily delivery summary
CREATE OR REPLACE VIEW public.v_delivery_daily_summary AS
SELECT 
  company_id,
  delivery_date,
  COUNT(*) as total_trips,
  SUM(total_orders) as total_orders,
  SUM(completed_stops) as delivered,
  SUM(failed_stops) as failed,
  SUM(total_amount) as total_value,
  SUM(collected_amount) as collected
FROM public.deliveries
WHERE status = 'completed'
GROUP BY company_id, delivery_date
ORDER BY delivery_date DESC;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.deliveries IS 'Delivery trips/routes - groups orders for delivery';
COMMENT ON TABLE public.delivery_items IS 'Orders within a delivery with delivery status';
COMMENT ON TABLE public.delivery_item_products IS 'Tracks actual vs ordered quantities per product';
COMMENT ON TABLE public.delivery_tracking IS 'GPS tracking points for delivery route';
COMMENT ON COLUMN public.delivery_items.sequence IS 'Order of delivery in the route (for route optimization)';
