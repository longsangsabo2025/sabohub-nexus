-- =====================================================
-- Migration: 021_products_inventory_module.sql
-- Description: Products & Inventory management
-- Reusable: Yes (multi-tenant via company_id)
-- =====================================================

-- =====================================================
-- TABLE: product_categories
-- Purpose: Hierarchical product categories
-- =====================================================
CREATE TABLE IF NOT EXISTS public.product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255),
  description TEXT,
  image_url TEXT,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_product_categories_company ON public.product_categories(company_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_parent ON public.product_categories(parent_id);

-- =====================================================
-- TABLE: products
-- Purpose: Product catalog
-- =====================================================
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
  
  -- Basic info
  sku VARCHAR(100) NOT NULL,
  barcode VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  brand VARCHAR(100),
  unit VARCHAR(50) DEFAULT 'cái',
  
  -- Pricing
  cost_price DECIMAL(15, 2) DEFAULT 0,
  selling_price DECIMAL(15, 2) DEFAULT 0,
  wholesale_price DECIMAL(15, 2),
  min_wholesale_qty INTEGER DEFAULT 1,
  
  -- Inventory settings
  track_inventory BOOLEAN DEFAULT true,
  min_stock INTEGER DEFAULT 0,
  max_stock INTEGER,
  reorder_point INTEGER DEFAULT 0,
  reorder_quantity INTEGER DEFAULT 0,
  
  -- Dimensions (for shipping)
  weight DECIMAL(10, 3),
  weight_unit VARCHAR(10) DEFAULT 'kg',
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',
  
  -- Media
  image_url TEXT,
  images JSONB DEFAULT '[]',
  
  -- Extra data
  attributes JSONB DEFAULT '{}',
  tags JSONB DEFAULT '[]',
  
  -- Audit
  created_by UUID,  -- CEO/Manager who created
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT products_status_check CHECK (status IN ('active', 'inactive', 'discontinued')),
  CONSTRAINT products_price_check CHECK (cost_price >= 0 AND selling_price >= 0)
);

-- Unique constraint: SKU per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_company 
  ON public.products(company_id, sku) WHERE deleted_at IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_products_company ON public.products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON public.products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_name ON public.products(company_id, name);

-- =====================================================
-- TABLE: warehouses
-- Purpose: Warehouse/storage locations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  
  type VARCHAR(50) DEFAULT 'main',
  
  manager_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT warehouses_type_check CHECK (type IN ('main', 'transit', 'vehicle', 'virtual'))
);

-- Unique constraint: code per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_warehouses_code_company 
  ON public.warehouses(company_id, code);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_warehouses_company ON public.warehouses(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_branch ON public.warehouses(branch_id);

-- =====================================================
-- TABLE: inventory
-- Purpose: Stock levels per warehouse per product
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  quantity INTEGER DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0,
  
  -- Cost tracking
  avg_cost DECIMAL(15, 2) DEFAULT 0,
  
  -- Last count
  last_count_date DATE,
  last_count_quantity INTEGER,
  
  -- Location in warehouse
  location VARCHAR(100),
  
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT inventory_quantity_check CHECK (quantity >= 0 AND reserved_quantity >= 0),
  CONSTRAINT inventory_reserved_check CHECK (reserved_quantity <= quantity)
);

