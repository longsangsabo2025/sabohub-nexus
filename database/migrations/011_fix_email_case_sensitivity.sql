
-- Fix email comparison in get_current_user_role to be case-insensitive
-- This ensures that if the JWT email has different casing than the database email, it still matches.

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
  BEGIN
    v_email := auth.jwt() ->> 'email';
  EXCEPTION WHEN OTHERS THEN
    v_email := NULL;
  END;

  IF v_email IS NOT NULL THEN
    SELECT lower(role) INTO v_role
    FROM public.employees
    WHERE lower(email) = lower(v_email);
  END IF;
  
  RETURN v_role;
END;
$$;
