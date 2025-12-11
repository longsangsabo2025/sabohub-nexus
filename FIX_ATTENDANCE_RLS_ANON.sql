-- Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Attendance view policy" ON attendance;
DROP POLICY IF EXISTS "Attendance insert policy" ON attendance;
DROP POLICY IF EXISTS "Attendance update policy" ON attendance;

-- Create new policies allowing public access (needed for Dual Auth system where Staff are Anon)

-- 1. Allow everyone to view attendance (needed for Dashboard)
CREATE POLICY "Attendance view policy" ON attendance
  FOR SELECT
  USING (true);

-- 2. Allow everyone to insert attendance (needed for Staff check-in)
CREATE POLICY "Attendance insert policy" ON attendance
  FOR INSERT
  WITH CHECK (true);

-- 3. Allow everyone to update attendance (needed for Staff check-out)
CREATE POLICY "Attendance update policy" ON attendance
  FOR UPDATE
  USING (true);
