-- ========================================
-- SABOHUB NEXUS - Database Schema Verification
-- ========================================
-- Run this in Supabase SQL Editor to verify tables exist
-- and have the correct structure for web app

-- Check if required tables exist
DO $$
DECLARE
  missing_tables TEXT[] := ARRAY[]::TEXT[];
  table_name TEXT;
  required_tables TEXT[] := ARRAY[
    'companies',
    'employees', 
    'tasks',
    'attendance',
    'branches'
  ];
BEGIN
  FOREACH table_name IN ARRAY required_tables
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = table_name
    ) THEN
      missing_tables := array_append(missing_tables, table_name);
    END IF;
  END LOOP;

  IF array_length(missing_tables, 1) > 0 THEN
    RAISE NOTICE '⚠️ Missing tables: %', array_to_string(missing_tables, ', ');
  ELSE
    RAISE NOTICE '✅ All required tables exist!';
  END IF;
END $$;

-- Check employees table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'employees'
ORDER BY ordinal_position;

-- Check tasks table structure  
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'tasks'
ORDER BY ordinal_position;

-- Check attendance table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'attendance'
ORDER BY ordinal_position;

-- Check RLS status
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('employees', 'tasks', 'attendance', 'companies', 'branches');

