-- Add payroll fields to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS employment_type TEXT CHECK (employment_type IN ('full_time', 'part_time')) DEFAULT 'full_time',
ADD COLUMN IF NOT EXISTS salary_type TEXT CHECK (salary_type IN ('fixed', 'hourly')) DEFAULT 'fixed',
ADD COLUMN IF NOT EXISTS base_salary NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS bank_account_number TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT;

-- Create payrolls table to store monthly calculated salaries
CREATE TABLE IF NOT EXISTS payrolls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  month TEXT NOT NULL, -- Format: 'YYYY-MM'
  total_work_days NUMERIC DEFAULT 0,
  total_work_hours NUMERIC DEFAULT 0,
  base_salary NUMERIC DEFAULT 0,
  allowances NUMERIC DEFAULT 0,
  deductions NUMERIC DEFAULT 0,
  bonus NUMERIC DEFAULT 0,
  total_salary NUMERIC NOT NULL,
  status TEXT CHECK (status IN ('draft', 'confirmed', 'paid')) DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add RLS for payrolls
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CEO and managers can manage payrolls"
  ON payrolls
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
      AND employees.role IN ('ceo', 'manager')
    )
  );

CREATE POLICY "Employees can view their own payrolls"
  ON payrolls
  FOR SELECT
  USING (employee_id = auth.uid());
