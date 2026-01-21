-- =============================================
-- Migration: Full Accounting Module
-- Purpose: Chart of Accounts, General Ledger, Journal Entries, Financial Statements
-- Created: 2026-01-15
-- =============================================

-- =============================================
-- 1. CHART OF ACCOUNTS (Account Master Data)
-- =============================================
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Account Info
  account_code VARCHAR(50) UNIQUE NOT NULL,
  account_name VARCHAR(200) NOT NULL,
  account_name_en VARCHAR(200),
  description TEXT,
  
  -- Account Classification
  account_type VARCHAR(50) NOT NULL, -- 'asset', 'liability', 'equity', 'revenue', 'expense'
  account_subtype VARCHAR(50), -- 'current_asset', 'fixed_asset', 'current_liability', 'long_term_liability', etc.
  account_category VARCHAR(100), -- 'cash', 'inventory', 'ar', 'ap', 'sales', 'cogs', 'operating_expense', etc.
  
  -- Hierarchy
  parent_account_id UUID REFERENCES public.chart_of_accounts(id),
  level INTEGER DEFAULT 1,
  path TEXT, -- Hierarchical path like '1000/1100/1110'
  
  -- Balance Type
  normal_balance VARCHAR(10) NOT NULL, -- 'debit', 'credit'
  
  -- Account Behavior
  is_header BOOLEAN DEFAULT false, -- Header accounts cannot have transactions
  is_control_account BOOLEAN DEFAULT false,
  is_reconcilable BOOLEAN DEFAULT false,
  
  -- Opening Balance
  opening_balance DECIMAL(15,2) DEFAULT 0,
  opening_balance_date DATE,
  
  -- Restrictions
  allow_manual_journal BOOLEAN DEFAULT true,
  currency VARCHAR(3) DEFAULT 'VND',
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_system_account BOOLEAN DEFAULT false, -- System accounts cannot be deleted
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coa_company ON public.chart_of_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_coa_type ON public.chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_coa_parent ON public.chart_of_accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_coa_active ON public.chart_of_accounts(is_active);
CREATE INDEX IF NOT EXISTS idx_coa_path ON public.chart_of_accounts USING gin(to_tsvector('simple', path));

-- =============================================
-- 2. GENERAL LEDGER (Account Balances)
-- =============================================
CREATE TABLE IF NOT EXISTS public.general_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id) ON DELETE CASCADE,
  
  -- Period
  fiscal_year INTEGER NOT NULL,
  fiscal_period INTEGER NOT NULL, -- 1-12 for monthly, 1-4 for quarterly
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  
  -- Balances
  opening_balance_debit DECIMAL(15,2) DEFAULT 0,
  opening_balance_credit DECIMAL(15,2) DEFAULT 0,
  opening_balance DECIMAL(15,2) DEFAULT 0,
  
  period_debit DECIMAL(15,2) DEFAULT 0,
  period_credit DECIMAL(15,2) DEFAULT 0,
  period_net DECIMAL(15,2) DEFAULT 0,
  
  closing_balance_debit DECIMAL(15,2) DEFAULT 0,
  closing_balance_credit DECIMAL(15,2) DEFAULT 0,
  closing_balance DECIMAL(15,2) DEFAULT 0,
  
  -- Status
  is_closed BOOLEAN DEFAULT false,
  closed_by UUID REFERENCES public.users(id),
  closed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT gl_unique_period UNIQUE(company_id, account_id, fiscal_year, fiscal_period)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_gl_company ON public.general_ledger(company_id);
CREATE INDEX IF NOT EXISTS idx_gl_account ON public.general_ledger(account_id);
CREATE INDEX IF NOT EXISTS idx_gl_period ON public.general_ledger(fiscal_year, fiscal_period);
CREATE INDEX IF NOT EXISTS idx_gl_dates ON public.general_ledger(period_start_date, period_end_date);

