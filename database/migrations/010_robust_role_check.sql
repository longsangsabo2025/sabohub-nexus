-- Improve get_current_user_role to fallback to email matching
-- This helps if the employee ID doesn't match auth.uid() for some reason

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_email text;
BEGIN
  -- Try by ID first
  SELECT lower(role) INTO v_role
  FROM public.employees 
  WHERE id = auth.uid();
  
  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- Try by email if ID failed
  -- We need to safely get email from jwt
  BEGIN
    v_email := auth.jwt() ->> 'email';
  EXCEPTION WHEN OTHERS THEN
    v_email := NULL;
  END;

  IF v_email IS NOT NULL THEN
    SELECT lower(role) INTO v_role
    FROM public.employees
    WHERE email = v_email;
  END IF;
  
  RETURN v_role;
END;
$$;
