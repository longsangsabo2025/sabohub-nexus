-- Allow CEOs and Managers to update employee records
-- This is required for editing employee details like salary, role, etc.

DROP POLICY IF EXISTS "CEO and managers can update employees" ON employees;

CREATE POLICY "CEO and managers can update employees"
  ON employees
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
      AND employees.role IN ('ceo', 'manager')
    )
  );

-- Also ensure they can select (read) all employees (if not already covered)
DROP POLICY IF EXISTS "CEO and managers can view all employees" ON employees;

CREATE POLICY "CEO and managers can view all employees"
  ON employees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
      AND employees.role IN ('ceo', 'manager')
    )
  );
