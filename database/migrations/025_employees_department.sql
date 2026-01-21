-- =====================================================
-- Migration: 025_employees_department.sql
-- Description: Add department and permissions to employees
-- Reusable: Yes (flexible department-based access control)
-- =====================================================

-- =====================================================
-- Add department column to employees
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'department'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN department VARCHAR(50);
  END IF;
END $$;

-- =====================================================
-- Add permissions JSONB column to employees
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'permissions'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN permissions JSONB DEFAULT '{}';
  END IF;
END $$;

-- =====================================================
-- Add job_title column to employees (if not exists)
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'job_title'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN job_title VARCHAR(100);
  END IF;
END $$;

-- =====================================================
-- Add department constraint
-- =====================================================
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'employees_department_check'
  ) THEN
    ALTER TABLE public.employees 
    ADD CONSTRAINT employees_department_check 
    CHECK (department IS NULL OR department IN (
      'sales',           -- Bán hàng: Sale, Sale Admin
      'warehouse',       -- Kho: Warehouse staff
      'delivery',        -- Giao hàng: Driver, Helper
      'customer_service',-- CSKH
      'finance',         -- Kế toán, thu hồi công nợ
      'production',      -- Sản xuất (future)
      'hr',              -- Nhân sự
      'admin',           -- Admin
      'management',      -- Quản lý: RSM, ASM, Supervisor
      'other'
    ));
  END IF;
END $$;

-- =====================================================
-- Create index on department
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees(department);

-- =====================================================
-- TABLE: departments (reference table)
-- Purpose: Define available departments per company
-- =====================================================
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  code VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Default permissions for employees in this department
  default_permissions JSONB DEFAULT '{}',
  
  -- Parent department for hierarchy
  parent_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(company_id, code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_departments_company ON public.departments(company_id);

-- RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_select_company" ON public.departments;
CREATE POLICY "departments_select_company" ON public.departments
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "departments_all_managers" ON public.departments;
CREATE POLICY "departments_all_managers" ON public.departments
  FOR ALL USING (
    company_id IN (
      SELECT company_id FROM public.users 
      WHERE id = auth.uid() AND role IN ('ceo', 'manager')
      UNION
      SELECT id FROM public.companies WHERE owner_id = auth.uid()
    )
  );

-- =====================================================
-- FUNCTIONS: Permission helpers
-- =====================================================

-- Check if employee has a specific permission
CREATE OR REPLACE FUNCTION public.has_permission(
  p_employee_id UUID,
  p_permission VARCHAR(100)
) RETURNS BOOLEAN AS $$
DECLARE
  v_permissions JSONB;
  v_role VARCHAR(50);
BEGIN
  SELECT permissions, role INTO v_permissions, v_role
  FROM public.employees WHERE id = p_employee_id;
  
  -- CEO has all permissions
  IF v_role = 'ceo' THEN
    RETURN TRUE;
  END IF;
  
  -- Check explicit permission
  IF v_permissions ? p_permission AND (v_permissions->>p_permission)::BOOLEAN = TRUE THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE;

-- Get employee's effective permissions (role + explicit)
CREATE OR REPLACE FUNCTION public.get_effective_permissions(p_employee_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_role VARCHAR(50);
  v_department VARCHAR(50);
  v_explicit_permissions JSONB;
  v_role_permissions JSONB;
BEGIN
  SELECT role, department, COALESCE(permissions, '{}')
  INTO v_role, v_department, v_explicit_permissions
  FROM public.employees WHERE id = p_employee_id;
  
  -- Base permissions by role
  v_role_permissions := CASE v_role
    WHEN 'ceo' THEN '{"all": true}'::JSONB
    WHEN 'manager' THEN '{
      "view_reports": true,
      "manage_employees": true,
      "approve_orders": true,
      "view_financials": true
    }'::JSONB
    WHEN 'shift_leader' THEN '{
      "view_team_reports": true,
      "manage_team": true
    }'::JSONB
    ELSE '{}'::JSONB
  END;
  
  -- Merge with explicit permissions (explicit takes precedence)
  RETURN v_role_permissions || v_explicit_permissions;
END;
$$ LANGUAGE plpgsql STABLE;

-- =====================================================
-- Default permission templates by department
-- =====================================================
COMMENT ON COLUMN public.employees.permissions IS 'JSONB permissions object. Examples:
{
  "can_create_orders": true,
  "can_approve_orders": true,
  "can_view_all_customers": true,
  "can_collect_payments": true,
  "can_view_reports": true,
  "can_manage_inventory": true,
  "can_manage_deliveries": true,
  "max_discount_percent": 10,
  "max_credit_limit": 50000000
}';

COMMENT ON COLUMN public.employees.department IS 'Department codes: sales, warehouse, delivery, customer_service, finance, production, hr, admin, management, other';

-- =====================================================
-- MIGRATION: Update existing data (optional)
-- =====================================================

-- Set department based on existing role (one-time migration)
-- Uncomment and run manually if needed:
/*
UPDATE public.employees
SET department = CASE role
  WHEN 'ceo' THEN 'management'
  WHEN 'manager' THEN 'management'
  WHEN 'shift_leader' THEN 'management'
  ELSE 'sales'  -- default for staff
END
WHERE department IS NULL;
*/

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE public.departments IS 'Department definitions per company with default permissions';
COMMENT ON FUNCTION public.has_permission IS 'Check if employee has specific permission';
COMMENT ON FUNCTION public.get_effective_permissions IS 'Get combined role + explicit permissions for employee';
