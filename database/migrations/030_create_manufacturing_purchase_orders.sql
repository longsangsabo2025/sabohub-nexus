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
  warehouse_id UUID REFERENCES odori_warehouses(id),
  
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
  
  warehouse_id UUID REFERENCES odori_warehouses(id),
  
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
