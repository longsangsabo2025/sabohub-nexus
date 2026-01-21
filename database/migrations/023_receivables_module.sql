-- =====================================================
-- Migration: 023_receivables_module.sql
-- Description: Accounts Receivable (Công nợ phải thu)
-- Reusable: Yes (multi-tenant via company_id)
-- =====================================================

-- =====================================================
-- TABLE: receivables
-- Purpose: Track amounts owed by customers
-- =====================================================
CREATE TABLE IF NOT EXISTS public.receivables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  
  -- Reference to source document
  reference_type VARCHAR(50) NOT NULL,
  reference_id UUID NOT NULL,
  reference_number VARCHAR(100),
  
  -- Amounts
  original_amount DECIMAL(15, 2) NOT NULL,
  paid_amount DECIMAL(15, 2) DEFAULT 0,
  write_off_amount DECIMAL(15, 2) DEFAULT 0,
  
  -- Dates
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'open',
  
  -- Collection tracking
  last_reminder_date DATE,
  reminder_count INTEGER DEFAULT 0,
  last_payment_date DATE,
  
  -- Assignment
  collector_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT receivables_reference_type_check CHECK (reference_type IN ('sales_order', 'invoice', 'other')),
  CONSTRAINT receivables_status_check CHECK (status IN ('open', 'partial', 'paid', 'overdue', 'written_off', 'disputed')),
  CONSTRAINT receivables_amounts_check CHECK (
    original_amount >= 0 AND 
    paid_amount >= 0 AND 
    write_off_amount >= 0 AND
    paid_amount + write_off_amount <= original_amount
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_receivables_company ON public.receivables(company_id);
CREATE INDEX IF NOT EXISTS idx_receivables_customer ON public.receivables(customer_id);
CREATE INDEX IF NOT EXISTS idx_receivables_status ON public.receivables(status);
CREATE INDEX IF NOT EXISTS idx_receivables_due_date ON public.receivables(due_date);
CREATE INDEX IF NOT EXISTS idx_receivables_reference ON public.receivables(reference_type, reference_id);

-- =====================================================
-- TABLE: payments
-- Purpose: Record customer payments
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  
  payment_number VARCHAR(50) NOT NULL,
  payment_date DATE DEFAULT CURRENT_DATE,
  
  amount DECIMAL(15, 2) NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  
  -- Bank/check details
  bank_name VARCHAR(100),
  bank_account VARCHAR(50),
  reference_number VARCHAR(100),
  
  -- Status
  status VARCHAR(20) DEFAULT 'completed',
  
  notes TEXT,
  
  -- Collector
  collected_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  collection_location VARCHAR(255),
  collection_lat DECIMAL(10, 8),
  collection_lng DECIMAL(11, 8),
  
  -- Attachments (receipts, photos)
  attachments JSONB DEFAULT '[]',
  
  created_by UUID,  -- User who created
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT payments_amount_check CHECK (amount > 0),
  CONSTRAINT payments_method_check CHECK (payment_method IN ('cash', 'transfer', 'check', 'card', 'other')),
  CONSTRAINT payments_status_check CHECK (status IN ('pending', 'completed', 'cancelled', 'bounced'))
);

-- Unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_number_company 
  ON public.payments(company_id, payment_number);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payments_company ON public.payments(company_id);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON public.payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON public.payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_collector ON public.payments(collected_by);

-- =====================================================
-- TABLE: payment_allocations
-- Purpose: Link payments to receivables
-- =====================================================
CREATE TABLE IF NOT EXISTS public.payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES public.payments(id) ON DELETE CASCADE,
  receivable_id UUID NOT NULL REFERENCES public.receivables(id) ON DELETE CASCADE,
  
  amount DECIMAL(15, 2) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT payment_allocations_amount_check CHECK (amount > 0)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment ON public.payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_allocations_receivable ON public.payment_allocations(receivable_id);

-- Unique: prevent duplicate allocation
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_allocations_unique 
  ON public.payment_allocations(payment_id, receivable_id);

