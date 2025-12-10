-- ============================================================================
-- NOTIFICATIONS SYSTEM - Based on Actual Database Schema
-- ============================================================================
-- Creates notifications table and automated triggers
-- Compatible with existing daily_work_reports structure
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
  
  -- Read status (renamed from 'read' to avoid SQL keyword conflict)
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

-- System can insert notifications
CREATE POLICY "system_insert_notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- 2. TASK ASSIGNMENT NOTIFICATIONS
-- ============================================================================

-- Function: Notify when task is assigned
CREATE OR REPLACE FUNCTION notify_task_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only notify if assigned_to is set and changed
  IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      NEW.assigned_to,
      'Công việc mới được giao',
      'Bạn đã được giao công việc: ' || NEW.title,
      'info',
      '/tasks'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for task assignment
DROP TRIGGER IF EXISTS trigger_notify_task_assignment ON public.tasks;
CREATE TRIGGER trigger_notify_task_assignment
  AFTER INSERT OR UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION notify_task_assignment();

-- ============================================================================
-- 3. DAILY WORK REPORT NOTIFICATIONS
-- ============================================================================

-- Function: Notify manager when report is submitted
CREATE OR REPLACE FUNCTION notify_report_submitted()
RETURNS TRIGGER AS $$
DECLARE
  manager_id UUID;
  employee_name TEXT;
BEGIN
  -- Get employee name
  SELECT full_name INTO employee_name
  FROM public.employees
  WHERE id = NEW.employee_id;
  
  -- Get manager of the company (find users with role 'manager' or 'ceo')
  FOR manager_id IN 
    SELECT id FROM public.employees 
    WHERE company_id = NEW.company_id 
    AND role IN ('manager', 'ceo')
    AND id != NEW.employee_id
  LOOP
    INSERT INTO public.notifications (user_id, title, message, type, link)
    VALUES (
      manager_id,
      'Báo cáo công việc mới',
      employee_name || ' đã nộp báo cáo công việc ngày ' || TO_CHAR(NEW.report_date, 'DD/MM/YYYY'),
      'info',
      '/daily-reports'
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for report submission
DROP TRIGGER IF EXISTS trigger_notify_report_submitted ON public.daily_work_reports;
CREATE TRIGGER trigger_notify_report_submitted
  AFTER INSERT ON public.daily_work_reports
  FOR EACH ROW
  EXECUTE FUNCTION notify_report_submitted();

-- ============================================================================
-- 4. LATE CHECK-IN DETECTION (Optional - for future use)
-- ============================================================================

-- Function: Detect and notify late check-ins
CREATE OR REPLACE FUNCTION detect_late_checkin()
RETURNS void AS $$
DECLARE
  late_record RECORD;
  manager_id UUID;
BEGIN
  -- Find attendance records where check-in is after 9:00 AM
  FOR late_record IN
    SELECT 
      a.id,
      a.employee_id,
      a.company_id,
      e.full_name,
      a.check_in_time,
      a.check_in_time::TIME as check_in_time_only
    FROM public.attendance a
    JOIN public.employees e ON a.employee_id = e.id
    WHERE a.check_in_time::DATE = CURRENT_DATE
    AND a.check_in_time::TIME > '09:00:00'::TIME
    AND NOT EXISTS (
      SELECT 1 FROM public.notifications 
      WHERE user_id IN (
        SELECT id FROM public.employees 
        WHERE company_id = a.company_id AND role IN ('manager', 'ceo')
      )
      AND message LIKE '%' || e.full_name || '%check-in muộn%'
      AND DATE(created_at) = CURRENT_DATE
    )
  LOOP
    -- Notify managers
    FOR manager_id IN 
      SELECT id FROM public.employees 
      WHERE company_id = late_record.company_id 
      AND role IN ('manager', 'ceo')
    LOOP
      INSERT INTO public.notifications (user_id, title, message, type, link)
      VALUES (
        manager_id,
        'Cảnh báo check-in muộn',
        late_record.full_name || ' đã check-in muộn lúc ' || 
        TO_CHAR(late_record.check_in_time, 'HH24:MI'),
        'warning',
        '/attendance'
      );
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

-- Note: To run late check-in detection, execute:
-- SELECT detect_late_checkin();
-- This can be scheduled using Supabase Edge Functions or pg_cron
