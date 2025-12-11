-- ==============================================================================
-- RPC: Submit Approval Request (Bypass RLS for Staff)
-- ==============================================================================

CREATE OR REPLACE FUNCTION submit_approval_request(
  p_requester_id UUID,
  p_type TEXT,
  p_details JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This allows the function to run with privileges of the creator (postgres), bypassing RLS
SET search_path = public -- Security best practice
AS $$
DECLARE
  v_request_id UUID;
BEGIN
  -- Verify requester exists
  IF NOT EXISTS (SELECT 1 FROM employees WHERE id = p_requester_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Nhân viên không tồn tại');
  END IF;

  -- Insert the request
  INSERT INTO approval_requests (
    requester_id,
    type,
    status,
    details
  ) VALUES (
    p_requester_id,
    p_type,
    'pending',
    p_details
  ) RETURNING id INTO v_request_id;

  RETURN jsonb_build_object('success', true, 'id', v_request_id);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Grant execute permission to anon (since staff are not authenticated in Supabase Auth)
GRANT EXECUTE ON FUNCTION submit_approval_request(UUID, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION submit_approval_request(UUID, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION submit_approval_request(UUID, TEXT, JSONB) TO service_role;
