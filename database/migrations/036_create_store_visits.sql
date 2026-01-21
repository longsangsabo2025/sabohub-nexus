-- =============================================
-- Migration: Store Visit Management
-- Purpose: Store visit checklists, photo capture, competitor tracking
-- Created: 2026-01-15
-- =============================================

-- =============================================
-- 1. VISIT CHECKLISTS (Template for Store Visits)
-- =============================================
CREATE TABLE IF NOT EXISTS public.visit_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Checklist Info
  checklist_code VARCHAR(50) UNIQUE NOT NULL,
  checklist_name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Applicability
  channel VARCHAR(50), -- 'gt', 'mt', 'horeca', 'all'
  customer_type VARCHAR(50), -- 'retail', 'wholesale', 'distributor', 'all'
  
  -- Checklist Items
  items JSONB NOT NULL DEFAULT '[]'::JSONB,
  /* Example structure:
  [
    {
      "id": "uuid",
      "category": "inventory",
      "question": "Check product availability",
      "type": "boolean|number|text|photo|multi_select",
      "required": true,
      "options": ["option1", "option2"],
      "scoring": {"yes": 10, "no": 0}
    }
  ]
  */
  
  -- Scoring
  max_score INTEGER DEFAULT 100,
  passing_score INTEGER DEFAULT 70,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_visit_checklists_company ON public.visit_checklists(company_id);
CREATE INDEX IF NOT EXISTS idx_visit_checklists_channel ON public.visit_checklists(channel);
CREATE INDEX IF NOT EXISTS idx_visit_checklists_active ON public.visit_checklists(is_active);

