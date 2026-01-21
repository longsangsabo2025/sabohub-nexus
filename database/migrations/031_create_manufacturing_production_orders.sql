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
  product_id UUID NOT NULL REFERENCES odori_products(id),
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
  sales_order_id UUID REFERENCES odori_sales_orders(id), -- If producing for specific order
  
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
  warehouse_id UUID REFERENCES odori_warehouses(id),
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
