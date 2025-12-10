-- ============================================================================
-- NOTIFICATIONS TABLE & AUTOMATION TRIGGERS
-- ============================================================================
-- This migration creates:
-- 1. notifications table for in-app notifications
-- 2. Automated triggers for task assignments
-- 3. Automated triggers for attendance anomalies
-- 4. Automated triggers for report reviews
-- ============================================================================

-- ============================================================================
-- 1. CREATE NOTIFICATIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Target user
  user_id UUID NOT NULL,
  
  -- Notification content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'success', 'warning', 'error')),
  
  -- Optional link to related resource
  link TEXT,
  
  -- Read status (using is_read to avoid SQL reserved keyword)
  is_read BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "users_view_own_notifications"
  ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid() OR user_id IN (
    SELECT id FROM public.employees WHERE id = auth.uid()
  ));

-- Users can update their own notifications (mark as read)
CREATE POLICY "users_update_own_notifications"
  ON public.notifications
  FOR UPDATE
  USING (user_id = auth.uid() OR user_id IN (
    SELECT id FROM public.employees WHERE id = auth.uid()
  ));

-- Users can delete their own notifications
CREATE POLICY "users_delete_own_notifications"
  ON public.notifications
  FOR DELETE
  USING (user_id = auth.uid() OR user_id IN (
    SELECT id FROM public.employees WHERE id = auth.uid()
  ));

-- ============================================================================
-- 2. FUNCTION TO CREATE NOTIFICATION
-- ============================================================================

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, link)
  VALUES (p_user_id, p_title, p_message, p_type, p_link)
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 3. TRIGGER: Notify when task is assigned
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if assigned_to changed and is not null
  IF (TG_OP = 'INSERT' OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) 
     AND NEW.assigned_to IS NOT NULL THEN
    
    PERFORM create_notification(
      NEW.assigned_to,
      'Công việc mới được giao',
      'Bạn đã được giao công việc: ' || NEW.title,
      'info',
      '/tasks'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_task_assignment ON public.tasks;
CREATE TRIGGER trigger_notify_task_assignment
  AFTER INSERT OR UPDATE OF assigned_to ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assignment();

-- ============================================================================
-- 4. TRIGGER: Notify manager when daily report is submitted
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_report_submitted()
RETURNS TRIGGER AS $$
DECLARE
  v_manager_id UUID;
  v_employee_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Get employee name
    SELECT full_name INTO v_employee_name
    FROM public.employees
    WHERE id = NEW.employee_id;
    
    -- Get manager(s) - notify CEO and managers of the same company
    FOR v_manager_id IN
      SELECT id FROM public.employees
      WHERE company_id = (SELECT company_id FROM public.employees WHERE id = NEW.employee_id)
      AND role IN ('CEO', 'MANAGER')
    LOOP
      PERFORM create_notification(
        v_manager_id,
        'Báo cáo ngày mới',
        v_employee_name || ' đã nộp báo cáo ngày',
        'info',
        '/daily-reports'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_report_submitted ON public.daily_work_reports;
CREATE TRIGGER trigger_notify_report_submitted
  AFTER INSERT ON public.daily_work_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_report_submitted();

-- ============================================================================
-- 5. TRIGGER: Notify employee when report is reviewed
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_report_reviewed()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status != 'reviewed' AND NEW.status = 'reviewed' THEN
    PERFORM create_notification(
      NEW.employee_id,
      'Báo cáo đã được xem',
      'Quản lý đã xem báo cáo ngày của bạn',
      'success',
      '/daily-reports'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_report_reviewed ON public.daily_work_reports;
CREATE TRIGGER trigger_notify_report_reviewed
  AFTER UPDATE OF status ON public.daily_work_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_report_reviewed();

-- ============================================================================
-- 6. FUNCTION: Detect late check-ins (can be called by cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION notify_late_checkins()
RETURNS void AS $$
DECLARE
  v_record RECORD;
BEGIN
  -- Find employees who haven't checked in by 9:30 AM on workdays
  FOR v_record IN
    SELECT e.id, e.full_name
    FROM public.employees e
    WHERE e.is_active = TRUE
    AND e.role IN ('STAFF', 'SHIFT_LEADER', 'MANAGER')
    AND NOT EXISTS (
      SELECT 1 FROM public.attendance a
      WHERE a.employee_id = e.id
      AND DATE(a.check_in_time) = CURRENT_DATE
    )
    AND EXTRACT(DOW FROM CURRENT_DATE) BETWEEN 1 AND 5 -- Monday to Friday
    AND CURRENT_TIME > '09:30:00'
  LOOP
    -- Notify the employee
    PERFORM create_notification(
      v_record.id,
      'Chưa chấm công',
      'Bạn chưa chấm công hôm nay. Vui lòng check-in ngay.',
      'warning',
      '/attendance'
    );
    
    -- Notify their manager
    PERFORM create_notification(
      (SELECT id FROM public.employees 
       WHERE company_id = (SELECT company_id FROM public.employees WHERE id = v_record.id)
       AND role IN ('MANAGER', 'CEO')
       LIMIT 1),
      'Nhân viên chưa chấm công',
      v_record.full_name || ' chưa check-in hôm nay',
      'warning',
      '/attendance'
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT EXECUTE ON FUNCTION create_notification TO authenticated;
GRANT EXECUTE ON FUNCTION notify_late_checkins TO authenticated;

-- ============================================================================
-- COMPLETE
-- ============================================================================

COMMENT ON TABLE public.notifications IS 'In-app notifications for users';
COMMENT ON FUNCTION create_notification IS 'Helper function to create notifications';
COMMENT ON FUNCTION notify_late_checkins IS 'Check for late check-ins and notify (run via cron)';
