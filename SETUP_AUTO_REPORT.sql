-- Create table for storing consolidated daily reports
CREATE TABLE IF NOT EXISTS executive_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_date DATE NOT NULL UNIQUE,
    
    -- Financial Metrics
    total_revenue DECIMAL(15, 2) DEFAULT 0,
    total_expenses DECIMAL(15, 2) DEFAULT 0,
    net_profit DECIMAL(15, 2) DEFAULT 0,
    
    -- Operational Metrics
    total_tasks_completed INTEGER DEFAULT 0,
    total_tasks_overdue INTEGER DEFAULT 0,
    active_projects INTEGER DEFAULT 0,
    
    -- HR Metrics
    staff_present INTEGER DEFAULT 0,
    staff_late INTEGER DEFAULT 0,
    staff_on_leave INTEGER DEFAULT 0,
    
    -- Meta
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE executive_reports ENABLE ROW LEVEL SECURITY;

-- Policy: CEO can view all reports
DROP POLICY IF EXISTS "CEO can view executive reports" ON executive_reports;
CREATE POLICY "CEO can view executive reports" ON executive_reports
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM employees 
            WHERE employees.id = auth.uid() 
            AND employees.role = 'ceo'
        )
    );

-- Function to generate the report for a specific date
CREATE OR REPLACE FUNCTION generate_daily_executive_report(target_date DATE)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_report_id UUID;
    v_revenue DECIMAL(15, 2);
    v_expenses DECIMAL(15, 2);
    v_tasks_completed INTEGER;
    v_tasks_overdue INTEGER;
    v_active_projects INTEGER;
    v_staff_present INTEGER;
    v_staff_late INTEGER;
    v_staff_on_leave INTEGER;
BEGIN
    -- 1. Calculate Financials (Assuming financial_transactions table exists)
    -- Revenue: type = 'income'
    SELECT COALESCE(SUM(amount), 0) INTO v_revenue
    FROM financial_transactions
    WHERE date(transaction_date) = target_date AND type = 'income';

    -- Expenses: type = 'expense'
    SELECT COALESCE(SUM(amount), 0) INTO v_expenses
    FROM financial_transactions
    WHERE date(transaction_date) = target_date AND type = 'expense';

    -- 2. Calculate Tasks
    -- Completed on target_date
    SELECT COUNT(*) INTO v_tasks_completed
    FROM tasks
    WHERE date(updated_at) = target_date AND status = 'completed';

    -- Overdue as of target_date
    SELECT COUNT(*) INTO v_tasks_overdue
    FROM tasks
    WHERE due_date < target_date AND status != 'completed';

    -- Active Projects (Placeholder as projects table might not exist yet)
    v_active_projects := 0;

    -- 3. Calculate HR (from daily_work_reports or attendance)
    -- Present: Count of daily_work_reports for that date
    SELECT COUNT(*) INTO v_staff_present
    FROM daily_work_reports
    WHERE report_date = target_date;

    -- Late: Check in time > 9:00 AM (Example rule, adjust as needed)
    SELECT COUNT(*) INTO v_staff_late
    FROM daily_work_reports
    WHERE report_date = target_date 
    AND check_in_time::time > '09:00:00';

    -- On Leave: From approval_requests
    SELECT COUNT(*) INTO v_staff_on_leave
    FROM approval_requests
    WHERE type = 'time_off' 
    AND status = 'approved'
    AND target_date BETWEEN date((details->>'start_date')::text) AND date((details->>'end_date')::text);

    -- 4. Insert or Update Report
    INSERT INTO executive_reports (
        report_date,
        total_revenue,
        total_expenses,
        net_profit,
        total_tasks_completed,
        total_tasks_overdue,
        active_projects,
        staff_present,
        staff_late,
        staff_on_leave
    ) VALUES (
        target_date,
        v_revenue,
        v_expenses,
        v_revenue - v_expenses,
        v_tasks_completed,
        v_tasks_overdue,
        v_active_projects,
        v_staff_present,
        v_staff_late,
        v_staff_on_leave
    )
    ON CONFLICT (report_date) DO UPDATE SET
        total_revenue = EXCLUDED.total_revenue,
        total_expenses = EXCLUDED.total_expenses,
        net_profit = EXCLUDED.net_profit,
        total_tasks_completed = EXCLUDED.total_tasks_completed,
        total_tasks_overdue = EXCLUDED.total_tasks_overdue,
        active_projects = EXCLUDED.active_projects,
        staff_present = EXCLUDED.staff_present,
        staff_late = EXCLUDED.staff_late,
        staff_on_leave = EXCLUDED.staff_on_leave,
        updated_at = NOW()
    RETURNING id INTO new_report_id;

    -- 5. Create Notification for CEO and Managers (Only if they are valid Users)
    INSERT INTO notifications (user_id, title, message, type, is_read)
    SELECT 
        e.id,
        'Báo cáo tổng hợp ngày ' || to_char(target_date, 'DD/MM/YYYY'),
        'Báo cáo hoạt động doanh nghiệp đã sẵn sàng. Doanh thu: ' || to_char(v_revenue, 'FM999,999,999,999') || ' VNĐ',
        'system',
        false
    FROM employees e
    JOIN users u ON u.id = e.id
    WHERE e.role IN ('ceo', 'manager');

    RETURN new_report_id;
END;
$$;