-- Unique constraint: one record per warehouse-product
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_warehouse_product 
  ON public.inventory(warehouse_id, product_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_company ON public.inventory(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_warehouse ON public.inventory(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON public.inventory(product_id);

-- =====================================================
-- TABLE: inventory_movements
-- Purpose: Track all stock movements (in/out/transfer)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  
  -- Movement type
  type VARCHAR(20) NOT NULL,
  reason VARCHAR(100),
  
  -- Quantities
  quantity INTEGER NOT NULL,
  before_quantity INTEGER,
  after_quantity INTEGER,
  
  -- Cost
  unit_cost DECIMAL(15, 2),
  
  -- Reference
  reference_type VARCHAR(50),
  reference_id UUID,
  reference_number VARCHAR(100),
  
  -- Transfer specific
  destination_warehouse_id UUID REFERENCES public.warehouses(id),
  
  notes TEXT,
  
  created_by UUID,  -- User who created
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT inventory_movements_type_check CHECK (type IN ('in', 'out', 'transfer', 'adjustment', 'count'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_inventory_movements_company ON public.inventory_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_warehouse ON public.inventory_movements(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_product ON public.inventory_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_date ON public.inventory_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_reference ON public.inventory_movements(reference_type, reference_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update products updated_at
DROP TRIGGER IF EXISTS products_updated_at ON public.products;
CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update warehouses updated_at
DROP TRIGGER IF EXISTS warehouses_updated_at ON public.warehouses;
CREATE TRIGGER warehouses_updated_at
  BEFORE UPDATE ON public.warehouses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update inventory updated_at
DROP TRIGGER IF EXISTS inventory_updated_at ON public.inventory;
CREATE TRIGGER inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update product_categories updated_at
DROP TRIGGER IF EXISTS product_categories_updated_at ON public.product_categories;
CREATE TRIGGER product_categories_updated_at
  BEFORE UPDATE ON public.product_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FUNCTION: Update inventory on movement
-- =====================================================
CREATE OR REPLACE FUNCTION public.process_inventory_movement()
RETURNS TRIGGER AS $$
BEGIN
  -- Record before quantity
  SELECT COALESCE(quantity, 0) INTO NEW.before_quantity
  FROM public.inventory
  WHERE warehouse_id = NEW.warehouse_id AND product_id = NEW.product_id;
  
  IF NEW.before_quantity IS NULL THEN
    NEW.before_quantity := 0;
  END IF;
  
  -- Update inventory based on movement type
  IF NEW.type = 'in' THEN
    INSERT INTO public.inventory (company_id, warehouse_id, product_id, quantity)
    VALUES (NEW.company_id, NEW.warehouse_id, NEW.product_id, NEW.quantity)
    ON CONFLICT (warehouse_id, product_id) 
    DO UPDATE SET quantity = inventory.quantity + NEW.quantity, updated_at = now();
    
  ELSIF NEW.type = 'out' THEN
    UPDATE public.inventory 
    SET quantity = quantity - NEW.quantity, updated_at = now()
    WHERE warehouse_id = NEW.warehouse_id AND product_id = NEW.product_id;
    
  ELSIF NEW.type = 'adjustment' OR NEW.type = 'count' THEN
    INSERT INTO public.inventory (company_id, warehouse_id, product_id, quantity)
    VALUES (NEW.company_id, NEW.warehouse_id, NEW.product_id, NEW.quantity)
    ON CONFLICT (warehouse_id, product_id) 
    DO UPDATE SET quantity = NEW.quantity, 
                  last_count_date = CURRENT_DATE,
                  last_count_quantity = NEW.quantity,
                  updated_at = now();
                  
  ELSIF NEW.type = 'transfer' AND NEW.destination_warehouse_id IS NOT NULL THEN
    -- Out from source
    UPDATE public.inventory 
    SET quantity = quantity - NEW.quantity, updated_at = now()
    WHERE warehouse_id = NEW.warehouse_id AND product_id = NEW.product_id;
    
    -- In to destination
    INSERT INTO public.inventory (company_id, warehouse_id, product_id, quantity)
    VALUES (NEW.company_id, NEW.destination_warehouse_id, NEW.product_id, NEW.quantity)
    ON CONFLICT (warehouse_id, product_id) 
    DO UPDATE SET quantity = inventory.quantity + NEW.quantity, updated_at = now();
  END IF;
  
  -- Record after quantity
  SELECT quantity INTO NEW.after_quantity
  FROM public.inventory
  WHERE warehouse_id = NEW.warehouse_id AND product_id = NEW.product_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inventory_movement_process ON public.inventory_movements;
CREATE TRIGGER inventory_movement_process
  BEFORE INSERT ON public.inventory_movements
  FOR EACH ROW EXECUTE FUNCTION public.process_inventory_movement();

-- =====================================================
-- RLS: Row Level Security
-- =====================================================
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;

-- Product Categories RLS
DROP POLICY IF EXISTS "product_categories_select_company" ON public.product_categories;
CREATE POLICY "product_categories_select_company" ON public.product_categories
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "product_categories_all_company" ON public.product_categories;
CREATE POLICY "product_categories_all_company" ON public.product_categories
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

-- Products RLS
DROP POLICY IF EXISTS "products_select_company" ON public.products;
CREATE POLICY "products_select_company" ON public.products
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "products_all_company" ON public.products;
CREATE POLICY "products_all_company" ON public.products
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

-- Warehouses RLS
DROP POLICY IF EXISTS "warehouses_select_company" ON public.warehouses;
CREATE POLICY "warehouses_select_company" ON public.warehouses
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "warehouses_all_company" ON public.warehouses;
CREATE POLICY "warehouses_all_company" ON public.warehouses
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

-- Inventory RLS
DROP POLICY IF EXISTS "inventory_select_company" ON public.inventory;
CREATE POLICY "inventory_select_company" ON public.inventory
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "inventory_all_company" ON public.inventory;
CREATE POLICY "inventory_all_company" ON public.inventory
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

-- Inventory Movements RLS
DROP POLICY IF EXISTS "inventory_movements_select_company" ON public.inventory_movements;
CREATE POLICY "inventory_movements_select_company" ON public.inventory_movements
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "inventory_movements_insert_company" ON public.inventory_movements;
CREATE POLICY "inventory_movements_insert_company" ON public.inventory_movements
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS: Helpers
-- =====================================================

-- Get available quantity (quantity - reserved)
CREATE OR REPLACE FUNCTION public.get_available_quantity(
  p_warehouse_id UUID,
  p_product_id UUID
) RETURNS INTEGER AS $$
DECLARE
  v_available INTEGER;
BEGIN
  SELECT GREATEST(quantity - reserved_quantity, 0)
  INTO v_available
  FROM public.inventory
  WHERE warehouse_id = p_warehouse_id AND product_id = p_product_id;
  
  RETURN COALESCE(v_available, 0);
END;
$$ LANGUAGE plpgsql;

-- Get total stock across all warehouses
CREATE OR REPLACE FUNCTION public.get_total_stock(
  p_company_id UUID,
  p_product_id UUID
) RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COALESCE(SUM(quantity), 0)
    FROM public.inventory
    WHERE company_id = p_company_id AND product_id = p_product_id
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.products IS 'Product catalog - multi-tenant, supports B2B pricing';
COMMENT ON TABLE public.warehouses IS 'Warehouse/storage locations - can be physical or virtual (vehicle)';
COMMENT ON TABLE public.inventory IS 'Stock levels per warehouse per product';
COMMENT ON TABLE public.inventory_movements IS 'Stock movement history - auto-updates inventory via trigger';
COMMENT ON COLUMN public.products.unit IS 'Unit of measure: cái, thùng, kg, lít, etc.';
COMMENT ON COLUMN public.inventory.reserved_quantity IS 'Quantity reserved for pending orders';
