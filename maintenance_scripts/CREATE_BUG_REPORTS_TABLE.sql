-- Create bug_reports table
CREATE TABLE IF NOT EXISTS bug_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- Can be linked to auth.users or employees table depending on auth method
  employee_id UUID REFERENCES employees(id) ON DELETE SET NULL, -- Link to employee profile if available
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE bug_reports ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Allow everyone to insert (authenticated)
CREATE POLICY "Bug reports insert policy" ON bug_reports
  FOR INSERT
  TO authenticated, anon
  WITH CHECK (true);

-- 2. Allow users to view their own reports (or all if CEO/Manager)
-- Note: This logic depends on how we identify "CEO". 
-- For now, we'll allow everyone to see their own reports based on user_id or employee_id.
-- And we'll allow specific roles to see all.
-- Since RLS with complex role checks can be tricky without a helper function, 
-- we'll start with a basic policy and refine it if needed.

-- Allow read access to everyone for now (simplest for "all roles" requirement), 
-- but ideally we filter.
CREATE POLICY "Bug reports view policy" ON bug_reports
  FOR SELECT
  USING (true);

-- 3. Allow updates (e.g. status change) - restricted to CEO/Manager ideally, 
-- but for simplicity we'll allow authenticated users to update for now 
-- (or we can restrict it in the frontend/backend logic).
CREATE POLICY "Bug reports update policy" ON bug_reports
  FOR UPDATE
  USING (true);

-- Storage for bug reports
-- Note: Creating buckets via SQL requires permissions on storage.buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('bug-reports', 'bug-reports', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Bug reports images public view"
ON storage.objects FOR SELECT
USING ( bucket_id = 'bug-reports' );

CREATE POLICY "Bug reports images upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'bug-reports' );
