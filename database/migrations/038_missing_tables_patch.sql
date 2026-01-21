-- =============================================
-- Missing Tables Patch
-- Creates 4 tables that were missed in initial migrations
-- =============================================

-- 1. Visit Checklist Items (normalized from JSONB)
CREATE TABLE IF NOT EXISTS public.visit_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  checklist_id UUID NOT NULL REFERENCES public.visit_checklists(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Item Info
  item_order INTEGER NOT NULL DEFAULT 0,
  category VARCHAR(100),
  question TEXT NOT NULL,
  item_type VARCHAR(50) NOT NULL, -- 'boolean', 'number', 'text', 'photo', 'multi_select'
  
  -- Options & Validation
  options JSONB DEFAULT '[]'::JSONB,
  scoring JSONB DEFAULT '{}'::JSONB,
  
  -- Status
  is_required BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_checklist_items_checklist ON public.visit_checklist_items(checklist_id);
CREATE INDEX IF NOT EXISTS idx_visit_checklist_items_company ON public.visit_checklist_items(company_id);

-- 2. Store Visit Checklist Responses (normalized from JSONB)
CREATE TABLE IF NOT EXISTS public.store_visit_checklist_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES public.store_visits(id) ON DELETE CASCADE,
  checklist_item_id UUID REFERENCES public.visit_checklist_items(id),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Response
  question TEXT NOT NULL,
  response_type VARCHAR(50),
  response_value TEXT,
  response_data JSONB, -- For complex responses
  
  -- Scoring
  score INTEGER DEFAULT 0,
  max_score INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_responses_visit ON public.store_visit_checklist_responses(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_responses_item ON public.store_visit_checklist_responses(checklist_item_id);
CREATE INDEX IF NOT EXISTS idx_visit_responses_company ON public.store_visit_checklist_responses(company_id);

-- 3. Store Visit Photos (normalized from JSONB)
CREATE TABLE IF NOT EXISTS public.store_visit_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES public.store_visits(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Photo Info
  category VARCHAR(100), -- 'storefront', 'display', 'competitor', 'issue', 'other'
  photo_url TEXT NOT NULL,
  thumbnail_url TEXT,
  
  -- Details
  caption TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  
  -- Metadata
  taken_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  uploaded_by UUID REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_visit_photos_visit ON public.store_visit_photos(visit_id);
CREATE INDEX IF NOT EXISTS idx_visit_photos_category ON public.store_visit_photos(category);
CREATE INDEX IF NOT EXISTS idx_visit_photos_company ON public.store_visit_photos(company_id);

-- 4. Financial Statement Lines (normalized detail lines)
CREATE TABLE IF NOT EXISTS public.financial_statement_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  statement_id UUID NOT NULL REFERENCES public.financial_statements(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Account Reference
  account_id UUID REFERENCES public.chart_of_accounts(id),
  account_code VARCHAR(50),
  account_name VARCHAR(200) NOT NULL,
  
  -- Line Info
  line_order INTEGER NOT NULL DEFAULT 0,
  level INTEGER DEFAULT 0, -- Indentation level
  is_total BOOLEAN DEFAULT false,
  is_subtotal BOOLEAN DEFAULT false,
  
  -- Amounts
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  balance DECIMAL(15,2) DEFAULT 0,
  
  -- Formatting
  bold BOOLEAN DEFAULT false,
  indent_level INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fs_lines_statement ON public.financial_statement_lines(statement_id);
CREATE INDEX IF NOT EXISTS idx_fs_lines_account ON public.financial_statement_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_fs_lines_company ON public.financial_statement_lines(company_id);
CREATE INDEX IF NOT EXISTS idx_fs_lines_order ON public.financial_statement_lines(statement_id, line_order);

-- Enable RLS
ALTER TABLE public.visit_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_visit_checklist_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_visit_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_statement_lines ENABLE ROW LEVEL SECURITY;

-- RLS Policies (company isolation)
CREATE POLICY visit_checklist_items_isolation ON public.visit_checklist_items
  FOR ALL USING (company_id = (auth.jwt() ->> 'company_id')::UUID);

CREATE POLICY visit_responses_isolation ON public.store_visit_checklist_responses
  FOR ALL USING (company_id = (auth.jwt() ->> 'company_id')::UUID);

CREATE POLICY visit_photos_isolation ON public.store_visit_photos
  FOR ALL USING (company_id = (auth.jwt() ->> 'company_id')::UUID);

CREATE POLICY fs_lines_isolation ON public.financial_statement_lines
  FOR ALL USING (company_id = (auth.jwt() ->> 'company_id')::UUID);

-- Comments
COMMENT ON TABLE public.visit_checklist_items IS 'Normalized checklist items (from JSONB in visit_checklists)';
COMMENT ON TABLE public.store_visit_checklist_responses IS 'Visit responses to checklist items';
COMMENT ON TABLE public.store_visit_photos IS 'Photos captured during store visits';
COMMENT ON TABLE public.financial_statement_lines IS 'Detail lines for financial statements (P&L, Balance Sheet)';
