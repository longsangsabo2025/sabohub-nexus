-- Sample data for Phase 2 features
-- Purpose: Populate realistic demo data for development

-- Insert sample financial transactions (last 3 months)
INSERT INTO public.financial_transactions (company_id, type, category, amount, description, date, payment_method) 
SELECT 
  c.id,
  'revenue',
  'Service Income',
  RANDOM() * 10000000 + 5000000, -- 5M-15M VND
  'Monthly service revenue',
  CURRENT_DATE - (i || ' days')::interval,
  'bank_transfer'
FROM public.companies c
CROSS JOIN generate_series(1, 90, 30) AS i
WHERE EXISTS (SELECT 1 FROM public.employees WHERE company_id = c.id LIMIT 1);

INSERT INTO public.financial_transactions (company_id, type, category, amount, description, date, payment_method)
SELECT 
  c.id,
  'expense',
  (ARRAY['Salary', 'Office Rent', 'Utilities', 'Marketing', 'Software'])[floor(random() * 5 + 1)],
  RANDOM() * 5000000 + 1000000, -- 1M-6M VND
  'Monthly operational expenses',
  CURRENT_DATE - (i || ' days')::interval,
  'bank_transfer'
FROM public.companies c
CROSS JOIN generate_series(1, 90, 15) AS i
WHERE EXISTS (SELECT 1 FROM public.employees WHERE company_id = c.id LIMIT 1);

-- Insert sample workflow definitions
INSERT INTO public.workflow_definitions (company_id, name, description, trigger_type, trigger_config, actions, enabled)
SELECT 
  c.id,
  'Auto Create Follow-up Task',
  'When a task is completed, automatically create a follow-up review task',
  'task_completed',
  '{"task_type": "development"}'::jsonb,
  ARRAY['{"type": "create_task", "config": {"title": "Review completed work", "priority": "medium"}}'::jsonb],
  true
FROM public.companies c
WHERE EXISTS (SELECT 1 FROM public.employees WHERE company_id = c.id LIMIT 1);

INSERT INTO public.workflow_definitions (company_id, name, description, trigger_type, trigger_config, actions, enabled)
SELECT 
  c.id,
  'Late Attendance Alert',
  'Notify manager when employee checks in late',
  'attendance_late',
  '{"threshold_minutes": 15}'::jsonb,
  ARRAY[
    '{"type": "send_notification", "config": {"recipient": "manager", "message": "Employee late check-in detected"}}'::jsonb,
    '{"type": "send_email", "config": {"subject": "Late Attendance Alert"}}'::jsonb
  ],
  true
FROM public.companies c
WHERE EXISTS (SELECT 1 FROM public.employees WHERE company_id = c.id LIMIT 1);

-- Insert workflow execution logs
INSERT INTO public.workflow_executions (workflow_id, trigger_data, actions_executed, status, executed_at)
SELECT 
  wd.id,
  '{"task_id": "sample-task-123", "completed_by": "user-456"}'::jsonb,
  ARRAY['{"type": "create_task", "result": "success", "task_id": "new-task-789"}'::jsonb],
  'success',
  NOW() - (i || ' hours')::interval
FROM public.workflow_definitions wd
CROSS JOIN generate_series(1, 48, 6) AS i;

-- Insert sample report schedules
INSERT INTO public.report_schedules (company_id, name, description, type, format, recipients, enabled, next_scheduled_at)
SELECT 
  c.id,
  'Daily Task Summary',
  'Daily summary of completed and pending tasks',
  'daily',
  'pdf',
  ARRAY[u.email],
  true,
  (CURRENT_DATE + 1) || ' 08:00:00'
FROM public.companies c
JOIN auth.users u ON u.id = c.ceo_id
WHERE EXISTS (SELECT 1 FROM public.employees WHERE company_id = c.id LIMIT 1);

INSERT INTO public.report_schedules (company_id, name, description, type, format, recipients, enabled, next_scheduled_at)
SELECT 
  c.id,
  'Weekly Performance Report',
  'Weekly team performance and KPI metrics',
  'weekly',
  'excel',
  ARRAY[u.email],
  true,
  (CURRENT_DATE + 7) || ' 18:00:00'
FROM public.companies c
JOIN auth.users u ON u.id = c.ceo_id
WHERE EXISTS (SELECT 1 FROM public.employees WHERE company_id = c.id LIMIT 1);

-- Insert generated reports history
INSERT INTO public.generated_reports (schedule_id, company_id, file_url, file_size, status, sent_to, generated_at)
SELECT 
  rs.id,
  rs.company_id,
  'https://storage.example.com/reports/' || rs.id || '-' || i || '.pdf',
  RANDOM() * 500000 + 100000, -- 100KB-600KB
  'completed',
  rs.recipients,
  NOW() - (i || ' days')::interval
FROM public.report_schedules rs
CROSS JOIN generate_series(1, 7) AS i;

-- Insert notification preferences for all users
INSERT INTO public.notification_preferences (user_id, push_enabled, email_enabled)
SELECT 
  id,
  true,
  true
FROM auth.users
WHERE NOT EXISTS (SELECT 1 FROM public.notification_preferences WHERE user_id = auth.users.id);
