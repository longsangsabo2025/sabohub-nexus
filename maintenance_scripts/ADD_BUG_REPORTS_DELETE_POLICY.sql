-- Allow authenticated users (or specifically CEO) to delete bug reports
CREATE POLICY "Bug reports delete policy" ON bug_reports
  FOR DELETE
  TO authenticated
  USING (true);
