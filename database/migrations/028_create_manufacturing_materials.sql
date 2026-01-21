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
  warehouse_id UUID REFERENCES odori_warehouses(id), -- Link to existing warehouses
  
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
  warehouse_id UUID REFERENCES odori_warehouses(id),
  
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