-- =============================================
-- 2. STORE VISITS (Actual Visit Records)
-- =============================================
CREATE TABLE IF NOT EXISTS public.store_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Visit Info
  visit_number VARCHAR(50) UNIQUE NOT NULL,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  
  -- Customer & Location
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  store_name VARCHAR(200),
  store_address TEXT,
  
  -- Visited By
  sales_rep_id UUID NOT NULL REFERENCES public.users(id),
  supervisor_id UUID REFERENCES public.users(id),
  
  -- Related Journey
  journey_plan_id UUID REFERENCES public.journey_plans(id),
  checkin_id UUID REFERENCES public.journey_checkins(id),
  
  -- Visit Type & Purpose
  visit_type VARCHAR(50) DEFAULT 'routine', -- 'routine', 'survey', 'merchandising', 'complaint', 'collection'
  visit_purpose TEXT,
  
  -- Checklist
  checklist_id UUID REFERENCES public.visit_checklists(id),
  checklist_responses JSONB DEFAULT '{}'::JSONB,
  checklist_score INTEGER,
  checklist_max_score INTEGER,
  checklist_passed BOOLEAN,
  
  -- Visit Duration
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  
  -- Photos
  photos JSONB DEFAULT '[]'::JSONB, -- Array of {category, url, caption, timestamp}
  
  -- Observations
  observations TEXT,
  issues TEXT,
  recommendations TEXT,
  
  -- Follow-up
  requires_followup BOOLEAN DEFAULT false,
  followup_date DATE,
  followup_notes TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'completed', -- 'in_progress', 'completed', 'cancelled'
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_store_visits_company ON public.store_visits(company_id);
CREATE INDEX IF NOT EXISTS idx_store_visits_customer ON public.store_visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_visits_date ON public.store_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_store_visits_sales_rep ON public.store_visits(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_store_visits_status ON public.store_visits(status);
CREATE INDEX IF NOT EXISTS idx_store_visits_journey ON public.store_visits(journey_plan_id);

-- =============================================
-- 3. STORE INVENTORY CHECKS (Shelf Stock Tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS public.store_inventory_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_visit_id UUID NOT NULL REFERENCES public.store_visits(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  
  -- Stock Levels
  shelf_stock INTEGER DEFAULT 0,
  back_stock INTEGER DEFAULT 0,
  total_stock INTEGER GENERATED ALWAYS AS (shelf_stock + back_stock) STORED,
  
  -- Stock Status
  is_out_of_stock BOOLEAN DEFAULT false,
  is_low_stock BOOLEAN DEFAULT false,
  is_expired BOOLEAN DEFAULT false,
  expiry_date DATE,
  
  -- Shelf Visibility
  has_shelf_space BOOLEAN DEFAULT true,
  shelf_position VARCHAR(50), -- 'eye_level', 'top_shelf', 'bottom_shelf', 'end_cap'
  shelf_share INTEGER, -- Number of facings
  
  -- Pricing
  current_price DECIMAL(15,2),
  competitor_price DECIMAL(15,2),
  price_difference DECIMAL(15,2),
  on_promotion BOOLEAN DEFAULT false,
  promotion_details TEXT,
  
  -- Photos
  photo_url TEXT,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_store_inventory_checks_visit ON public.store_inventory_checks(store_visit_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_checks_product ON public.store_inventory_checks(product_id);
CREATE INDEX IF NOT EXISTS idx_store_inventory_checks_oos ON public.store_inventory_checks(store_visit_id) 
  WHERE is_out_of_stock = true;

-- =============================================
-- 4. COMPETITOR TRACKING
-- =============================================
CREATE TABLE IF NOT EXISTS public.competitor_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_visit_id UUID NOT NULL REFERENCES public.store_visits(id) ON DELETE CASCADE,
  
  -- Competitor Info
  competitor_name VARCHAR(200) NOT NULL,
  competitor_brand VARCHAR(200),
  competitor_product VARCHAR(200),
  
  -- Product Details
  product_category VARCHAR(100),
  product_description TEXT,
  package_size VARCHAR(100),
  
  -- Pricing
  price DECIMAL(15,2),
  currency VARCHAR(3) DEFAULT 'VND',
  
  -- Shelf Presence
  shelf_position VARCHAR(50),
  shelf_share INTEGER, -- Number of facings
  display_type VARCHAR(50), -- 'shelf', 'end_cap', 'free_standing', 'counter'
  
  -- Promotion
  has_promotion BOOLEAN DEFAULT false,
  promotion_type VARCHAR(100),
  promotion_details TEXT,
  
  -- Stock
  stock_level VARCHAR(50), -- 'high', 'medium', 'low', 'out_of_stock'
  
  -- Photos
  photos JSONB DEFAULT '[]'::JSONB,
  
  -- Analysis
  threat_level VARCHAR(50), -- 'high', 'medium', 'low'
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_competitor_tracking_company ON public.competitor_tracking(company_id);
CREATE INDEX IF NOT EXISTS idx_competitor_tracking_visit ON public.competitor_tracking(store_visit_id);
CREATE INDEX IF NOT EXISTS idx_competitor_tracking_competitor ON public.competitor_tracking(competitor_name);
CREATE INDEX IF NOT EXISTS idx_competitor_tracking_threat ON public.competitor_tracking(threat_level);

-- =============================================
-- 5. POS MATERIALS (Point of Sale Materials Tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS public.pos_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Material Info
  material_code VARCHAR(50) UNIQUE NOT NULL,
  material_name VARCHAR(200) NOT NULL,
  material_type VARCHAR(50) NOT NULL, -- 'poster', 'wobbler', 'shelf_talker', 'standee', 'banner', 'cooler'
  description TEXT,
  
  -- Specifications
  size VARCHAR(50),
  quantity_in_stock INTEGER DEFAULT 0,
  cost_per_unit DECIMAL(15,2),
  
  -- Photo
  photo_url TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pos_materials_company ON public.pos_materials(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_materials_type ON public.pos_materials(material_type);
CREATE INDEX IF NOT EXISTS idx_pos_materials_active ON public.pos_materials(is_active);

-- =============================================
-- 6. POS MATERIAL DEPLOYMENTS
-- =============================================
CREATE TABLE IF NOT EXISTS public.pos_material_deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  store_visit_id UUID NOT NULL REFERENCES public.store_visits(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.pos_materials(id),
  
  -- Deployment Info
  quantity_deployed INTEGER NOT NULL,
  placement_location VARCHAR(100), -- 'window', 'entrance', 'shelf', 'counter', 'cooler'
  
  -- Condition
  condition VARCHAR(50) DEFAULT 'new', -- 'new', 'good', 'damaged', 'missing'
  
  -- Photos
  before_photo_url TEXT,
  after_photo_url TEXT,
  
  -- Tracking
  deployed_by UUID REFERENCES public.users(id),
  deployed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Follow-up
  next_check_date DATE,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_pos_deployments_company ON public.pos_material_deployments(company_id);
CREATE INDEX IF NOT EXISTS idx_pos_deployments_visit ON public.pos_material_deployments(store_visit_id);
CREATE INDEX IF NOT EXISTS idx_pos_deployments_material ON public.pos_material_deployments(material_id);

-- =============================================
-- FUNCTIONS FOR AUTO-NUMBERING
-- =============================================
CREATE OR REPLACE FUNCTION generate_visit_number(p_company_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR := 'SV';
  v_date VARCHAR := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  v_sequence INTEGER;
  v_number VARCHAR;
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(SUBSTRING(visit_number FROM LENGTH(v_prefix) + 9), '') AS INTEGER)
  ), 0) + 1 INTO v_sequence
  FROM public.store_visits
  WHERE company_id = p_company_id
    AND visit_number LIKE v_prefix || v_date || '%';
  
  v_number := v_prefix || v_date || LPAD(v_sequence::TEXT, 4, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_store_visit_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_visit_checklists_timestamp
  BEFORE UPDATE ON public.visit_checklists
  FOR EACH ROW EXECUTE FUNCTION update_store_visit_timestamp();

CREATE TRIGGER update_store_visits_timestamp
  BEFORE UPDATE ON public.store_visits
  FOR EACH ROW EXECUTE FUNCTION update_store_visit_timestamp();

CREATE TRIGGER update_competitor_tracking_timestamp
  BEFORE UPDATE ON public.competitor_tracking
  FOR EACH ROW EXECUTE FUNCTION update_store_visit_timestamp();

CREATE TRIGGER update_pos_materials_timestamp
  BEFORE UPDATE ON public.pos_materials
  FOR EACH ROW EXECUTE FUNCTION update_store_visit_timestamp();

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.visit_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_inventory_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pos_material_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY visit_checklists_isolation ON public.visit_checklists
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY store_visits_isolation ON public.store_visits
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY competitor_tracking_isolation ON public.competitor_tracking
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY pos_materials_isolation ON public.pos_materials
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY pos_deployments_isolation ON public.pos_material_deployments
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

-- Comments
COMMENT ON TABLE public.visit_checklists IS 'Checklist templates for store visits';
COMMENT ON TABLE public.store_visits IS 'Store visit records with observations and photos';
COMMENT ON TABLE public.store_inventory_checks IS 'Shelf stock tracking during visits';
COMMENT ON TABLE public.competitor_tracking IS 'Competitor product and pricing tracking';
COMMENT ON TABLE public.pos_materials IS 'Point of sale materials inventory';
COMMENT ON TABLE public.pos_material_deployments IS 'POS material deployment tracking';
