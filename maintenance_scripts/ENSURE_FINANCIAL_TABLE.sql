-- Create financial_transactions table if not exists
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('revenue', 'expense')),
  amount DECIMAL(15, 2) NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category TEXT,
  description TEXT,
  payment_method TEXT, -- cash, transfer, card
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Financial transactions view policy" ON financial_transactions
  FOR SELECT
  USING (true); -- Refine later for company isolation

CREATE POLICY "Financial transactions insert policy" ON financial_transactions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Financial transactions update policy" ON financial_transactions
  FOR UPDATE
  USING (true);

CREATE POLICY "Financial transactions delete policy" ON financial_transactions
  FOR DELETE
  USING (true);
