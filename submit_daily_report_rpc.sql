-- Function to submit daily report bypassing RLS (for Staff with custom auth)
CREATE OR REPLACE FUNCTION submit_daily_report(
  p_employee_id UUID,
  p_company_id UUID,
  p_branch_id UUID,
  p_report_date DATE,
  p_check_in_time TIMESTAMPTZ,
  p_check_out_time TIMESTAMPTZ,
  p_total_hours NUMERIC,
  p_tasks_summary TEXT,
  p_achievements TEXT,
  p_challenges TEXT,
  p_notes TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO daily_work_reports (
    employee_id,
    company_id,
    branch_id,
    report_date,
    check_in_time,
    check_out_time,
    total_hours,
    tasks_summary,
    achievements,
    challenges,
    notes
  ) VALUES (
    p_employee_id,
    p_company_id,
    p_branch_id,
    p_report_date,
    p_check_in_time,
    p_check_out_time,
    p_total_hours,
    p_tasks_summary,
    p_achievements,
    p_challenges,
    p_notes
  );
  
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION submit_daily_report TO anon, authenticated, service_role;
