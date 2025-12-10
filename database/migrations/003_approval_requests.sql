-- Create approval_requests table for CEO/Manager approval workflow
-- This enables time-off, expense, and task assignment approvals

CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('time_off', 'expense', 'task_assignment')),
  requester_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES employees(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  details JSONB NOT NULL DEFAULT '{}',
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_approval_requests_requester ON approval_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_approver ON approval_requests(approver_id);
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_type ON approval_requests(type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_created_at ON approval_requests(created_at DESC);

-- Add RLS policies
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- Policy 1: CEO and Managers can see all requests
CREATE POLICY "CEO and managers can view all approval requests"
  ON approval_requests
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
      AND employees.role IN ('ceo', 'manager')
    )
  );

-- Policy 2: Employees can see their own requests
CREATE POLICY "Employees can view their own requests"
  ON approval_requests
  FOR SELECT
  USING (requester_id = auth.uid());

-- Policy 3: Employees can create requests
CREATE POLICY "Employees can create approval requests"
  ON approval_requests
  FOR INSERT
  WITH CHECK (requester_id = auth.uid());

-- Policy 4: CEO and Managers can update (approve/reject) requests
CREATE POLICY "CEO and managers can update approval requests"
  ON approval_requests
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM employees
      WHERE employees.id = auth.uid()
      AND employees.role IN ('ceo', 'manager')
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_approval_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_approval_requests_timestamp
  BEFORE UPDATE ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_approval_requests_updated_at();

-- Create notification trigger for new approval requests
CREATE OR REPLACE FUNCTION notify_approval_request_created()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify all CEOs and Managers about new approval request
  INSERT INTO notifications (user_id, title, message, type, is_read)
  SELECT 
    employees.id,
    'Yêu cầu phê duyệt mới',
    'Có yêu cầu ' || 
    CASE NEW.type
      WHEN 'time_off' THEN 'nghỉ phép'
      WHEN 'expense' THEN 'chi phí'
      WHEN 'task_assignment' THEN 'phân công'
      ELSE NEW.type
    END || ' từ nhân viên',
    'approval_request',
    false
  FROM employees
  WHERE employees.role IN ('ceo', 'manager')
  AND employees.id != NEW.requester_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_approval_request
  AFTER INSERT ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_approval_request_created();

-- Create notification trigger for approval status updates
CREATE OR REPLACE FUNCTION notify_approval_status_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Notify requester when their request is approved/rejected
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    INSERT INTO notifications (user_id, title, message, type, is_read)
    VALUES (
      NEW.requester_id,
      CASE 
        WHEN NEW.status = 'approved' THEN 'Yêu cầu đã được duyệt'
        WHEN NEW.status = 'rejected' THEN 'Yêu cầu bị từ chối'
      END,
      'Yêu cầu ' ||
      CASE NEW.type
        WHEN 'time_off' THEN 'nghỉ phép'
        WHEN 'expense' THEN 'chi phí'
        WHEN 'task_assignment' THEN 'phân công'
        ELSE NEW.type
      END || ' của bạn đã được xử lý',
      'approval_update',
      false
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_approval_update
  AFTER UPDATE ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION notify_approval_status_update();

-- Insert sample data for testing
INSERT INTO approval_requests (type, requester_id, status, details, created_at)
SELECT 
  'time_off',
  id,
  'pending',
  jsonb_build_object(
    'start_date', '2025-12-15',
    'end_date', '2025-12-17',
    'days', 3,
    'reason', 'Nghỉ phép năm'
  ),
  now() - interval '1 day'
FROM employees
WHERE role = 'staff'
LIMIT 1;

INSERT INTO approval_requests (type, requester_id, status, details, created_at)
SELECT 
  'expense',
  id,
  'pending',
  jsonb_build_object(
    'amount', 2500000,
    'category', 'Client Meeting',
    'description', 'Ăn trưa với khách hàng X',
    'receipt_url', '#'
  ),
  now() - interval '2 days'
FROM employees
WHERE role = 'staff'
LIMIT 1
OFFSET 1;

COMMENT ON TABLE approval_requests IS 'Stores approval requests for time-off, expenses, and task assignments';
COMMENT ON COLUMN approval_requests.type IS 'Type of approval: time_off, expense, task_assignment';
COMMENT ON COLUMN approval_requests.status IS 'Current status: pending, approved, rejected';
COMMENT ON COLUMN approval_requests.details IS 'JSON object containing type-specific details';
COMMENT ON COLUMN approval_requests.rejection_reason IS 'Reason for rejection (if status = rejected)';
