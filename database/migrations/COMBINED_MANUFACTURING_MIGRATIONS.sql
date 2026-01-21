-- Migration: 027_create_manufacturing_suppliers
-- Description: Suppliers table for raw material vendors
-- Date: 2024-01-15

-- Suppliers table (Nhà cung cấp)
CREATE TABLE IF NOT EXISTS manufacturing_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Basic info
  supplier_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  tax_code VARCHAR(20),
  
  -- Contact
  phone VARCHAR(20),
  email VARCHAR(255),
  contact_person VARCHAR(100),
  
  -- Address
  address TEXT,
  city VARCHAR(100),
  district VARCHAR(100),
  
  -- Business terms
  payment_terms INTEGER DEFAULT 30, -- Days
  credit_limit DECIMAL(15, 2) DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'VND',
  
  -- Categories (for filtering)
  category VARCHAR(50), -- 'raw_material', 'packaging', 'equipment', 'service', 'other'
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 1-5 stars
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(company_id, supplier_code)
);

-- Indexes
CREATE INDEX idx_mfg_suppliers_company ON manufacturing_suppliers(company_id);
CREATE INDEX idx_mfg_suppliers_code ON manufacturing_suppliers(supplier_code);
CREATE INDEX idx_mfg_suppliers_active ON manufacturing_suppliers(company_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_mfg_suppliers_category ON manufacturing_suppliers(company_id, category) WHERE deleted_at IS NULL;

-- RLS
ALTER TABLE manufacturing_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company suppliers"
  ON manufacturing_suppliers FOR SELECT
  USING (company_id IN (
    SELECT (raw_user_meta_data->>'company_id')::uuid 
    FROM auth.users 
    WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert their company suppliers"
  ON manufacturing_suppliers FOR INSERT
  WITH CHECK (company_id IN (
    SELECT (raw_user_meta_data->>'company_id')::uuid 
    FROM auth.users 
    WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their company suppliers"
  ON manufacturing_suppliers FOR UPDATE
  USING (company_id IN (
    SELECT (raw_user_meta_data->>'company_id')::uuid 
    FROM auth.users 
    WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their company suppliers"
  ON manufacturing_suppliers FOR DELETE
  USING (company_id IN (
    SELECT (raw_user_meta_data->>'company_id')::uuid 
    FROM auth.users 
    WHERE id = auth.uid()
  ));

-- Trigger for updated_at
CREATE TRIGGER update_manufacturing_suppliers_updated_at
  BEFORE UPDATE ON manufacturing_suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE manufacturing_suppliers IS 'Raw material and service suppliers for manufacturing';
COMMENT ON COLUMN manufacturing_suppliers.payment_terms IS 'Payment terms in days';
COMMENT ON COLUMN manufacturing_suppliers.credit_limit IS 'Maximum credit limit allowed';
-- Migration: 028_create_manufacturing_materials
-- Description: Raw materials and components inventory
-- Date: 2024-01-15

-- Material Categories
CREATE TABLE IF NOT EXISTS manufacturing_material_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  parent_id UUID REFERENCES manufacturing_material_categories(id),
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, name)
);

-- Materials table (Nguyên vật liệu)
CREATE TABLE IF NOT EXISTS manufacturing_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Basic info
  material_code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES manufacturing_material_categories(id),
  
  -- Unit & Measurement
  unit VARCHAR(20) NOT NULL, -- 'kg', 'lít', 'cái', 'mét', etc.
  unit_cost DECIMAL(15, 2) DEFAULT 0, -- Average cost
  
  -- Stock levels
  min_stock DECIMAL(15, 3) DEFAULT 0, -- Reorder point
  max_stock DECIMAL(15, 3), -- Maximum stock level
  
  -- Default supplier
  default_supplier_id UUID REFERENCES manufacturing_suppliers(id),
  lead_time_days INTEGER DEFAULT 7, -- Days to receive after ordering
  
  -- Storage
  storage_location VARCHAR(100),
  shelf_life_days INTEGER, -- For perishable materials
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(company_id, material_code)
);

-- Material Inventory (Tồn kho NVL)
CREATE TABLE IF NOT EXISTS manufacturing_material_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES manufacturing_materials(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id), -- Link to existing warehouses
  
  quantity DECIMAL(15, 3) NOT NULL DEFAULT 0,
  reserved_quantity DECIMAL(15, 3) DEFAULT 0, -- Reserved for production
  available_quantity DECIMAL(15, 3) GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  
  last_received_at TIMESTAMPTZ,
  last_issued_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, material_id, warehouse_id)
);

-- Material Transactions (Phiếu xuất/nhập NVL)
CREATE TABLE IF NOT EXISTS manufacturing_material_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES manufacturing_materials(id),
  warehouse_id UUID REFERENCES warehouses(id),
  
  transaction_type VARCHAR(20) NOT NULL, -- 'receive', 'issue', 'adjust', 'transfer', 'return'
  quantity DECIMAL(15, 3) NOT NULL, -- Positive for in, negative for out
  unit_cost DECIMAL(15, 2),
  
  -- References
  reference_type VARCHAR(50), -- 'purchase_order', 'production_order', 'adjustment', etc.
  reference_id UUID,
  
  batch_number VARCHAR(50),
  expiry_date DATE,
  
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_mfg_materials_company ON manufacturing_materials(company_id);
CREATE INDEX idx_mfg_materials_code ON manufacturing_materials(material_code);
CREATE INDEX idx_mfg_materials_active ON manufacturing_materials(company_id, is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_mfg_materials_supplier ON manufacturing_materials(default_supplier_id);

CREATE INDEX idx_mfg_mat_inv_material ON manufacturing_material_inventory(material_id);
CREATE INDEX idx_mfg_mat_inv_warehouse ON manufacturing_material_inventory(warehouse_id);
CREATE INDEX idx_mfg_mat_inv_low_stock ON manufacturing_material_inventory(company_id) 
  WHERE available_quantity < 10;

CREATE INDEX idx_mfg_mat_trans_material ON manufacturing_material_transactions(material_id);
CREATE INDEX idx_mfg_mat_trans_date ON manufacturing_material_transactions(created_at);
CREATE INDEX idx_mfg_mat_trans_ref ON manufacturing_material_transactions(reference_type, reference_id);

-- RLS
ALTER TABLE manufacturing_material_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_material_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_material_transactions ENABLE ROW LEVEL SECURITY;

-- Categories RLS
CREATE POLICY "Users can manage their company material categories"
  ON manufacturing_material_categories FOR ALL
  USING (company_id IN (
    SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
  ));

-- Materials RLS
CREATE POLICY "Users can view their company materials"
  ON manufacturing_materials FOR SELECT
  USING (company_id IN (
    SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert their company materials"
  ON manufacturing_materials FOR INSERT
  WITH CHECK (company_id IN (
    SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their company materials"
  ON manufacturing_materials FOR UPDATE
  USING (company_id IN (
    SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
  ));

-- Inventory RLS
CREATE POLICY "Users can manage their company material inventory"
  ON manufacturing_material_inventory FOR ALL
  USING (company_id IN (
    SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
  ));

-- Transactions RLS
CREATE POLICY "Users can manage their company material transactions"
  ON manufacturing_material_transactions FOR ALL
  USING (company_id IN (
    SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
  ));

-- Triggers
CREATE TRIGGER update_manufacturing_materials_updated_at
  BEFORE UPDATE ON manufacturing_materials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_manufacturing_material_inventory_updated_at
  BEFORE UPDATE ON manufacturing_material_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE manufacturing_materials IS 'Raw materials and components for manufacturing';
COMMENT ON TABLE manufacturing_material_inventory IS 'Current stock levels of materials';
COMMENT ON TABLE manufacturing_material_transactions IS 'Material movement history';
-- Migration: 029_create_manufacturing_bom
-- Description: Bill of Materials (Định mức sản phẩm)
-- Date: 2024-01-15

-- BOM Header (Định mức sản phẩm)
CREATE TABLE IF NOT EXISTS manufacturing_bom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Link to finished product
  product_id UUID NOT NULL REFERENCES products(id),
  
  -- BOM Info
  bom_code VARCHAR(50) NOT NULL,
  name VARCHAR(255),
  version VARCHAR(20) DEFAULT '1.0',
  description TEXT,
  
  -- Output
  output_quantity DECIMAL(15, 3) DEFAULT 1, -- Quantity produced per batch
  output_unit VARCHAR(20), -- Unit of output
  
  -- Timing
  production_time_minutes INTEGER, -- Standard time to produce
  setup_time_minutes INTEGER DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'active', 'obsolete'
  is_default BOOLEAN DEFAULT FALSE, -- Default BOM for this product
  
  -- Validity
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(company_id, bom_code)
);

-- BOM Items (Chi tiết định mức)
CREATE TABLE IF NOT EXISTS manufacturing_bom_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bom_id UUID NOT NULL REFERENCES manufacturing_bom(id) ON DELETE CASCADE,
  
  -- Material reference
  material_id UUID NOT NULL REFERENCES manufacturing_materials(id),
  
  -- Quantity
  quantity DECIMAL(15, 5) NOT NULL, -- Quantity per output unit
  unit VARCHAR(20),
  
  -- Wastage/Scrap allowance
  waste_percent DECIMAL(5, 2) DEFAULT 0, -- Expected waste %
  
  -- Optional: can substitute with another material
  substitute_material_id UUID REFERENCES manufacturing_materials(id),
  
  -- Sequence in production
  sequence INTEGER DEFAULT 0,
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to calculate total material cost for a BOM
CREATE OR REPLACE FUNCTION calculate_bom_cost(p_bom_id UUID)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
  total_cost DECIMAL(15, 2) := 0;
BEGIN
  SELECT COALESCE(SUM(
    bi.quantity * (1 + bi.waste_percent / 100) * m.unit_cost
  ), 0)
  INTO total_cost
  FROM manufacturing_bom_items bi
  JOIN manufacturing_materials m ON m.id = bi.material_id
  WHERE bi.bom_id = p_bom_id;
  
  RETURN total_cost;
END;
$$ LANGUAGE plpgsql;

-- View for BOM with calculated costs
CREATE OR REPLACE VIEW manufacturing_bom_with_cost AS
SELECT 
  b.*,
  p.name as product_name,
  p.sku as product_sku,
  calculate_bom_cost(b.id) as material_cost,
  (SELECT COUNT(*) FROM manufacturing_bom_items WHERE bom_id = b.id) as item_count
FROM manufacturing_bom b
JOIN products p ON p.id = b.product_id;

-- Indexes
CREATE INDEX idx_mfg_bom_company ON manufacturing_bom(company_id);
CREATE INDEX idx_mfg_bom_product ON manufacturing_bom(product_id);
CREATE INDEX idx_mfg_bom_status ON manufacturing_bom(company_id, status);
CREATE INDEX idx_mfg_bom_default ON manufacturing_bom(product_id, is_default) WHERE is_default = TRUE;

CREATE INDEX idx_mfg_bom_items_bom ON manufacturing_bom_items(bom_id);
CREATE INDEX idx_mfg_bom_items_material ON manufacturing_bom_items(material_id);

-- RLS
ALTER TABLE manufacturing_bom ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_bom_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company BOMs"
  ON manufacturing_bom FOR SELECT
  USING (company_id IN (
    SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert their company BOMs"
  ON manufacturing_bom FOR INSERT
  WITH CHECK (company_id IN (
    SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their company BOMs"
  ON manufacturing_bom FOR UPDATE
  USING (company_id IN (
    SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their company BOMs"
  ON manufacturing_bom FOR DELETE
  USING (company_id IN (
    SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
  ));

-- BOM Items inherits from parent BOM
CREATE POLICY "Users can manage BOM items"
  ON manufacturing_bom_items FOR ALL
  USING (bom_id IN (
    SELECT id FROM manufacturing_bom WHERE company_id IN (
      SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
    )
  ));

-- Triggers
CREATE TRIGGER update_manufacturing_bom_updated_at
  BEFORE UPDATE ON manufacturing_bom
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE manufacturing_bom IS 'Bill of Materials - defines materials needed to produce a product';
COMMENT ON TABLE manufacturing_bom_items IS 'Individual material requirements in a BOM';
COMMENT ON COLUMN manufacturing_bom.output_quantity IS 'Quantity of product produced per batch';
COMMENT ON COLUMN manufacturing_bom_items.waste_percent IS 'Expected material wastage percentage';
-- Migration: 030_create_manufacturing_purchase_orders
-- Description: Purchase Orders for raw materials
-- Date: 2024-01-15

-- Purchase Orders (Đơn đặt hàng NVL)
CREATE TABLE IF NOT EXISTS manufacturing_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- PO Info
  po_number VARCHAR(50) NOT NULL,
  supplier_id UUID NOT NULL REFERENCES manufacturing_suppliers(id),
  
  -- Dates
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_date DATE,
  received_date DATE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'pending', 'approved', 'ordered', 'partial', 'received', 'cancelled'
  
  -- Amounts
  subtotal DECIMAL(15, 2) DEFAULT 0,
  tax_percent DECIMAL(5, 2) DEFAULT 10,
  tax_amount DECIMAL(15, 2) DEFAULT 0,
  discount_amount DECIMAL(15, 2) DEFAULT 0,
  total_amount DECIMAL(15, 2) DEFAULT 0,
  
  -- Payment
  payment_terms INTEGER, -- Days, inherits from supplier if null
  payment_status VARCHAR(20) DEFAULT 'unpaid', -- 'unpaid', 'partial', 'paid'
  
  -- Delivery
  delivery_address TEXT,
  warehouse_id UUID REFERENCES warehouses(id),
  
  -- Notes
  notes TEXT,
  internal_notes TEXT,
  
  -- Workflow
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  UNIQUE(company_id, po_number)
);

-- Purchase Order Items
CREATE TABLE IF NOT EXISTS manufacturing_purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id UUID NOT NULL REFERENCES manufacturing_purchase_orders(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES manufacturing_materials(id),
  
  -- Quantities
  quantity DECIMAL(15, 3) NOT NULL,
  unit VARCHAR(20),
  received_quantity DECIMAL(15, 3) DEFAULT 0,
  
  -- Pricing
  unit_price DECIMAL(15, 2) NOT NULL,
  discount_percent DECIMAL(5, 2) DEFAULT 0,
  tax_percent DECIMAL(5, 2) DEFAULT 10,
  total DECIMAL(15, 2) NOT NULL,
  
  -- Reference to production order (if purchasing for specific production)
  production_order_id UUID,
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Purchase Receipts (Phiếu nhập kho)
CREATE TABLE IF NOT EXISTS manufacturing_purchase_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  po_id UUID NOT NULL REFERENCES manufacturing_purchase_orders(id),
  
  receipt_number VARCHAR(50) NOT NULL,
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  warehouse_id UUID REFERENCES warehouses(id),
  
  notes TEXT,
  received_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(company_id, receipt_number)
);

-- Purchase Receipt Items
CREATE TABLE IF NOT EXISTS manufacturing_purchase_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES manufacturing_purchase_receipts(id) ON DELETE CASCADE,
  po_item_id UUID NOT NULL REFERENCES manufacturing_purchase_order_items(id),
  material_id UUID NOT NULL REFERENCES manufacturing_materials(id),
  
  quantity DECIMAL(15, 3) NOT NULL,
  batch_number VARCHAR(50),
  expiry_date DATE,
  
  -- Quality check
  quality_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'passed', 'failed', 'partial'
  quality_notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to generate PO number
CREATE OR REPLACE FUNCTION generate_po_number(p_company_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_year VARCHAR(4);
  v_count INTEGER;
  v_number VARCHAR(50);
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM manufacturing_purchase_orders
  WHERE company_id = p_company_id
    AND po_number LIKE 'PO' || v_year || '%';
  
  v_number := 'PO' || v_year || LPAD(v_count::TEXT, 5, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update PO totals
CREATE OR REPLACE FUNCTION update_po_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE manufacturing_purchase_orders
  SET 
    subtotal = (SELECT COALESCE(SUM(total), 0) FROM manufacturing_purchase_order_items WHERE po_id = COALESCE(NEW.po_id, OLD.po_id)),
    tax_amount = subtotal * tax_percent / 100,
    total_amount = subtotal + tax_amount - discount_amount,
    updated_at = NOW()
  WHERE id = COALESCE(NEW.po_id, OLD.po_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_po_totals
  AFTER INSERT OR UPDATE OR DELETE ON manufacturing_purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_po_totals();

-- Function to update received quantity on receipt
CREATE OR REPLACE FUNCTION update_po_received_quantity()
RETURNS TRIGGER AS $$
BEGIN
  -- Update PO item received quantity
  UPDATE manufacturing_purchase_order_items
  SET received_quantity = (
    SELECT COALESCE(SUM(quantity), 0)
    FROM manufacturing_purchase_receipt_items
    WHERE po_item_id = NEW.po_item_id
  )
  WHERE id = NEW.po_item_id;
  
  -- Update PO status
  UPDATE manufacturing_purchase_orders po
  SET status = CASE
    WHEN (SELECT SUM(received_quantity) FROM manufacturing_purchase_order_items WHERE po_id = po.id) = 0 THEN 'ordered'
    WHEN (SELECT SUM(received_quantity) FROM manufacturing_purchase_order_items WHERE po_id = po.id) < 
         (SELECT SUM(quantity) FROM manufacturing_purchase_order_items WHERE po_id = po.id) THEN 'partial'
    ELSE 'received'
  END
  WHERE id = (SELECT po_id FROM manufacturing_purchase_order_items WHERE id = NEW.po_item_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_po_received
  AFTER INSERT ON manufacturing_purchase_receipt_items
  FOR EACH ROW
  EXECUTE FUNCTION update_po_received_quantity();

-- Indexes
CREATE INDEX idx_mfg_po_company ON manufacturing_purchase_orders(company_id);
CREATE INDEX idx_mfg_po_supplier ON manufacturing_purchase_orders(supplier_id);
CREATE INDEX idx_mfg_po_status ON manufacturing_purchase_orders(company_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_mfg_po_date ON manufacturing_purchase_orders(order_date);

CREATE INDEX idx_mfg_po_items_po ON manufacturing_purchase_order_items(po_id);
CREATE INDEX idx_mfg_po_items_material ON manufacturing_purchase_order_items(material_id);

CREATE INDEX idx_mfg_receipt_po ON manufacturing_purchase_receipts(po_id);
CREATE INDEX idx_mfg_receipt_date ON manufacturing_purchase_receipts(receipt_date);

-- RLS
ALTER TABLE manufacturing_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_purchase_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_purchase_receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company POs"
  ON manufacturing_purchase_orders FOR ALL
  USING (company_id IN (
    SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage PO items"
  ON manufacturing_purchase_order_items FOR ALL
  USING (po_id IN (
    SELECT id FROM manufacturing_purchase_orders WHERE company_id IN (
      SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage their company receipts"
  ON manufacturing_purchase_receipts FOR ALL
  USING (company_id IN (
    SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage receipt items"
  ON manufacturing_purchase_receipt_items FOR ALL
  USING (receipt_id IN (
    SELECT id FROM manufacturing_purchase_receipts WHERE company_id IN (
      SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
    )
  ));

-- Triggers
CREATE TRIGGER update_manufacturing_po_updated_at
  BEFORE UPDATE ON manufacturing_purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE manufacturing_purchase_orders IS 'Purchase orders for raw materials from suppliers';
COMMENT ON TABLE manufacturing_purchase_order_items IS 'Line items in a purchase order';
COMMENT ON TABLE manufacturing_purchase_receipts IS 'Goods receipt documents for POs';
-- Migration: 031_create_manufacturing_production_orders
-- Description: Production Orders (Lệnh sản xuất)
-- Date: 2024-01-15

-- Production Orders (Lệnh sản xuất)
CREATE TABLE IF NOT EXISTS manufacturing_production_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Production Info
  production_number VARCHAR(50) NOT NULL,
  name VARCHAR(255),
  
  -- Product & BOM
  product_id UUID NOT NULL REFERENCES products(id),
  bom_id UUID REFERENCES manufacturing_bom(id), -- If null, use default BOM
  
  -- Quantities
  planned_quantity DECIMAL(15, 3) NOT NULL,
  actual_quantity DECIMAL(15, 3) DEFAULT 0,
  rejected_quantity DECIMAL(15, 3) DEFAULT 0,
  
  -- Scheduling
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft', -- 'draft', 'planned', 'confirmed', 'in_progress', 'completed', 'cancelled'
  priority VARCHAR(10) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  
  -- Costs
  planned_cost DECIMAL(15, 2) DEFAULT 0,
  actual_cost DECIMAL(15, 2) DEFAULT 0,
  
  -- References
  sales_order_id UUID REFERENCES sales_orders(id), -- If producing for specific order
  
  -- Notes
  notes TEXT,
  
  -- Workflow
  created_by UUID REFERENCES auth.users(id),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(company_id, production_number)
);

-- Production Order Material Requirements
CREATE TABLE IF NOT EXISTS manufacturing_production_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES manufacturing_production_orders(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES manufacturing_materials(id),
  
  -- Quantities (calculated from BOM * production quantity)
  required_quantity DECIMAL(15, 3) NOT NULL,
  issued_quantity DECIMAL(15, 3) DEFAULT 0, -- Already issued to production
  returned_quantity DECIMAL(15, 3) DEFAULT 0, -- Returned unused
  consumed_quantity DECIMAL(15, 3) DEFAULT 0, -- Actually used
  
  unit VARCHAR(20),
  unit_cost DECIMAL(15, 2) DEFAULT 0,
  
  -- Status
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'partial', 'issued', 'returned'
  
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Production Output (Thành phẩm nhập kho)
CREATE TABLE IF NOT EXISTS manufacturing_production_output (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  production_order_id UUID NOT NULL REFERENCES manufacturing_production_orders(id) ON DELETE CASCADE,
  
  output_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quantity DECIMAL(15, 3) NOT NULL,
  rejected_quantity DECIMAL(15, 3) DEFAULT 0,
  
  -- Quality
  quality_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'passed', 'failed'
  quality_notes TEXT,
  
  -- Storage
  warehouse_id UUID REFERENCES warehouses(id),
  batch_number VARCHAR(50),
  expiry_date DATE,
  
  -- Cost
  unit_cost DECIMAL(15, 2), -- Calculated from materials + overhead
  
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to generate production number
CREATE OR REPLACE FUNCTION generate_production_number(p_company_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_year VARCHAR(4);
  v_count INTEGER;
BEGIN
  v_year := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  SELECT COUNT(*) + 1 INTO v_count
  FROM manufacturing_production_orders
  WHERE company_id = p_company_id
    AND production_number LIKE 'PRO' || v_year || '%';
  
  RETURN 'PRO' || v_year || LPAD(v_count::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to create material requirements from BOM
CREATE OR REPLACE FUNCTION create_production_materials(p_production_id UUID)
RETURNS VOID AS $$
DECLARE
  v_bom_id UUID;
  v_quantity DECIMAL(15, 3);
  v_output_qty DECIMAL(15, 3);
BEGIN
  -- Get BOM and planned quantity
  SELECT 
    COALESCE(po.bom_id, (SELECT id FROM manufacturing_bom WHERE product_id = po.product_id AND is_default = TRUE LIMIT 1)),
    po.planned_quantity
  INTO v_bom_id, v_quantity
  FROM manufacturing_production_orders po
  WHERE po.id = p_production_id;
  
  IF v_bom_id IS NULL THEN
    RAISE EXCEPTION 'No BOM found for this product';
  END IF;
  
  -- Get BOM output quantity
  SELECT output_quantity INTO v_output_qty FROM manufacturing_bom WHERE id = v_bom_id;
  
  -- Insert material requirements
  INSERT INTO manufacturing_production_materials (
    production_order_id, material_id, required_quantity, unit, unit_cost
  )
  SELECT 
    p_production_id,
    bi.material_id,
    (bi.quantity * (1 + bi.waste_percent / 100) * v_quantity / v_output_qty),
    bi.unit,
    m.unit_cost
  FROM manufacturing_bom_items bi
  JOIN manufacturing_materials m ON m.id = bi.material_id
  WHERE bi.bom_id = v_bom_id;
  
  -- Update planned cost
  UPDATE manufacturing_production_orders
  SET planned_cost = (
    SELECT COALESCE(SUM(required_quantity * unit_cost), 0)
    FROM manufacturing_production_materials
    WHERE production_order_id = p_production_id
  )
  WHERE id = p_production_id;
END;
$$ LANGUAGE plpgsql;

-- Function to update production order on output
CREATE OR REPLACE FUNCTION update_production_on_output()
RETURNS TRIGGER AS $$
BEGIN
  -- Update actual quantities
  UPDATE manufacturing_production_orders
  SET 
    actual_quantity = (
      SELECT COALESCE(SUM(quantity), 0) 
      FROM manufacturing_production_output 
      WHERE production_order_id = NEW.production_order_id
    ),
    rejected_quantity = (
      SELECT COALESCE(SUM(rejected_quantity), 0) 
      FROM manufacturing_production_output 
      WHERE production_order_id = NEW.production_order_id
    ),
    actual_end_date = CASE 
      WHEN actual_quantity >= planned_quantity THEN CURRENT_DATE 
      ELSE actual_end_date 
    END,
    status = CASE 
      WHEN actual_quantity >= planned_quantity THEN 'completed'
      ELSE status 
    END,
    updated_at = NOW()
  WHERE id = NEW.production_order_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_production_on_output
  AFTER INSERT ON manufacturing_production_output
  FOR EACH ROW
  EXECUTE FUNCTION update_production_on_output();

-- Indexes
CREATE INDEX idx_mfg_prod_company ON manufacturing_production_orders(company_id);
CREATE INDEX idx_mfg_prod_product ON manufacturing_production_orders(product_id);
CREATE INDEX idx_mfg_prod_status ON manufacturing_production_orders(company_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_mfg_prod_dates ON manufacturing_production_orders(planned_start_date, planned_end_date);
CREATE INDEX idx_mfg_prod_priority ON manufacturing_production_orders(company_id, priority, status) WHERE deleted_at IS NULL;

CREATE INDEX idx_mfg_prod_mat_order ON manufacturing_production_materials(production_order_id);
CREATE INDEX idx_mfg_prod_mat_material ON manufacturing_production_materials(material_id);

CREATE INDEX idx_mfg_prod_output_order ON manufacturing_production_output(production_order_id);
CREATE INDEX idx_mfg_prod_output_date ON manufacturing_production_output(output_date);

-- RLS
ALTER TABLE manufacturing_production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_production_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_production_output ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their company production orders"
  ON manufacturing_production_orders FOR ALL
  USING (company_id IN (
    SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage production materials"
  ON manufacturing_production_materials FOR ALL
  USING (production_order_id IN (
    SELECT id FROM manufacturing_production_orders WHERE company_id IN (
      SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Users can manage production output"
  ON manufacturing_production_output FOR ALL
  USING (production_order_id IN (
    SELECT id FROM manufacturing_production_orders WHERE company_id IN (
      SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
    )
  ));

-- Triggers
CREATE TRIGGER update_manufacturing_production_orders_updated_at
  BEFORE UPDATE ON manufacturing_production_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE manufacturing_production_orders IS 'Production orders for manufacturing products';
COMMENT ON TABLE manufacturing_production_materials IS 'Material requirements for a production order';
COMMENT ON TABLE manufacturing_production_output IS 'Finished goods output from production';
-- Migration: 032_create_manufacturing_payables
-- Description: Accounts Payable (Công nợ phải trả NCC)
-- Date: 2024-01-15

-- Payables (Công nợ phải trả)
CREATE TABLE IF NOT EXISTS manufacturing_payables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Supplier & PO reference
  supplier_id UUID NOT NULL REFERENCES manufacturing_suppliers(id),
  po_id UUID REFERENCES manufacturing_purchase_orders(id),
  
  -- Invoice info
  invoice_number VARCHAR(50),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  
  -- Amounts
  total_amount DECIMAL(15, 2) NOT NULL,
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  outstanding_amount DECIMAL(15, 2) GENERATED ALWAYS AS (total_amount - paid_amount) STORED,
  
  -- Currency
  currency VARCHAR(3) DEFAULT 'VND',
  
  -- Status
  status VARCHAR(20) DEFAULT 'outstanding', -- 'outstanding', 'partial', 'paid', 'overdue', 'cancelled'
  
  -- Notes
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  
  UNIQUE(company_id, supplier_id, invoice_number)
);

-- Payable Payments (Các lần thanh toán)
CREATE TABLE IF NOT EXISTS manufacturing_payable_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payable_id UUID NOT NULL REFERENCES manufacturing_payables(id) ON DELETE CASCADE,
  
  -- Payment info
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(15, 2) NOT NULL,
  
  -- Method
  payment_method VARCHAR(20) NOT NULL, -- 'cash', 'bank_transfer', 'check', 'other'
  reference VARCHAR(100), -- Bank reference, check number, etc.
  bank_account VARCHAR(50),
  
  -- GPS (for mobile payments)
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  
  notes TEXT,
  
  -- Recorded by
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function to update payable on payment
CREATE OR REPLACE FUNCTION update_payable_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Update paid amount
  UPDATE manufacturing_payables
  SET 
    paid_amount = (
      SELECT COALESCE(SUM(amount), 0) 
      FROM manufacturing_payable_payments 
      WHERE payable_id = NEW.payable_id
    ),
    status = CASE
      WHEN paid_amount >= total_amount THEN 'paid'
      WHEN paid_amount > 0 THEN 'partial'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = NEW.payable_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_payable_on_payment
  AFTER INSERT ON manufacturing_payable_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payable_on_payment();

-- Function to check and update overdue payables
CREATE OR REPLACE FUNCTION update_overdue_payables()
RETURNS VOID AS $$
BEGIN
  UPDATE manufacturing_payables
  SET 
    status = 'overdue',
    updated_at = NOW()
  WHERE status = 'outstanding'
    AND due_date < CURRENT_DATE
    AND outstanding_amount > 0
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Aging Report Function for Payables
CREATE OR REPLACE FUNCTION get_payables_aging_report(p_company_id UUID)
RETURNS TABLE (
  supplier_id UUID,
  supplier_name VARCHAR,
  current_amount DECIMAL,
  days_1_30 DECIMAL,
  days_31_60 DECIMAL,
  days_61_90 DECIMAL,
  over_90_days DECIMAL,
  total_outstanding DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as supplier_id,
    s.name as supplier_name,
    COALESCE(SUM(CASE WHEN p.due_date >= CURRENT_DATE THEN p.outstanding_amount ELSE 0 END), 0) as current_amount,
    COALESCE(SUM(CASE WHEN p.due_date < CURRENT_DATE AND p.due_date >= CURRENT_DATE - INTERVAL '30 days' THEN p.outstanding_amount ELSE 0 END), 0) as days_1_30,
    COALESCE(SUM(CASE WHEN p.due_date < CURRENT_DATE - INTERVAL '30 days' AND p.due_date >= CURRENT_DATE - INTERVAL '60 days' THEN p.outstanding_amount ELSE 0 END), 0) as days_31_60,
    COALESCE(SUM(CASE WHEN p.due_date < CURRENT_DATE - INTERVAL '60 days' AND p.due_date >= CURRENT_DATE - INTERVAL '90 days' THEN p.outstanding_amount ELSE 0 END), 0) as days_61_90,
    COALESCE(SUM(CASE WHEN p.due_date < CURRENT_DATE - INTERVAL '90 days' THEN p.outstanding_amount ELSE 0 END), 0) as over_90_days,
    COALESCE(SUM(p.outstanding_amount), 0) as total_outstanding
  FROM manufacturing_suppliers s
  LEFT JOIN manufacturing_payables p ON p.supplier_id = s.id AND p.deleted_at IS NULL AND p.outstanding_amount > 0
  WHERE s.company_id = p_company_id AND s.deleted_at IS NULL
  GROUP BY s.id, s.name
  HAVING COALESCE(SUM(p.outstanding_amount), 0) > 0
  ORDER BY total_outstanding DESC;
END;
$$ LANGUAGE plpgsql;

-- View for supplier balance
CREATE OR REPLACE VIEW manufacturing_supplier_balance AS
SELECT 
  s.id as supplier_id,
  s.company_id,
  s.name as supplier_name,
  s.credit_limit,
  COALESCE(SUM(p.outstanding_amount), 0) as total_outstanding,
  s.credit_limit - COALESCE(SUM(p.outstanding_amount), 0) as available_credit,
  COUNT(CASE WHEN p.status = 'overdue' THEN 1 END) as overdue_count
FROM manufacturing_suppliers s
LEFT JOIN manufacturing_payables p ON p.supplier_id = s.id AND p.deleted_at IS NULL AND p.outstanding_amount > 0
WHERE s.deleted_at IS NULL
GROUP BY s.id, s.company_id, s.name, s.credit_limit;

-- Indexes
CREATE INDEX idx_mfg_payables_company ON manufacturing_payables(company_id);
CREATE INDEX idx_mfg_payables_supplier ON manufacturing_payables(supplier_id);
CREATE INDEX idx_mfg_payables_po ON manufacturing_payables(po_id);
CREATE INDEX idx_mfg_payables_status ON manufacturing_payables(company_id, status) WHERE deleted_at IS NULL;
CREATE INDEX idx_mfg_payables_due ON manufacturing_payables(due_date) WHERE status IN ('outstanding', 'partial');
CREATE INDEX idx_mfg_payables_overdue ON manufacturing_payables(company_id) WHERE status = 'overdue' AND deleted_at IS NULL;

CREATE INDEX idx_mfg_pay_payments_payable ON manufacturing_payable_payments(payable_id);
CREATE INDEX idx_mfg_pay_payments_date ON manufacturing_payable_payments(payment_date);

-- RLS
ALTER TABLE manufacturing_payables ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_payable_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their company payables"
  ON manufacturing_payables FOR SELECT
  USING (company_id IN (
    SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can insert their company payables"
  ON manufacturing_payables FOR INSERT
  WITH CHECK (company_id IN (
    SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can update their company payables"
  ON manufacturing_payables FOR UPDATE
  USING (company_id IN (
    SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their company payables"
  ON manufacturing_payables FOR DELETE
  USING (company_id IN (
    SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
  ));

CREATE POLICY "Users can manage payable payments"
  ON manufacturing_payable_payments FOR ALL
  USING (payable_id IN (
    SELECT id FROM manufacturing_payables WHERE company_id IN (
      SELECT (raw_user_meta_data->>'company_id')::uuid FROM auth.users WHERE id = auth.uid()
    )
  ));

-- Triggers
CREATE TRIGGER update_manufacturing_payables_updated_at
  BEFORE UPDATE ON manufacturing_payables
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE manufacturing_payables IS 'Accounts payable to suppliers';
COMMENT ON TABLE manufacturing_payable_payments IS 'Payment records for payables';
COMMENT ON COLUMN manufacturing_payables.outstanding_amount IS 'Auto-calculated remaining balance';
