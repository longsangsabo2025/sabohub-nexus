-- =============================================
-- Migration: Sales Route Management
-- Purpose: Route planning, journey tracking, visit management
-- Created: 2026-01-15
-- =============================================

-- =============================================
-- 1. SALES ROUTES (Route Master Data)
-- =============================================
CREATE TABLE IF NOT EXISTS public.sales_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Route Info
  route_code VARCHAR(50) UNIQUE NOT NULL,
  route_name VARCHAR(200) NOT NULL,
  description TEXT,
  
  -- Assignment
  assigned_to UUID REFERENCES public.users(id),
  backup_rep UUID REFERENCES public.users(id),
  
  -- Territory
  region VARCHAR(100),
  territory VARCHAR(100),
  channel VARCHAR(50), -- 'gt', 'mt', 'horeca'
  
  -- Schedule
  frequency VARCHAR(50) DEFAULT 'weekly', -- 'daily', 'weekly', 'biweekly', 'monthly'
  visit_days JSONB DEFAULT '[]'::JSONB, -- ['monday', 'wednesday', 'friday']
  
  -- Route Metrics
  total_customers INTEGER DEFAULT 0,
  active_customers INTEGER DEFAULT 0,
  estimated_duration_minutes INTEGER,
  total_distance_km DECIMAL(10,2),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_routes_company ON public.sales_routes(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_routes_assigned ON public.sales_routes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_sales_routes_channel ON public.sales_routes(channel);
CREATE INDEX IF NOT EXISTS idx_sales_routes_active ON public.sales_routes(is_active);

-- =============================================
-- 2. ROUTE CUSTOMERS (Customers on Routes)
-- =============================================
CREATE TABLE IF NOT EXISTS public.route_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id UUID NOT NULL REFERENCES public.sales_routes(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  
  -- Visit Schedule
  visit_sequence INTEGER NOT NULL, -- Order of visit on route
  preferred_visit_time TIME,
  estimated_duration_minutes INTEGER DEFAULT 30,
  
  -- Visit Frequency
  visit_frequency VARCHAR(50) DEFAULT 'every_visit', -- 'every_visit', 'weekly', 'biweekly', 'monthly'
  visit_days JSONB, -- Override route visit days if needed
  
  -- Location
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  address TEXT,
  
  -- Visit Requirements
  must_take_order BOOLEAN DEFAULT false,
  must_take_photo BOOLEAN DEFAULT false,
  must_check_inventory BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT route_customers_unique UNIQUE(route_id, customer_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_route_customers_route ON public.route_customers(route_id);
CREATE INDEX IF NOT EXISTS idx_route_customers_customer ON public.route_customers(customer_id);
CREATE INDEX IF NOT EXISTS idx_route_customers_sequence ON public.route_customers(route_id, visit_sequence);

-- =============================================
-- 3. JOURNEY PLANS (Scheduled Route Execution)
-- =============================================
CREATE TABLE IF NOT EXISTS public.journey_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.sales_routes(id) ON DELETE CASCADE,
  
  -- Plan Info
  plan_number VARCHAR(50) UNIQUE NOT NULL,
  plan_date DATE NOT NULL,
  
  -- Assignment
  sales_rep_id UUID NOT NULL REFERENCES public.users(id),
  supervisor_id UUID REFERENCES public.users(id),
  
  -- Schedule
  planned_start_time TIMESTAMPTZ NOT NULL,
  planned_end_time TIMESTAMPTZ NOT NULL,
  
  -- Actual Execution
  actual_start_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  
  -- Customers
  planned_customers JSONB NOT NULL DEFAULT '[]'::JSONB,
  total_planned_visits INTEGER DEFAULT 0,
  completed_visits INTEGER DEFAULT 0,
  
  -- Metrics
  planned_distance_km DECIMAL(10,2),
  actual_distance_km DECIMAL(10,2),
  
  -- Status
  status VARCHAR(50) DEFAULT 'planned', -- 'planned', 'in_progress', 'completed', 'cancelled'
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_journey_plans_company ON public.journey_plans(company_id);
CREATE INDEX IF NOT EXISTS idx_journey_plans_route ON public.journey_plans(route_id);
CREATE INDEX IF NOT EXISTS idx_journey_plans_date ON public.journey_plans(plan_date);
CREATE INDEX IF NOT EXISTS idx_journey_plans_sales_rep ON public.journey_plans(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_journey_plans_status ON public.journey_plans(status);

-- =============================================
-- 4. JOURNEY CHECKINS (Real-time Visit Tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS public.journey_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  journey_plan_id UUID NOT NULL REFERENCES public.journey_plans(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  
  -- Check-in Info
  checkin_number VARCHAR(50) UNIQUE NOT NULL,
  visit_sequence INTEGER,
  
  -- Location (Check-in)
  checkin_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checkin_latitude DECIMAL(10,8) NOT NULL,
  checkin_longitude DECIMAL(11,8) NOT NULL,
  checkin_address TEXT,
  checkin_photo_url TEXT,
  
  -- Location (Check-out)
  checkout_time TIMESTAMPTZ,
  checkout_latitude DECIMAL(10,8),
  checkout_longitude DECIMAL(11,8),
  checkout_address TEXT,
  checkout_photo_url TEXT,
  
  -- Visit Details
  visit_duration_minutes INTEGER,
  distance_from_customer_m DECIMAL(10,2), -- Distance from actual customer location
  
  -- Visit Activities
  activities_completed JSONB DEFAULT '[]'::JSONB, -- ['took_order', 'checked_inventory', 'took_photo']
  
  -- Visit Type
  visit_type VARCHAR(50) DEFAULT 'scheduled', -- 'scheduled', 'unscheduled', 'emergency'
  visit_purpose VARCHAR(100),
  
  -- Status
  status VARCHAR(50) DEFAULT 'checked_in', -- 'checked_in', 'checked_out', 'cancelled'
  
  -- Notes & Issues
  notes TEXT,
  issues TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_journey_checkins_company ON public.journey_checkins(company_id);
CREATE INDEX IF NOT EXISTS idx_journey_checkins_journey ON public.journey_checkins(journey_plan_id);
CREATE INDEX IF NOT EXISTS idx_journey_checkins_customer ON public.journey_checkins(customer_id);
CREATE INDEX IF NOT EXISTS idx_journey_checkins_time ON public.journey_checkins(checkin_time);
CREATE INDEX IF NOT EXISTS idx_journey_checkins_status ON public.journey_checkins(status);

-- =============================================
-- 5. ROUTE OPTIMIZATION LOGS
-- =============================================
CREATE TABLE IF NOT EXISTS public.route_optimization_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  route_id UUID REFERENCES public.sales_routes(id) ON DELETE CASCADE,
  
  -- Optimization Info
  optimization_date DATE NOT NULL DEFAULT CURRENT_DATE,
  algorithm VARCHAR(50), -- 'google_maps', 'manual', 'genetic_algorithm'
  
  -- Before Optimization
  original_sequence JSONB,
  original_distance_km DECIMAL(10,2),
  original_duration_minutes INTEGER,
  
  -- After Optimization
  optimized_sequence JSONB,
  optimized_distance_km DECIMAL(10,2),
  optimized_duration_minutes INTEGER,
  
  -- Improvements
  distance_saved_km DECIMAL(10,2),
  time_saved_minutes INTEGER,
  improvement_percent DECIMAL(5,2),
  
  -- Status
  is_applied BOOLEAN DEFAULT false,
  applied_by UUID REFERENCES public.users(id),
  applied_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_route_optimization_company ON public.route_optimization_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_route_optimization_route ON public.route_optimization_logs(route_id);
CREATE INDEX IF NOT EXISTS idx_route_optimization_date ON public.route_optimization_logs(optimization_date);

-- =============================================
-- 6. SALES REP LOCATIONS (Real-time GPS Tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS public.sales_rep_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sales_rep_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  journey_plan_id UUID REFERENCES public.journey_plans(id),
  
  -- Location
  latitude DECIMAL(10,8) NOT NULL,
  longitude DECIMAL(11,8) NOT NULL,
  accuracy_meters DECIMAL(10,2),
  altitude_meters DECIMAL(10,2),
  
  -- Speed & Heading
  speed_kmh DECIMAL(10,2),
  heading_degrees DECIMAL(5,2),
  
  -- Activity
  activity_type VARCHAR(50), -- 'moving', 'stationary', 'in_vehicle'
  
  -- Battery & Network
  battery_level INTEGER,
  network_type VARCHAR(50),
  
  -- Timestamp
  recorded_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sales_rep_locations_rep ON public.sales_rep_locations(sales_rep_id);
CREATE INDEX IF NOT EXISTS idx_sales_rep_locations_journey ON public.sales_rep_locations(journey_plan_id);
CREATE INDEX IF NOT EXISTS idx_sales_rep_locations_time ON public.sales_rep_locations(recorded_at);

-- Partition by month for performance
CREATE TABLE IF NOT EXISTS public.sales_rep_locations_2026_01 PARTITION OF public.sales_rep_locations
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- =============================================
-- FUNCTIONS FOR AUTO-NUMBERING
-- =============================================
CREATE OR REPLACE FUNCTION generate_journey_plan_number(p_company_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR := 'JP';
  v_date VARCHAR := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  v_sequence INTEGER;
  v_number VARCHAR;
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(SUBSTRING(plan_number FROM LENGTH(v_prefix) + 9), '') AS INTEGER)
  ), 0) + 1 INTO v_sequence
  FROM public.journey_plans
  WHERE company_id = p_company_id
    AND plan_number LIKE v_prefix || v_date || '%';
  
  v_number := v_prefix || v_date || LPAD(v_sequence::TEXT, 3, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_checkin_number(p_company_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_prefix VARCHAR := 'CK';
  v_date VARCHAR := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
  v_sequence INTEGER;
  v_number VARCHAR;
BEGIN
  SELECT COALESCE(MAX(
    CAST(NULLIF(SUBSTRING(checkin_number FROM LENGTH(v_prefix) + 9), '') AS INTEGER)
  ), 0) + 1 INTO v_sequence
  FROM public.journey_checkins
  WHERE company_id = p_company_id
    AND checkin_number LIKE v_prefix || v_date || '%';
  
  v_number := v_prefix || v_date || LPAD(v_sequence::TEXT, 4, '0');
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE OR REPLACE FUNCTION update_sales_route_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sales_routes_timestamp
  BEFORE UPDATE ON public.sales_routes
  FOR EACH ROW EXECUTE FUNCTION update_sales_route_timestamp();

CREATE TRIGGER update_route_customers_timestamp
  BEFORE UPDATE ON public.route_customers
  FOR EACH ROW EXECUTE FUNCTION update_sales_route_timestamp();

CREATE TRIGGER update_journey_plans_timestamp
  BEFORE UPDATE ON public.journey_plans
  FOR EACH ROW EXECUTE FUNCTION update_sales_route_timestamp();

CREATE TRIGGER update_journey_checkins_timestamp
  BEFORE UPDATE ON public.journey_checkins
  FOR EACH ROW EXECUTE FUNCTION update_sales_route_timestamp();

-- =============================================
-- RLS POLICIES
-- =============================================
ALTER TABLE public.sales_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_optimization_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_rep_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY sales_routes_isolation ON public.sales_routes
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY journey_plans_isolation ON public.journey_plans
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY journey_checkins_isolation ON public.journey_checkins
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY route_optimization_logs_isolation ON public.route_optimization_logs
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

CREATE POLICY sales_rep_locations_isolation ON public.sales_rep_locations
  FOR ALL USING (company_id = current_setting('app.current_company_id', TRUE)::UUID);

-- Comments
COMMENT ON TABLE public.sales_routes IS 'Sales route master data with assigned territories';
COMMENT ON TABLE public.route_customers IS 'Customers assigned to specific sales routes';
COMMENT ON TABLE public.journey_plans IS 'Scheduled route executions with planning details';
COMMENT ON TABLE public.journey_checkins IS 'Real-time visit tracking with GPS check-in/out';
COMMENT ON TABLE public.route_optimization_logs IS 'Route optimization history and improvements';
COMMENT ON TABLE public.sales_rep_locations IS 'Real-time GPS tracking of sales representatives';
