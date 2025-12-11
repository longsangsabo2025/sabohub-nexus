
-- Drop the restrictive constraint
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;

-- Add a more flexible constraint that allows both cases and includes CEO
ALTER TABLE employees ADD CONSTRAINT employees_role_check 
  CHECK (role::text = ANY (ARRAY[
    'manager'::text, 'MANAGER'::text, 
    'shift_leader'::text, 'SHIFT_LEADER'::text, 
    'staff'::text, 'STAFF'::text, 
    'ceo'::text, 'CEO'::text
  ]));
