-- Fix infinite recursion in RLS policies by using a SECURITY DEFINER function

-- 1. Create a secure function to get user role without triggering RLS
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM public.employees 
    WHERE id = auth.uid()
  );
END;
$$;

-- 2. Drop the problematic policies that caused recursion
DROP POLICY IF EXISTS "CEO and managers can update employees" ON employees;
DROP POLICY IF EXISTS "CEO and managers can view all employees" ON employees;

-- 3. Re-create the UPDATE policy using the secure function
CREATE POLICY "CEO and managers can update employees"
  ON employees
  FOR UPDATE
  USING (
    get_current_user_role() IN ('ceo', 'manager')
  );

-- 4. Re-create the SELECT policy (if we want to be specific, though 'true' might exist)
-- We'll use the safe function just in case we want to restrict it later, 
-- or to replace the crashing one we just dropped.
-- Note: If there is another policy "Allow authenticated read employees" with USING (true),
-- this one is just additive. But it won't crash.
CREATE POLICY "CEO and managers can view all employees"
  ON employees
  FOR SELECT
  USING (
    get_current_user_role() IN ('ceo', 'manager')
  );

-- 5. Also fix the payrolls policy if it has similar issues
-- The payrolls policy I created earlier was:
-- EXISTS (SELECT 1 FROM employees WHERE employees.id = auth.uid() AND ...)
-- This queries 'employees' from 'payrolls' policy. 
-- If 'employees' policy is recursive, this query crashes too.
-- But since we fixed 'employees' policy, this might be fine.
-- However, it's better to use the function here too for performance and safety.

DROP POLICY IF EXISTS "CEO and managers can manage payrolls" ON payrolls;

CREATE POLICY "CEO and managers can manage payrolls"
  ON payrolls
  USING (
    get_current_user_role() IN ('ceo', 'manager')
  );