-- =====================================================
-- TABLE: collection_schedules
-- Purpose: Plan collection visits
-- =====================================================
CREATE TABLE IF NOT EXISTS public.collection_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  
  scheduled_date DATE NOT NULL,
  scheduled_time TIME,
  
  collector_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  
  expected_amount DECIMAL(15, 2),
  
  status VARCHAR(20) DEFAULT 'scheduled',
  
  notes TEXT,
  result TEXT,
  actual_amount DECIMAL(15, 2),
  payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
  
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT collection_schedules_status_check CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled', 'rescheduled'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_collection_schedules_company ON public.collection_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_collection_schedules_customer ON public.collection_schedules(customer_id);
CREATE INDEX IF NOT EXISTS idx_collection_schedules_date ON public.collection_schedules(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_collection_schedules_collector ON public.collection_schedules(collector_id);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Update receivables updated_at
DROP TRIGGER IF EXISTS receivables_updated_at ON public.receivables;
CREATE TRIGGER receivables_updated_at
  BEFORE UPDATE ON public.receivables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Update payments updated_at
DROP TRIGGER IF EXISTS payments_updated_at ON public.payments;
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Generate payment number
CREATE OR REPLACE FUNCTION public.generate_payment_number(p_company_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_prefix VARCHAR(10) := 'PAY';
  v_date_part VARCHAR(10);
  v_next_num INTEGER;
BEGIN
  v_date_part := TO_CHAR(CURRENT_DATE, 'YYMMDD');
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(SUBSTRING(payment_number FROM LENGTH(v_prefix) + 7), '') AS INTEGER)
  ), 0) + 1
  INTO v_next_num
  FROM public.payments
  WHERE company_id = p_company_id 
    AND payment_number LIKE v_prefix || v_date_part || '%';
  
  RETURN v_prefix || v_date_part || LPAD(v_next_num::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Update receivable on payment allocation
CREATE OR REPLACE FUNCTION public.update_receivable_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  v_total_paid DECIMAL(15, 2);
  v_original_amount DECIMAL(15, 2);
  v_write_off DECIMAL(15, 2);
  v_new_status VARCHAR(20);
BEGIN
  -- Calculate total paid for this receivable
  SELECT COALESCE(SUM(pa.amount), 0), r.original_amount, COALESCE(r.write_off_amount, 0)
  INTO v_total_paid, v_original_amount, v_write_off
  FROM public.receivables r
  LEFT JOIN public.payment_allocations pa ON pa.receivable_id = r.id
  WHERE r.id = NEW.receivable_id
  GROUP BY r.id, r.original_amount, r.write_off_amount;
  
  -- Determine status
  IF v_total_paid + v_write_off >= v_original_amount THEN
    v_new_status := 'paid';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partial';
  ELSE
    v_new_status := 'open';
  END IF;
  
  -- Update receivable
  UPDATE public.receivables
  SET paid_amount = v_total_paid,
      status = v_new_status,
      last_payment_date = CURRENT_DATE,
      updated_at = now()
  WHERE id = NEW.receivable_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_receivable_on_allocation ON public.payment_allocations;
CREATE TRIGGER update_receivable_on_allocation
  AFTER INSERT OR UPDATE OR DELETE ON public.payment_allocations
  FOR EACH ROW EXECUTE FUNCTION public.update_receivable_on_payment();

-- Create receivable from sales order
CREATE OR REPLACE FUNCTION public.create_receivable_from_order(p_order_id UUID)
RETURNS UUID AS $$
DECLARE
  v_order RECORD;
  v_receivable_id UUID;
BEGIN
  SELECT * INTO v_order FROM public.sales_orders WHERE id = p_order_id;
  
  IF v_order.payment_terms IS NULL OR v_order.payment_terms = 0 THEN
    -- COD, no receivable needed
    RETURN NULL;
  END IF;
  
  INSERT INTO public.receivables (
    company_id, customer_id, reference_type, reference_id, reference_number,
    original_amount, invoice_date, due_date, status
  ) VALUES (
    v_order.company_id, v_order.customer_id, 'sales_order', v_order.id, v_order.order_number,
    v_order.total, v_order.order_date, 
    v_order.order_date + (SELECT COALESCE(payment_terms, 0) FROM public.customers WHERE id = v_order.customer_id) * INTERVAL '1 day',
    'open'
  )
  RETURNING id INTO v_receivable_id;
  
  RETURN v_receivable_id;
END;
$$ LANGUAGE plpgsql;

-- Update overdue status (run daily via cron)
CREATE OR REPLACE FUNCTION public.update_overdue_receivables()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.receivables
  SET status = 'overdue'
  WHERE status IN ('open', 'partial')
    AND due_date < CURRENT_DATE;
  
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- RLS: Row Level Security
-- =====================================================
ALTER TABLE public.receivables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_schedules ENABLE ROW LEVEL SECURITY;

-- Receivables RLS
DROP POLICY IF EXISTS "receivables_select_company" ON public.receivables;
CREATE POLICY "receivables_select_company" ON public.receivables
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "receivables_all_company" ON public.receivables;
CREATE POLICY "receivables_all_company" ON public.receivables
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

-- Payments RLS
DROP POLICY IF EXISTS "payments_select_company" ON public.payments;
CREATE POLICY "payments_select_company" ON public.payments
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "payments_insert_company" ON public.payments;
CREATE POLICY "payments_insert_company" ON public.payments
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "payments_update_managers" ON public.payments;
CREATE POLICY "payments_update_managers" ON public.payments
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.users 
      WHERE id = auth.uid() AND role IN ('ceo', 'manager')
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

-- Payment Allocations RLS (via payments)
DROP POLICY IF EXISTS "payment_allocations_select" ON public.payment_allocations;
CREATE POLICY "payment_allocations_select" ON public.payment_allocations
  FOR SELECT USING (
    payment_id IN (SELECT id FROM public.payments)
  );

DROP POLICY IF EXISTS "payment_allocations_all" ON public.payment_allocations;
CREATE POLICY "payment_allocations_all" ON public.payment_allocations
  FOR ALL USING (
    payment_id IN (SELECT id FROM public.payments)
  );

-- Collection Schedules RLS
DROP POLICY IF EXISTS "collection_schedules_select_company" ON public.collection_schedules;
CREATE POLICY "collection_schedules_select_company" ON public.collection_schedules
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "collection_schedules_all_company" ON public.collection_schedules;
CREATE POLICY "collection_schedules_all_company" ON public.collection_schedules
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

-- =====================================================
-- VIEWS: Reporting
-- =====================================================

-- Customer balance summary
CREATE OR REPLACE VIEW public.v_customer_balance AS
SELECT 
  c.id as customer_id,
  c.company_id,
  c.name as customer_name,
  c.credit_limit,
  COALESCE(SUM(CASE WHEN r.status NOT IN ('paid', 'written_off') THEN r.original_amount - r.paid_amount - COALESCE(r.write_off_amount, 0) ELSE 0 END), 0) as outstanding_balance,
  COALESCE(SUM(CASE WHEN r.status = 'overdue' THEN r.original_amount - r.paid_amount - COALESCE(r.write_off_amount, 0) ELSE 0 END), 0) as overdue_balance,
  COUNT(CASE WHEN r.status NOT IN ('paid', 'written_off') THEN 1 END) as open_invoices,
  COUNT(CASE WHEN r.status = 'overdue' THEN 1 END) as overdue_invoices,
  MIN(CASE WHEN r.status = 'overdue' THEN r.due_date END) as oldest_overdue_date
FROM public.customers c
LEFT JOIN public.receivables r ON r.customer_id = c.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, c.company_id, c.name, c.credit_limit;

-- Aging report
CREATE OR REPLACE VIEW public.v_receivables_aging AS
SELECT 
  r.company_id,
  r.customer_id,
  c.name as customer_name,
  r.id as receivable_id,
  r.reference_number,
  r.original_amount,
  r.paid_amount,
  r.original_amount - r.paid_amount - COALESCE(r.write_off_amount, 0) as balance,
  r.invoice_date,
  r.due_date,
  CURRENT_DATE - r.due_date as days_overdue,
  CASE 
    WHEN CURRENT_DATE <= r.due_date THEN 'current'
    WHEN CURRENT_DATE - r.due_date <= 30 THEN '1-30'
    WHEN CURRENT_DATE - r.due_date <= 60 THEN '31-60'
    WHEN CURRENT_DATE - r.due_date <= 90 THEN '61-90'
    ELSE '90+'
  END as aging_bucket
FROM public.receivables r
JOIN public.customers c ON c.id = r.customer_id
WHERE r.status NOT IN ('paid', 'written_off');

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.receivables IS 'Accounts receivable - tracks amounts owed by customers';
COMMENT ON TABLE public.payments IS 'Customer payment records';
COMMENT ON TABLE public.payment_allocations IS 'Links payments to specific receivables';
COMMENT ON TABLE public.collection_schedules IS 'Scheduled collection visits';
COMMENT ON COLUMN public.receivables.status IS 'open, partial, paid, overdue, written_off, disputed';
