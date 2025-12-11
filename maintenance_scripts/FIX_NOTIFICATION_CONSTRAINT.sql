-- Drop the existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS valid_type;

-- Add the new constraint with expanded types
ALTER TABLE notifications ADD CONSTRAINT valid_type 
CHECK (type IN (
    'task_assigned', 
    'task_status_changed', 
    'task_completed', 
    'task_overdue', 
    'shift_reminder', 
    'attendance_issue', 
    'system',
    'approval_request',
    'approval_update'
));

-- Fix Foreign Key Issue: notifications.user_id should reference employees(id) NOT users(id)
-- Because we are using employees table for logic, but Supabase Auth uses users table.
-- If notifications table was created referencing auth.users, we need to change it or ensure employees are in users.
-- Assuming we want to link to employees table:

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE notifications 
    ADD CONSTRAINT notifications_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES employees(id) 
    ON DELETE CASCADE;
