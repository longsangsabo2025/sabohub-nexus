-- Quick fix: Create missing manufacturing tables

-- 1. Create manufacturing_production_output if not exists
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

CREATE INDEX IF NOT EXISTS idx_prod_output_order ON manufacturing_production_output(production_order_id);
CREATE INDEX IF NOT EXISTS idx_prod_output_date ON manufacturing_production_output(output_date);

-- 2. Create manufacturing_payable_payments if not exists
CREATE TABLE IF NOT EXISTS manufacturing_payable_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payable_id UUID NOT NULL REFERENCES manufacturing_payables(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  amount DECIMAL(15, 2) NOT NULL,
  
  payment_method VARCHAR(20), -- 'cash', 'bank_transfer', 'check', 'other'
  reference_number VARCHAR(100),
  
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payable_payments_payable ON manufacturing_payable_payments(payable_id);
CREATE INDEX IF NOT EXISTS idx_payable_payments_company ON manufacturing_payable_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payable_payments_date ON manufacturing_payable_payments(payment_date);

-- Enable RLS
ALTER TABLE manufacturing_production_output ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturing_payable_payments ENABLE ROW LEVEL SECURITY;

-- Comments
COMMENT ON TABLE manufacturing_production_output IS 'Production output records (finished goods)';
COMMENT ON TABLE manufacturing_payable_payments IS 'Payable payment records';
