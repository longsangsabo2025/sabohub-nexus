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