-- =============================================
-- 3. JOURNAL ENTRIES (Accounting Transactions)
-- =============================================
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Entry Info
  entry_number VARCHAR(50) UNIQUE NOT NULL,
  entry_date DATE NOT NULL,
  posting_date DATE NOT NULL,
  
  -- Period
  fiscal_year INTEGER NOT NULL,
  fiscal_period INTEGER NOT NULL,
  
  -- Entry Type
  entry_type VARCHAR(50) NOT NULL, -- 'manual', 'automatic', 'adjustment', 'closing', 'opening'
  source_module VARCHAR(50), -- 'sales', 'purchase', 'inventory', 'payroll', 'manual'
  source_document_type VARCHAR(50), -- 'invoice', 'payment', 'receipt', 'purchase_order'
  source_document_id UUID,
  
  -- Description
  description TEXT NOT NULL,
  reference VARCHAR(100),
  
  -- Totals (must balance)
  total_debit DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_credit DECIMAL(15,2) NOT NULL DEFAULT 0,
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'posted', 'voided', 'reversed'
  
  -- Posting
  posted_by UUID REFERENCES public.users(id),
  posted_at TIMESTAMPTZ,
  
  -- Reversal
  reversed_by UUID REFERENCES public.users(id),
  reversed_at TIMESTAMPTZ,
  reversal_entry_id UUID REFERENCES public.journal_entries(id),
  
  -- Approval
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES public.users(id),
  approved_at TIMESTAMPTZ,
  
  -- Attachments
  attachments JSONB DEFAULT '[]'::JSONB,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id),
  
  CONSTRAINT je_balance_check CHECK (total_debit = total_credit)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_je_company ON public.journal_entries(company_id);
CREATE INDEX IF NOT EXISTS idx_je_date ON public.journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_je_period ON public.journal_entries(fiscal_year, fiscal_period);
CREATE INDEX IF NOT EXISTS idx_je_status ON public.journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_je_type ON public.journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_je_source ON public.journal_entries(source_module, source_document_id);

-- =============================================
-- 4. JOURNAL ENTRY LINES (JE Line Items)
-- =============================================
CREATE TABLE IF NOT EXISTS public.journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES public.chart_of_accounts(id),
  
  -- Line Info
  line_number INTEGER NOT NULL,
  description TEXT,
  
  -- Amounts
  debit DECIMAL(15,2) DEFAULT 0,
  credit DECIMAL(15,2) DEFAULT 0,
  
  -- Dimensions (Cost Centers, Projects, etc.)
  cost_center VARCHAR(100),
  department VARCHAR(100),
  project_id UUID,
  
  -- Analytics
  dimension1 VARCHAR(100), -- Flexible dimension
  dimension2 VARCHAR(100),
  dimension3 VARCHAR(100),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT jel_amount_check CHECK (
    (debit > 0 AND credit = 0) OR 
    (credit > 0 AND debit = 0) OR 
    (debit = 0 AND credit = 0)
  ),
  CONSTRAINT jel_unique_line UNIQUE(journal_entry_id, line_number)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_jel_entry ON public.journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_jel_account ON public.journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_jel_cost_center ON public.journal_entry_lines(cost_center);

