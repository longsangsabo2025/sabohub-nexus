
CREATE OR REPLACE FUNCTION get_daily_reports(
  p_date DATE,
  p_employee_id UUID,
  p_company_id UUID,
  p_branch_id UUID,
  p_role TEXT
)
RETURNS TABLE (
  id UUID,
  employee_id UUID,
  company_id UUID,
  branch_id UUID,
  report_date DATE,
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  total_hours NUMERIC,
  tasks_summary TEXT,
  achievements TEXT,
  challenges TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  employee_name TEXT,
  employee_role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.employee_id,
    r.company_id,
    r.branch_id,
    r.report_date,
    r.check_in_time,
    r.check_out_time,
    r.total_hours,
    r.tasks_summary,
    r.achievements,
    r.challenges,
    r.notes,
    r.created_at,
    r.updated_at,
    e.full_name as employee_name,
    e.role as employee_role
  FROM daily_work_reports r
  JOIN employees e ON r.employee_id = e.id
  WHERE r.report_date = p_date
  AND (
    -- CEO sees all in company
    (p_role ILIKE 'CEO' AND r.company_id = p_company_id)
    OR
    -- Manager sees branch + own
    (p_role ILIKE 'MANAGER' AND (r.branch_id = p_branch_id OR r.employee_id = p_employee_id))
    OR
    -- Staff sees own
    (r.employee_id = p_employee_id)
  )
  ORDER BY r.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_daily_reports TO anon, authenticated, service_role;
