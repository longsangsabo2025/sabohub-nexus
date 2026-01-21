-- Migration: 029_create_manufacturing_bom
-- Description: Bill of Materials (Định mức sản phẩm)
-- Date: 2024-01-15

-- BOM Header (Định mức sản phẩm)
CREATE TABLE IF NOT EXISTS manufacturing_bom (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Link to finished product
  product_id UUID NOT NULL REFERENCES odori_products(id),
  
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
JOIN odori_products p ON p.id = b.product_id;

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
