-- Create schedules table
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  shift_type TEXT NOT NULL CHECK (shift_type IN ('morning', 'afternoon', 'evening', 'full_day')),
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'absent', 'late', 'cancelled')),
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;

-- Create policies
-- 1. Allow everyone to view schedules (for Dashboard/Managers/Staff)
CREATE POLICY "Schedules view policy" ON schedules
  FOR SELECT
  USING (true);

-- 2. Allow authenticated users (CEO/Managers) to insert schedules
CREATE POLICY "Schedules insert policy" ON schedules
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 3. Allow authenticated users to update schedules
CREATE POLICY "Schedules update policy" ON schedules
  FOR UPDATE
  TO authenticated
  USING (true);

-- 4. Allow authenticated users to delete schedules
CREATE POLICY "Schedules delete policy" ON schedules
  FOR DELETE
  TO authenticated
  USING (true);

-- Grant access to anon (for Staff using custom auth)
GRANT ALL ON schedules TO anon;
GRANT ALL ON schedules TO authenticated;
GRANT ALL ON schedules TO service_role;
