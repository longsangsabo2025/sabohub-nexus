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
