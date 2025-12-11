-- ==============================================================================
-- FIX ROW LEVEL SECURITY (RLS) FOR APPROVAL SYSTEM
-- Run this script in Supabase SQL Editor to fix "new row violates row-level security policy"
-- ==============================================================================

-- 1. Enable RLS on approval_requests (ensure it's on)
ALTER TABLE "public"."approval_requests" ENABLE ROW LEVEL SECURITY;

-- 2. Allow Users to INSERT their own requests
-- This fixes the error when Staff submits a Leave/Expense request
DROP POLICY IF EXISTS "Users can insert their own requests" ON "public"."approval_requests";
CREATE POLICY "Users can insert their own requests"
ON "public"."approval_requests"
FOR INSERT
WITH CHECK (
  auth.uid() = requester_id
);

-- 3. Allow Users to VIEW their own requests
DROP POLICY IF EXISTS "Users can view their own requests" ON "public"."approval_requests";
CREATE POLICY "Users can view their own requests"
ON "public"."approval_requests"
FOR SELECT
USING (
  auth.uid() = requester_id
);

-- 4. Allow Managers/CEO to VIEW ALL requests
-- This allows managers to see requests from their staff
DROP POLICY IF EXISTS "Managers can view all requests" ON "public"."approval_requests";
CREATE POLICY "Managers can view all requests"
ON "public"."approval_requests"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = auth.uid()
    AND (employees.role = 'manager' OR employees.role = 'ceo')
  )
);

-- 5. Allow Managers/CEO to UPDATE requests (Approve/Reject)
DROP POLICY IF EXISTS "Managers can update requests" ON "public"."approval_requests";
CREATE POLICY "Managers can update requests"
ON "public"."approval_requests"
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = auth.uid()
    AND (employees.role = 'manager' OR employees.role = 'ceo')
  )
);

-- ==============================================================================
-- FIX RLS FOR FINANCIAL TRANSACTIONS (For Managers/CEO direct insert)
-- ==============================================================================

ALTER TABLE "public"."financial_transactions" ENABLE ROW LEVEL SECURITY;

-- Allow Managers/CEO to INSERT financial transactions directly
DROP POLICY IF EXISTS "Managers can insert financial transactions" ON "public"."financial_transactions";
CREATE POLICY "Managers can insert financial transactions"
ON "public"."financial_transactions"
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = auth.uid()
    AND (employees.role = 'manager' OR employees.role = 'ceo')
  )
);

-- Allow everyone to VIEW financial transactions (or restrict to company if needed)
-- For now, let's allow viewing if they belong to the same company
DROP POLICY IF EXISTS "Users can view company financial transactions" ON "public"."financial_transactions";
CREATE POLICY "Users can view company financial transactions"
ON "public"."financial_transactions"
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM employees
    WHERE employees.id = auth.uid()
    AND employees.company_id = financial_transactions.company_id
  )
);
