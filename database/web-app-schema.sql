-- ========================================
-- SABOHUB NEXUS - Web App Database Schema
-- ========================================
-- This ensures tables have the correct structure for web app
-- Run this AFTER the main Flutter app schema is set up
-- ========================================

-- ========================================
-- 1. ENSURE EMPLOYEES TABLE HAS REQUIRED COLUMNS
-- ========================================

-- Add missing columns to employees if they don't exist
DO $$
BEGIN
  -- Add full_name if missing (some schemas use 'name')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'full_name'
  ) THEN
    -- Check if 'name' column exists and migrate
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'employees' 
      AND column_name = 'name'
    ) THEN
      ALTER TABLE public.employees ADD COLUMN full_name TEXT;
      UPDATE public.employees SET full_name = name WHERE full_name IS NULL;
    ELSE
      ALTER TABLE public.employees ADD COLUMN full_name TEXT;
    END IF;
  END IF;

  -- Ensure role column exists with correct type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN role TEXT DEFAULT 'staff';
  END IF;

  -- Ensure email column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'email'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN email TEXT;
  END IF;

  -- Ensure company_id column exists (nullable for now)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'employees' 
    AND column_name = 'company_id'
  ) THEN
    ALTER TABLE public.employees ADD COLUMN company_id UUID;
  END IF;
END $$;

-- ========================================
-- 2. ENSURE TASKS TABLE HAS REQUIRED COLUMNS
-- ========================================

DO $$
BEGIN
  -- Ensure due_date column exists (some schemas use 'deadline')
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tasks' 
    AND column_name = 'due_date'
  ) THEN
    -- Check if 'deadline' exists and create alias
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks' 
      AND column_name = 'deadline'
    ) THEN
      -- Create a view or add computed column
      ALTER TABLE public.tasks ADD COLUMN due_date TIMESTAMPTZ;
      UPDATE public.tasks SET due_date = deadline WHERE due_date IS NULL;
    ELSE
      ALTER TABLE public.tasks ADD COLUMN due_date TIMESTAMPTZ;
    END IF;
  END IF;

  -- Ensure category column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tasks' 
    AND column_name = 'category'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN category TEXT DEFAULT 'other';
  END IF;

  -- Ensure created_by column exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'tasks' 
    AND column_name = 'created_by'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN created_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- ========================================
-- 3. ENSURE ATTENDANCE TABLE STRUCTURE
-- ========================================

DO $$
BEGIN
  -- Ensure check_in_time exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'attendance' 
    AND column_name = 'check_in_time'
  ) THEN
    ALTER TABLE public.attendance ADD COLUMN check_in_time TIMESTAMPTZ DEFAULT NOW();
  END IF;

  -- Ensure check_out_time exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'attendance' 
    AND column_name = 'check_out_time'
  ) THEN
    ALTER TABLE public.attendance ADD COLUMN check_out_time TIMESTAMPTZ;
  END IF;

  -- Ensure location exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'attendance' 
    AND column_name = 'location'
  ) THEN
    ALTER TABLE public.attendance ADD COLUMN location TEXT;
  END IF;
END $$;

-- ========================================
-- 4. CREATE INDEXES FOR PERFORMANCE
-- ========================================

-- Employees indexes
CREATE INDEX IF NOT EXISTS employees_role_idx ON public.employees(role);
CREATE INDEX IF NOT EXISTS employees_company_id_idx ON public.employees(company_id);
CREATE INDEX IF NOT EXISTS employees_email_idx ON public.employees(email);

-- Tasks indexes
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks(status);
CREATE INDEX IF NOT EXISTS tasks_priority_idx ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS tasks_created_by_idx ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS tasks_company_id_idx ON public.tasks(company_id);

-- Attendance indexes
CREATE INDEX IF NOT EXISTS attendance_employee_id_idx ON public.attendance(employee_id);
CREATE INDEX IF NOT EXISTS attendance_check_in_time_idx ON public.attendance(check_in_time DESC);

-- ========================================
-- 5. ENSURE RLS IS ENABLED
-- ========================================

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 6. BASIC RLS POLICIES (if not exist)
-- ========================================

-- Employees: Allow authenticated users to read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'employees' 
    AND policyname = 'Allow authenticated read employees'
  ) THEN
    CREATE POLICY "Allow authenticated read employees"
      ON public.employees
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Tasks: Allow authenticated users to read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'tasks' 
    AND policyname = 'Allow authenticated read tasks'
  ) THEN
    CREATE POLICY "Allow authenticated read tasks"
      ON public.tasks
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Tasks: Allow authenticated users to insert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'tasks' 
    AND policyname = 'Allow authenticated insert tasks'
  ) THEN
    CREATE POLICY "Allow authenticated insert tasks"
      ON public.tasks
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Tasks: Allow authenticated users to update
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'tasks' 
    AND policyname = 'Allow authenticated update tasks'
  ) THEN
    CREATE POLICY "Allow authenticated update tasks"
      ON public.tasks
      FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Tasks: Allow authenticated users to delete
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'tasks' 
    AND policyname = 'Allow authenticated delete tasks'
  ) THEN
    CREATE POLICY "Allow authenticated delete tasks"
      ON public.tasks
      FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Attendance: Allow authenticated users to read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'attendance' 
    AND policyname = 'Allow authenticated read attendance'
  ) THEN
    CREATE POLICY "Allow authenticated read attendance"
      ON public.attendance
      FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '✅ Web app schema setup complete!';
  RAISE NOTICE '📝 Next: Run verify-schema.sql to check everything';
END $$;

