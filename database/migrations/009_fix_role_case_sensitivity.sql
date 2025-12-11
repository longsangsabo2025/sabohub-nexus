-- Fix get_current_user_role to be case-insensitive
-- The roles in database might be uppercase (MANAGER) but we check for lowercase (manager)

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (
    SELECT lower(role)
    FROM public.employees 
    WHERE id = auth.uid()
  );
END;
$$;
