-- Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Attendance view policy" ON attendance;
DROP POLICY IF EXISTS "Attendance insert policy" ON attendance;
DROP POLICY IF EXISTS "Attendance update policy" ON attendance;
DROP POLICY IF EXISTS "Users can view their own attendance" ON attendance;
DROP POLICY IF EXISTS "Users can insert their own attendance" ON attendance;
DROP POLICY IF EXISTS "Users can update their own attendance" ON attendance;
DROP POLICY IF EXISTS "Enable read access for all users" ON attendance;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON attendance;
DROP POLICY IF EXISTS "Enable update for users based on email" ON attendance;

-- Create new policies

-- 1. Allow all authenticated users to view attendance records (for Dashboard/Managers)
CREATE POLICY "Attendance view policy" ON attendance
  FOR SELECT
  TO authenticated
  USING (true);

-- 2. Allow users to insert their own attendance records
CREATE POLICY "Attendance insert policy" ON attendance
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = employee_id);

-- 3. Allow users to update their own attendance records (for check-out)
CREATE POLICY "Attendance update policy" ON attendance
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = employee_id);
