-- =====================================================
-- Migration: 020_customers_module.sql
-- Description: CRM/Customers module for B2B sales
-- Reusable: Yes (multi-tenant via company_id)
-- =====================================================

-- Enable UUID extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- TABLE: customers
-- Purpose: B2B customers (KH doanh nghiệp, đại lý, horeca)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  
  -- Basic info
  code VARCHAR(50),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) DEFAULT 'retail',
  
  -- Contact
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  district VARCHAR(100),
  ward VARCHAR(100),
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  
  -- Business info
  tax_code VARCHAR(50),
  contact_person VARCHAR(255),
  payment_terms INTEGER DEFAULT 0,
  credit_limit DECIMAL(15, 2) DEFAULT 0,
  
  -- Classification
  category VARCHAR(50),
  channel VARCHAR(50),
  tags JSONB DEFAULT '[]',
  
  -- Assignment
  assigned_sale_id UUID REFERENCES public.employees(id) ON DELETE SET NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',
  last_order_date TIMESTAMPTZ,
  last_visit_date TIMESTAMPTZ,
  
  -- Audit
  created_by UUID,  -- CEO/Manager who created
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  
  -- Constraints
  CONSTRAINT customers_type_check CHECK (type IN ('retail', 'wholesale', 'distributor', 'horeca', 'other')),
  CONSTRAINT customers_status_check CHECK (status IN ('active', 'inactive', 'blocked')),
  CONSTRAINT customers_payment_terms_check CHECK (payment_terms >= 0)
);

-- Unique constraint: code per company
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_code_company 
  ON public.customers(company_id, code) WHERE code IS NOT NULL AND deleted_at IS NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customers_company ON public.customers(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_branch ON public.customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_assigned_sale ON public.customers(assigned_sale_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON public.customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_type ON public.customers(type);
CREATE INDEX IF NOT EXISTS idx_customers_channel ON public.customers(channel);
CREATE INDEX IF NOT EXISTS idx_customers_name ON public.customers(company_id, name);

-- =====================================================
-- TABLE: customer_contacts
-- Purpose: Multiple contacts per customer
-- =====================================================
CREATE TABLE IF NOT EXISTS public.customer_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  position VARCHAR(100),
  phone VARCHAR(20),
  email VARCHAR(255),
  is_primary BOOLEAN DEFAULT false,
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_contacts_customer ON public.customer_contacts(customer_id);

-- =====================================================
-- TABLE: customer_visits
-- Purpose: Track sales visits to customers (thăm khách)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.customer_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  
  visit_date DATE NOT NULL,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  check_in_lat DECIMAL(10, 8),
  check_in_lng DECIMAL(11, 8),
  check_out_lat DECIMAL(10, 8),
  check_out_lng DECIMAL(11, 8),
  
  purpose VARCHAR(100),
  notes TEXT,
  photos JSONB DEFAULT '[]',
  
  result VARCHAR(50),
  order_id UUID,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT customer_visits_purpose_check CHECK (purpose IN ('sales', 'collection', 'support', 'survey', 'other')),
  CONSTRAINT customer_visits_result_check CHECK (result IN ('ordered', 'no_order', 'not_available', 'rescheduled', NULL))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_customer_visits_company ON public.customer_visits(company_id);
CREATE INDEX IF NOT EXISTS idx_customer_visits_customer ON public.customer_visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_visits_employee ON public.customer_visits(employee_id);
CREATE INDEX IF NOT EXISTS idx_customer_visits_date ON public.customer_visits(visit_date);

-- =====================================================
-- TRIGGERS: Auto-update updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS customers_updated_at ON public.customers;
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS customer_contacts_updated_at ON public.customer_contacts;
CREATE TRIGGER customer_contacts_updated_at
  BEFORE UPDATE ON public.customer_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- RLS: Row Level Security
-- =====================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_visits ENABLE ROW LEVEL SECURITY;

-- Customers RLS Policies
DROP POLICY IF EXISTS "customers_select_company" ON public.customers;
CREATE POLICY "customers_select_company" ON public.customers
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "customers_insert_company" ON public.customers;
CREATE POLICY "customers_insert_company" ON public.customers
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "customers_update_company" ON public.customers;
CREATE POLICY "customers_update_company" ON public.customers
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "customers_delete_company" ON public.customers;
CREATE POLICY "customers_delete_company" ON public.customers
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM public.users 
      WHERE id = auth.uid() AND role IN ('ceo', 'manager')
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

-- Customer Contacts RLS (inherit from customer)
DROP POLICY IF EXISTS "customer_contacts_select" ON public.customer_contacts;
CREATE POLICY "customer_contacts_select" ON public.customer_contacts
  FOR SELECT USING (
    customer_id IN (SELECT id FROM public.customers)
  );

DROP POLICY IF EXISTS "customer_contacts_insert" ON public.customer_contacts;
CREATE POLICY "customer_contacts_insert" ON public.customer_contacts
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM public.customers)
  );

DROP POLICY IF EXISTS "customer_contacts_update" ON public.customer_contacts;
CREATE POLICY "customer_contacts_update" ON public.customer_contacts
  FOR UPDATE USING (
    customer_id IN (SELECT id FROM public.customers)
  );

DROP POLICY IF EXISTS "customer_contacts_delete" ON public.customer_contacts;
CREATE POLICY "customer_contacts_delete" ON public.customer_contacts
  FOR DELETE USING (
    customer_id IN (SELECT id FROM public.customers)
  );

-- Customer Visits RLS
DROP POLICY IF EXISTS "customer_visits_select_company" ON public.customer_visits;
CREATE POLICY "customer_visits_select_company" ON public.customer_visits
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "customer_visits_insert_company" ON public.customer_visits;
CREATE POLICY "customer_visits_insert_company" ON public.customer_visits
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "customer_visits_update_company" ON public.customer_visits;
CREATE POLICY "customer_visits_update_company" ON public.customer_visits
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS: Helper functions
-- =====================================================

-- Auto-generate customer code
CREATE OR REPLACE FUNCTION public.generate_customer_code(p_company_id UUID)
RETURNS VARCHAR(50) AS $$
DECLARE
  v_prefix VARCHAR(10) := 'KH';
  v_next_num INTEGER;
  v_code VARCHAR(50);
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(REGEXP_REPLACE(code, '[^0-9]', '', 'g'), '') AS INTEGER)
  ), 0) + 1
  INTO v_next_num
  FROM public.customers
  WHERE company_id = p_company_id AND code LIKE v_prefix || '%';
  
  v_code := v_prefix || LPAD(v_next_num::TEXT, 6, '0');
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.customers IS 'B2B customers - multi-tenant, supports retail/wholesale/distributor/horeca';
COMMENT ON TABLE public.customer_contacts IS 'Multiple contact persons per customer';
COMMENT ON TABLE public.customer_visits IS 'Sales visit tracking with GPS check-in';
COMMENT ON COLUMN public.customers.type IS 'Customer type: retail, wholesale, distributor, horeca, other';
COMMENT ON COLUMN public.customers.channel IS 'Sales channel: horeca, mt (modern trade), gt (general trade), online';
COMMENT ON COLUMN public.customers.payment_terms IS 'Payment terms in days (0 = COD)';