-- =============================================
-- 5. FISCAL PERIODS
-- =============================================
CREATE TABLE IF NOT EXISTS public.fiscal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Period Info
  fiscal_year INTEGER NOT NULL,
  period_number INTEGER NOT NULL, -- 1-12 for monthly
  period_name VARCHAR(50) NOT NULL, -- 'January 2026', 'Q1 2026'
  
  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Status
  status VARCHAR(50) DEFAULT 'open', -- 'open', 'closed', 'locked'
  
  -- Closing
  closed_by UUID REFERENCES public.users(id),
  closed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT fiscal_periods_unique UNIQUE(company_id, fiscal_year, period_number),
  CONSTRAINT fiscal_periods_dates_check CHECK (start_date < end_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_company ON public.fiscal_periods(company_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_year ON public.fiscal_periods(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_fiscal_periods_dates ON public.fiscal_periods(start_date, end_date);

-- =============================================
-- 6. FINANCIAL STATEMENTS CACHE
-- =============================================
CREATE TABLE IF NOT EXISTS public.financial_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Statement Info
  statement_type VARCHAR(50) NOT NULL, -- 'balance_sheet', 'income_statement', 'cash_flow', 'trial_balance'
  
  -- Period
  fiscal_year INTEGER NOT NULL,
  fiscal_period INTEGER, -- NULL for annual statements
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  
  -- Statement Data (JSON format for flexibility)
  statement_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  
  -- Metadata
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES public.users(id),
  
  CONSTRAINT fs_unique_statement UNIQUE(
    company_id, statement_type, fiscal_year, 
    COALESCE(fiscal_period, 0), start_date, end_date
  )
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_fs_company ON public.financial_statements(company_id);
CREATE INDEX IF NOT EXISTS idx_fs_type ON public.financial_statements(statement_type);
CREATE INDEX IF NOT EXISTS idx_fs_period ON public.financial_statements(fiscal_year, fiscal_period);

-- =============================================
-- FUNCTIONS FOR AUTO-NUMBERING
-- =============================================
CREATE OR REPLACE FUNCTION generate_journal_entry_number(p_company_id UUID, p_entry_type VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR;
  v_date VARCHAR := TO_CHAR(CURRENT_DATE, 'YYYYMM');
  v_sequence INTEGER;
  v_number VARCHAR;
BEGIN
  -- Different prefixes for different entry types
  v_prefix := CASE p_entry_type
    WHEN 'manual' THEN 'JE'
    WHEN 'automatic' THEN 'AJ'
    WHEN 'adjustment' THEN 'ADJ'
    WHEN 'closing' THEN 'CL'
    WHEN 'opening' THEN 'OP'
    ELSE 'JE'
  END;
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(SUBSTRING(entry_number FROM LENGTH(v_prefix) + 7), '') AS INTEGER)
  ), 0) + 1 INTO v_sequence
  FROM public.journal_entries
  WHERE company_id = p_company_id
    AND entry_type = p_entry_type
    AND entry_number LIKE v_prefix || v_date || '%';
  
  v_number := v_prefix || v_date || LPAD(v_sequence::TEXT, 4, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- FUNCTION: Update General Ledger on Journal Post
-- =============================================
CREATE OR REPLACE FUNCTION update_general_ledger_on_post()
RETURNS TRIGGER AS $$
DECLARE
  v_line RECORD;
  v_account RECORD;
BEGIN
  -- Only process when status changes to 'posted'
  IF NEW.status = 'posted' AND (OLD.status IS NULL OR OLD.status != 'posted') THEN
    
    -- Loop through all journal entry lines
    FOR v_line IN 
      SELECT * FROM public.journal_entry_lines 
      WHERE journal_entry_id = NEW.id
    LOOP
      -- Get account info
      SELECT * INTO v_account 
      FROM public.chart_of_accounts 
      WHERE id = v_line.account_id;
      
      -- Update or insert GL record for this period
      INSERT INTO public.general_ledger (
        company_id, account_id, fiscal_year, fiscal_period,
        period_start_date, period_end_date,
        period_debit, period_credit, period_net
      )
      SELECT 
        NEW.company_id, 
        v_line.account_id,
        NEW.fiscal_year,
        NEW.fiscal_period,
        fp.start_date,
        fp.end_date,
        v_line.debit,
        v_line.credit,
        CASE 
          WHEN v_account.normal_balance = 'debit' THEN v_line.debit - v_line.credit
          ELSE v_line.credit - v_line.debit
        END
      FROM public.fiscal_periods fp
      WHERE fp.company_id = NEW.company_id
        AND fp.fiscal_year = NEW.fiscal_year
        AND fp.period_number = NEW.fiscal_period
      
      ON CONFLICT (company_id, account_id, fiscal_year, fiscal_period)
      DO UPDATE SET
        period_debit = general_ledger.period_debit + v_line.debit,
        period_credit = general_ledger.period_credit + v_line.credit,
        period_net = general_ledger.period_net + CASE 
          WHEN v_account.normal_balance = 'debit' THEN v_line.debit - v_line.credit
          ELSE v_line.credit - v_line.debit
        END,
        updated_at = NOW();
        
    END LOOP;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_gl_on_post
  AFTER INSERT OR UPDATE ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_general_ledger_on_post();

-- =============================================
-- FUNCTION: Seed Standard Chart of Accounts
-- =============================================
CREATE OR REPLACE FUNCTION seed_standard_chart_of_accounts(p_company_id UUID)
RETURNS VOID AS $$
BEGIN
  -- ASSETS
  INSERT INTO public.chart_of_accounts (company_id, account_code, account_name, account_type, account_category, normal_balance, is_header, level) VALUES
  (p_company_id, '1000', 'ASSETS', 'asset', 'header', 'debit', true, 1),
  (p_company_id, '1100', 'Current Assets', 'asset', 'current_asset', 'debit', true, 2),
  (p_company_id, '1110', 'Cash & Bank', 'asset', 'cash', 'debit', false, 3),
  (p_company_id, '1120', 'Accounts Receivable', 'asset', 'ar', 'debit', false, 3),
  (p_company_id, '1130', 'Inventory', 'asset', 'inventory', 'debit', false, 3),
  (p_company_id, '1200', 'Fixed Assets', 'asset', 'fixed_asset', 'debit', true, 2),
  (p_company_id, '1210', 'Property & Equipment', 'asset', 'fixed_asset', 'debit', false, 3),
  (p_company_id, '1220', 'Accumulated Depreciation', 'asset', 'accumulated_depreciation', 'credit', false, 3),
  
  -- LIABILITIES
  (p_company_id, '2000', 'LIABILITIES', 'liability', 'header', 'credit', true, 1),
  (p_company_id, '2100', 'Current Liabilities', 'liability', 'current_liability', 'credit', true, 2),
  (p_company_id, '2110', 'Accounts Payable', 'liability', 'ap', 'credit', false, 3),
  (p_company_id, '2120', 'Accrued Expenses', 'liability', 'accrued', 'credit', false, 3),
  (p_company_id, '2200', 'Long-term Liabilities', 'liability', 'long_term_liability', 'credit', true, 2),
  (p_company_id, '2210', 'Long-term Debt', 'liability', 'debt', 'credit', false, 3),
  
  -- EQUITY
  (p_company_id, '3000', 'EQUITY', 'equity', 'header', 'credit', true, 1),
  (p_company_id, '3100', 'Owner''s Equity', 'equity', 'capital', 'credit', false, 2),
  (p_company_id, '3200', 'Retained Earnings', 'equity', 'retained_earnings', 'credit', false, 2),
  
  -- REVENUE
  (p_company_id, '4000', 'REVENUE', 'revenue', 'header', 'credit', true, 1),
  (p_company_id, '4100', 'Sales Revenue', 'revenue', 'sales', 'credit', false, 2),
  (p_company_id, '4200', 'Other Income', 'revenue', 'other_income', 'credit', false, 2),
  
  -- EXPENSES
  (p_company_id, '5000', 'COST OF GOODS SOLD', 'expense', 'cogs', 'debit', false, 1),
  (p_company_id, '6000', 'OPERATING EXPENSES', 'expense', 'header', 'debit', true, 1),
  (p_company_id, '6100', 'Salaries & Wages', 'expense', 'payroll', 'debit', false, 2),
  (p_company_id, '6200', 'Rent & Utilities', 'expense', 'overhead', 'debit', false, 2),
  (p_company_id, '6300', 'Marketing & Advertising', 'expense', 'marketing', 'debit', false, 2),
  (p_company_id, '6400', 'Depreciation', 'expense', 'depreciation', 'debit', false, 2);
  
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_accounting_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coa_timestamp
  BEFORE UPDATE ON public.chart_of_accounts
  FOR EACH ROW EXECUTE FUNCTION update_accounting_timestamp();

CREATE TRIGGER update_gl_timestamp
  BEFORE UPDATE ON public.general_ledger
  FOR EACH ROW EXECUTE FUNCTION update_accounting_timestamp();

CREATE TRIGGER update_je_timestamp
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION update_accounting_timestamp();

CREATE TRIGGER update_fiscal_periods_timestamp
  BEFORE UPDATE ON public.fiscal_periods
  FOR EACH ROW EXECUTE FUNCTION update_accounting_timestamp();

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.general_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_statements ENABLE ROW LEVEL SECURITY;

CREATE POLICY coa_isolation ON public.chart_of_accounts
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY gl_isolation ON public.general_ledger
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY je_isolation ON public.journal_entries
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY fiscal_periods_isolation ON public.fiscal_periods
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY fs_isolation ON public.financial_statements
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

-- Comments
COMMENT ON TABLE public.chart_of_accounts IS 'Master chart of accounts with hierarchical structure';
COMMENT ON TABLE public.general_ledger IS 'General ledger with period balances per account';
COMMENT ON TABLE public.journal_entries IS 'Accounting journal entries (header)';
COMMENT ON TABLE public.journal_entry_lines IS 'Journal entry line items (detail)';
COMMENT ON TABLE public.fiscal_periods IS 'Fiscal year periods and closing status';
COMMENT ON TABLE public.financial_statements IS 'Cached financial statements (P&L, Balance Sheet, Cash Flow)';
